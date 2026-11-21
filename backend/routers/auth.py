import hashlib
import html
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


from database import get_db
from models import User, PendingRegistration
from schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    EmailChangeRequest,
    EmailChangeVerifyRequest,
    ProfileNameUpdateRequest,
    PasswordChangeRequest,
    RegistrationPendingResponse,
)
from services.email_service import send_email, EmailDeliveryError
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_DAYS,
    get_current_user,
)

router = APIRouter(tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegistrationPendingResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Start registration; the actual account is created after email verification."""
    email = user_data.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    pending = (
        db.query(PendingRegistration)
        .filter(func.lower(PendingRegistration.email) == email)
        .first()
    )

    if pending:
        if _as_utc(pending.expires_at) > now:
            if now - _as_utc(pending.requested_at) < timedelta(seconds=60):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="A verification email was recently requested. Please wait before trying again.",
                )

        pending.name = user_data.name
        pending.password_hash = hash_password(user_data.password)
        pending.expires_at = now + timedelta(minutes=30)
        pending.requested_at = now
    else:
        pending = PendingRegistration(
            name=user_data.name,
            email=email,
            password_hash=hash_password(user_data.password),
            token_hash=secrets.token_hex(32),
            expires_at=now + timedelta(minutes=30),
            requested_at=now,
        )
        db.add(pending)

    try:
        db.flush()
        _send_pending_registration_verification(pending, db, now=now)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account or pending registration already exists for this email.",
        )

    return RegistrationPendingResponse(
        message="Check your Gmail inbox and verify your email address to finish creating your account. The link expires in 30 minutes.",
        email=email,
        expires_in_minutes=30,
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and record successful student login activity."""
    email = credentials.email.strip().lower()
    user = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    )

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if (user.role or "student").lower() == "student":
        now = datetime.now(timezone.utc)
        user.last_login_at = now
        user.last_activity_at = now
        user.last_1_day_reminder_at = None
        user.last_5_day_reminder_at = None
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email},
        expires_delta=timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            email_verified_at=user.email_verified_at,
            pending_email=user.pending_email,
        ),
    )


