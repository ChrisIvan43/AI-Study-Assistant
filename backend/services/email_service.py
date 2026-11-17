"""
StudyCraft Email Delivery Service.

Sends transactional emails through the deployed Google Apps Script
Web App using its authenticated HTTPS POST endpoint.

Required backend environment variables:
    STUDYCRAFT_EMAIL_WEB_APP_URL
    STUDYCRAFT_EMAIL_API_SECRET

Never expose the shared secret to the frontend or logs.
"""

import os
from urllib.parse import urlparse

import httpx


class EmailDeliveryError(Exception):
    """Raised when transactional email delivery fails."""


def send_email(
    to: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> None:
    """
    Send an email through the StudyCraft Google Apps Script service.

    Raises:
        EmailDeliveryError: If configuration or email delivery fails.

    Returns:
        None when Apps Script confirms successful delivery.
    """

    web_app_url = os.getenv("STUDYCRAFT_EMAIL_WEB_APP_URL", "").strip()
    api_secret = os.getenv("STUDYCRAFT_EMAIL_API_SECRET", "")

    if not web_app_url or not api_secret:
        raise EmailDeliveryError(
            "Email delivery service is not configured."
        )

    parsed_url = urlparse(web_app_url)

    if parsed_url.scheme != "https" or not parsed_url.netloc:
        raise EmailDeliveryError(
            "Email delivery service URL must use HTTPS."
        )

    if not to or not subject or not body:
        raise EmailDeliveryError(
            "Recipient, subject, and email body are required."
        )

    payload = {
        "secret": api_secret,
        "to": to,
        "subject": subject,
        "body": body,
    }

    if html_body:
        payload["htmlBody"] = html_body

    try:
        response = httpx.post(
            web_app_url,
            json=payload,
            timeout=httpx.Timeout(20.0),
            follow_redirects=True,
        )

        response.raise_for_status()

    except httpx.TimeoutException as exc:
        raise EmailDeliveryError(
            "Email delivery service timed out."
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise EmailDeliveryError(
            "Email delivery service returned an HTTP error."
        ) from exc

    except httpx.RequestError as exc:
        raise EmailDeliveryError(
            "Could not connect to the email delivery service."
        ) from exc

    try:
        result = response.json()
    except ValueError as exc:
        raise EmailDeliveryError(
            "Email delivery service returned an invalid response."
        ) from exc

    if not isinstance(result, dict) or result.get("success") is not True:
        raise EmailDeliveryError(
            "Email delivery service rejected the email request."
        )