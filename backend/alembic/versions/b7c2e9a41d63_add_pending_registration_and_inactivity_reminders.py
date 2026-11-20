"""Add pending registrations and student inactivity reminder tracking.

Revision ID: b7c2e9a41d63
Revises: f4a91b2c6d80
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c2e9a41d63"
down_revision: Union[str, Sequence[str], None] = "f4a91b2c6d80"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Track successful student logins and one-time inactivity reminders.
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "last_1_day_reminder_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "last_5_day_reminder_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Existing student accounts begin from the agreed rollout baseline.
    # This is a rollout timestamp, not a claim about historical login activity.
    op.execute(
        """
        UPDATE users
        SET last_login_at = TIMESTAMP WITH TIME ZONE
            '2026-11-19 16:00:00+00:00'
        WHERE LOWER(role) = 'student'
          AND last_login_at IS NULL
        """
    )

    # Store registrations until their email ownership token is verified.
    op.create_table(
        "pending_registrations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "email",
            name="uq_pending_registrations_email",
        ),
        sa.UniqueConstraint(
            "token_hash",
            name="uq_pending_registrations_token_hash",
        ),
    )

    op.create_index(
        "ix_pending_registrations_id",
        "pending_registrations",
        ["id"],
    )
    op.create_index(
        "ix_pending_registrations_expires_at",
        "pending_registrations",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_pending_registrations_expires_at",
        table_name="pending_registrations",
    )
    op.drop_index(
        "ix_pending_registrations_id",
        table_name="pending_registrations",
    )
    op.drop_table("pending_registrations")

    op.drop_column("users", "last_5_day_reminder_at")
    op.drop_column("users", "last_1_day_reminder_at")
    op.drop_column("users", "last_login_at")