def _send_pending_registration_verification(
    pending: PendingRegistration,
    db: Session,
    *,
    now: datetime | None = None,
):
    """Persist a hashed one-time token and send the pending-registration link."""
    now = now or datetime.now(timezone.utc)

    frontend_url = os.getenv(
        "STUDYCRAFT_FRONTEND_URL",
        "https://ai-study-assistant-9tp.pages.dev",
    ).strip().rstrip("/")

    is_local_frontend = frontend_url in {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    }

    if not frontend_url.startswith("https://") and not is_local_frontend:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is not configured correctly.",
        )

    raw_token = secrets.token_urlsafe(32)
    pending.token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()
    pending.expires_at = now + timedelta(minutes=30)
    pending.requested_at = now

    db.commit()
    db.refresh(pending)

    verification_url = (
        frontend_url + "/verify-email?" + urlencode({"token": raw_token})
    )
    safe_url = html.escape(verification_url, quote=True)
    safe_name = html.escape(pending.name or "StudyCraft user")

    subject = "Verify your StudyCraft account"
    body = (
        f"Hello {pending.name or 'StudyCraft user'},\n\n"
        "Thanks for registering with StudyCraft. Verify your Gmail address "
        "using this one-time link:\n"
        f"{verification_url}\n\n"
        "This link expires in 30 minutes. If you did not request this "
        "registration, you can ignore this email."
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
      <h2>Verify your StudyCraft account</h2>
      <p>Hello {safe_name},</p>
      <p>Confirm your Gmail address to finish creating your StudyCraft account.</p>
      <p>
        <a href="{safe_url}"
           style="display:inline-block;padding:12px 20px;background:#2563eb;
                  color:#ffffff;text-decoration:none;border-radius:8px">
          Verify email address
        </a>
      </p>
      <p>This one-time link expires in 30 minutes.</p>
      <p>If you did not request this registration, you can ignore this message.</p>
    </div>
    """

    try:
        send_email(
            to=pending.email,
            subject=subject,
            body=body,
            html_body=html_body,
        )
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The verification email could not be sent. Please wait 60 seconds before trying registration again.",
        )



def _as_utc(value: datetime) -> datetime:
    """Normalize database timestamps to timezone-aware UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _send_initial_email_verification(user: User, db: Session):
    """Create and send a one-time verification link for the account email."""
    now = datetime.now(timezone.utc)

    if user.email_verified_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already verified.",
        )

    if user.email_verification_requested_at:
        last_request = _as_utc(user.email_verification_requested_at)
        if now - last_request < timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification email.",
            )

    frontend_url = os.getenv(
        "STUDYCRAFT_FRONTEND_URL",
        "https://ai-study-assistant-9tp.pages.dev",
    ).strip().rstrip("/")

    is_local_frontend = frontend_url in {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    }

    if not frontend_url.startswith("https://") and not is_local_frontend:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is not configured correctly.",
        )

    raw_token = secrets.token_urlsafe(32)
    user.email_verification_token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()
    user.email_verification_expires_at = now + timedelta(minutes=30)
    user.email_verification_requested_at = now

    db.commit()

    verification_url = (
        frontend_url + "/verify-email?" + urlencode({"token": raw_token})
    )
    safe_url = html.escape(verification_url, quote=True)
    safe_name = html.escape(user.name or "StudyCraft user")

    subject = "Verify your StudyCraft account"
    body = (
        f"Hello {user.name or 'StudyCraft user'},\n\n"
        "Thanks for creating a StudyCraft account. "
        "Please verify your email address using this link:\n"
        f"{verification_url}\n\n"
        "This link expires in 30 minutes. If you did not create this "
        "account, you can ignore this email."
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
      <h2>Verify your StudyCraft account</h2>
      <p>Hello {safe_name},</p>
      <p>Thanks for creating a StudyCraft account. Confirm your email address:</p>
      <p>
        <a href="{safe_url}"
           style="display:inline-block;padding:12px 20px;background:#2563eb;
                  color:#ffffff;text-decoration:none;border-radius:8px">
          Verify email address
        </a>
      </p>
      <p>This link expires in 30 minutes.</p>
      <p>If you did not create this account, you can ignore this message.</p>
    </div>
    """

    try:
        send_email(
            to=user.email,
            subject=subject,
            body=body,
            html_body=html_body,
        )
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The verification email could not be sent. "
                "Please try again after the cooldown."
            ),
        )

    return {
        "message": "Verification email sent. Check your inbox.",
        "expires_in_minutes": 30,
    }


@router.post("/email/verification/resend")
def resend_initial_email_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend the initial verification email for the signed-in user."""
    return _send_initial_email_verification(current_user, db)


@router.post("/email/verification/verify")
def verify_initial_email(
    request: EmailChangeVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify a pending registration or a legacy account verification token."""
    token_hash = hashlib.sha256(
        request.token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    pending = (
        db.query(PendingRegistration)
        .filter(PendingRegistration.token_hash == token_hash)
        .with_for_update()
        .first()
    )

    if pending:
        if now >= _as_utc(pending.expires_at):
            db.delete(pending)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification link has expired. Please register again.",
            )

        existing_user = (
            db.query(User)
            .filter(func.lower(User.email) == pending.email.lower())
            .first()
        )
        if existing_user:
            db.delete(pending)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please log in.",
            )

        new_user = User(
            name=pending.name,
            email=pending.email,
            password_hash=pending.password_hash,
            role="student",
            email_verified_at=now,
        )
        db.add(new_user)
        db.delete(pending)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please try logging in.",
            )

        db.refresh(new_user)
        return {
            "message": "Your email has been verified and your StudyCraft account has been created. You can now log in.",
            "email": new_user.email,
            "email_verified_at": new_user.email_verified_at,
            "registration_completed": True,
        }

    # Backward compatibility for verification links issued to existing users.
    user = (
        db.query(User)
        .filter(User.email_verification_token_hash == token_hash)
        .first()
    )

    if not user or not user.email_verification_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )

    if now >= _as_utc(user.email_verification_expires_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )

    user.email_verified_at = now
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    user.email_verification_requested_at = None
    db.commit()

    return {
        "message": "Your email address has been successfully verified.",
        "email": user.email,
        "email_verified_at": user.email_verified_at,
        "registration_completed": False,
    }


def _send_email_change_verification(
    user: User,
    db: Session,
    pending_email: str,
):
    """Create a fresh verification token, persist its hash, and send it."""

    now = datetime.now(timezone.utc)

    if user.email_change_requested_at:
        last_request = _as_utc(user.email_change_requested_at)
        if now - last_request < timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification email.",
            )

    frontend_url = os.getenv(
        "STUDYCRAFT_FRONTEND_URL",
        "https://ai-study-assistant-9tp.pages.dev",
    ).strip().rstrip("/")

    is_local_frontend = frontend_url in {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    }

    if not frontend_url.startswith("https://") and not is_local_frontend:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is not configured correctly.",
        )

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    user.pending_email = pending_email
    user.pending_email_token_hash = token_hash
    user.pending_email_expires_at = now + timedelta(minutes=30)
    user.email_change_requested_at = now

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already pending verification.",
        )

    verification_url = (
        frontend_url
        + "/verify-email-change?"
        + urlencode({"token": raw_token})
    )

    safe_url = html.escape(verification_url, quote=True)
    safe_name = html.escape(user.name or "StudyCraft user")

    subject = "Verify your StudyCraft email address"

    body = (
        f"Hello {user.name or 'StudyCraft user'},\n\n"
        "We received a request to change the email address on your "
        "StudyCraft account.\n\n"
        f"Confirm your new email address using this link:\n{verification_url}\n\n"
        "This link expires in 30 minutes. If you did not request this "
        "change, you can ignore this email. Your current email address "
        "will remain unchanged until verification is completed."
    )

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
      <h2>Verify your StudyCraft email</h2>
      <p>Hello {safe_name},</p>
      <p>We received a request to change the email address on your account.</p>
      <p>
        <a href="{safe_url}"
           style="display:inline-block;padding:12px 20px;background:#2563eb;
                  color:#ffffff;text-decoration:none;border-radius:8px">
          Verify new email address
        </a>
      </p>
      <p>This link expires in 30 minutes.</p>
      <p>If you did not request this change, ignore this message.
         Your current email remains unchanged until verification succeeds.</p>
    </div>
    """

    try:
        send_email(
            to=pending_email,
            subject=subject,
            body=body,
            html_body=html_body,
        )
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The verification email could not be sent. "
                "Your request is saved; please try again after the cooldown."
            ),
        )

    return {
        "message": "Verification email sent. Check your new Gmail inbox.",
        "pending_email": pending_email,
        "expires_in_minutes": 30,
    }


@router.post("/email/change/request")
def request_email_change(
    request: EmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request a verified change to the authenticated user's email."""

    new_email = request.new_email

    if new_email == current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new email address is already your current email.",
        )

    existing_current = (
        db.query(User)
        .filter(
            func.lower(User.email) == new_email,
            User.id != current_user.id,
        )
        .first()
    )

    existing_pending = (
        db.query(User)
        .filter(
            func.lower(User.pending_email) == new_email,
            User.id != current_user.id,
        )
        .first()
    )

    if existing_current or existing_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already in use or pending verification.",
        )

    return _send_email_change_verification(
        current_user,
        db,
        new_email,
    )


@router.post("/email/change/resend")
def resend_email_change(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a fresh verification link for the existing pending address."""

    if not current_user.pending_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="There is no pending email change to resend.",
        )

    pending_email = current_user.pending_email

    existing_current = (
        db.query(User)
        .filter(
            func.lower(User.email) == pending_email.lower(),
            User.id != current_user.id,
        )
        .first()
    )

    if existing_current:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is now associated with another account.",
        )

    return _send_email_change_verification(
        current_user,
        db,
        pending_email,
    )


@router.post("/email/change/verify")
def verify_email_change(
    request: EmailChangeVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify a pending email change and update the account email."""

    token_hash = hashlib.sha256(
        request.token.encode("utf-8")
    ).hexdigest()

    user = (
        db.query(User)
        .filter(User.pending_email_token_hash == token_hash)
        .first()
    )

    if (
        not user
        or not user.pending_email
        or not user.pending_email_expires_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )

    now = datetime.now(timezone.utc)
    expires_at = _as_utc(user.pending_email_expires_at)

    if now >= expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )

    existing_email = (
        db.query(User)
        .filter(
            func.lower(User.email) == user.pending_email.lower(),
            User.id != user.id,
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already associated with another account.",
        )

    user.email = user.pending_email
    user.email_verified_at = now
    user.pending_email = None
    user.pending_email_token_hash = None
    user.pending_email_expires_at = None
    user.email_change_requested_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already associated with another account.",
        )

    return {
        "message": "Your email address has been successfully verified and updated.",
        "email": user.email,
    }


@router.post("/email/change/cancel")
def cancel_email_change(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending email change without changing the current email."""

    if not current_user.pending_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="There is no pending email change to cancel.",
        )

    current_user.pending_email = None
    current_user.pending_email_token_hash = None
    current_user.pending_email_expires_at = None
    current_user.email_change_requested_at = None

    db.commit()

    return {
        "message": "Your pending email change has been cancelled.",
        "email": current_user.email,
    }


@router.put("/account/name")
def update_account_name(
    name_data: ProfileNameUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's display name."""
    current_user.name = name_data.name

    try:
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update your account name.",
        )

    return {
        "message": "Your account name has been updated.",
        "name": current_user.name,
    }


@router.put("/account/password")
def change_account_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the authenticated user's password after verifying the current one."""
    if not verify_password(
        password_data.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current password is incorrect.",
        )

    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new password and confirmation do not match.",
        )

    if verify_password(password_data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your new password must be different from your current password.",
        )

    current_user.password_hash = hash_password(password_data.new_password)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to change your password.",
        )

    return {"message": "Your password has been changed successfully."}


@router.post("/logout")
def logout():
    """Logout the current user.
    Since we use JWT, logout is handled client-side by removing the token.
    This endpoint exists for API completeness.
    """
    return {"message": "Logged out successfully. Token discarded."}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's information."""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        created_at=current_user.created_at,
        email_verified_at=current_user.email_verified_at,
        pending_email=current_user.pending_email,
    )
