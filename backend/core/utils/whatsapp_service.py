from __future__ import annotations
import json
import logging
import re
from typing import Optional, Dict, Any, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)


def normalize_phone_number(phone_raw: str, default_country_code: str = "234") -> str:
    """
    Standardize a phone number to international E.164 format.
    Example:
        '07062566616' -> '+2347062566616'
        '2347062566616' -> '+2347062566616'
        '+2347062566616' -> '+2347062566616'
    """
    if not phone_raw:
        return ""

    digits = re.sub(r"[^\d+]", "", str(phone_raw).strip())

    if digits.startswith("+"):
        return digits

    # If it starts with a leading 0 (e.g. Nigerian local 070, 080, 090, 081)
    if digits.startswith("0"):
        return f"+{default_country_code}{digits[1:]}"

    # If already starting with the country code (e.g. 234...)
    if digits.startswith(default_country_code):
        return f"+{digits}"

    # Fallback default prefix
    return f"+{default_country_code}{digits}"


def _get_twilio_client():
    """Return an authenticated Twilio client, or raise ValueError if credentials missing."""
    try:
        from twilio.rest import Client
    except ImportError:
        raise ImportError("twilio package is not installed. Run: pip install twilio")

    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    auth_token  = getattr(settings, 'TWILIO_AUTH_TOKEN', None)

    if not account_sid or not auth_token:
        raise ValueError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in settings.")

    return Client(account_sid, auth_token)


def send_whatsapp_message(to_phone: str, body: str) -> Tuple[bool, str]:
    """
    Sends a free-form WhatsApp message via Twilio.
    NOTE: Free-form messages only work within a 24-hour customer service window.
    For outbound initiated messages use send_whatsapp_template() instead.

    Returns: (success: bool, sid_or_error: str)
    """
    from_number = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', None)
    if not from_number:
        err = "TWILIO_WHATSAPP_NUMBER is not set in settings."
        logger.warning(err)
        return False, err

    normalized_to = normalize_phone_number(to_phone)
    if not normalized_to:
        err = f"Invalid phone number provided: {to_phone}"
        logger.warning(err)
        return False, err

    from_whatsapp = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
    to_whatsapp   = f"whatsapp:{normalized_to}"

    try:
        client = _get_twilio_client()
        message = client.messages.create(
            from_=from_whatsapp,
            to=to_whatsapp,
            body=body
        )
        logger.info(f"WhatsApp (free-form) sent to {normalized_to} (SID: {message.sid})")
        return True, message.sid
    except Exception as e:
        error_msg = f"Failed to send WhatsApp to {normalized_to}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg


def send_whatsapp_template(to_phone: str, content_sid: str, content_variables: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
    """
    Sends a pre-approved WhatsApp template message via Twilio Content API.
    This is required for outbound notifications (no prior 24-h window needed).

    Args:
        to_phone:           Recipient phone (any format — will be normalised)
        content_sid:        Twilio Content Template SID (e.g. 'HXxxxxxxxxxxxxxxxx')
        content_variables:  Dict of variable substitutions, e.g. {"1": "Ali", "2": "Math"}

    Returns: (success: bool, sid_or_error: str)
    """
    from_number = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', None)
    if not from_number:
        err = "TWILIO_WHATSAPP_NUMBER is not set in settings."
        logger.warning(err)
        return False, err

    normalized_to = normalize_phone_number(to_phone)
    if not normalized_to:
        err = f"Invalid phone number provided: {to_phone}"
        logger.warning(err)
        return False, err

    from_whatsapp = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
    to_whatsapp   = f"whatsapp:{normalized_to}"

    try:
        client = _get_twilio_client()

        create_kwargs = dict(
            from_=from_whatsapp,
            to=to_whatsapp,
            content_sid=content_sid,
        )
        if content_variables:
            create_kwargs["content_variables"] = json.dumps(content_variables)

        message = client.messages.create(**create_kwargs)
        logger.info(f"WhatsApp template '{content_sid}' sent to {normalized_to} (SID: {message.sid})")
        return True, message.sid
    except Exception as e:
        error_msg = f"Failed to send WhatsApp template to {normalized_to}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg


# ─────────────────────────────────────────────────────────────────────────────
# High-level notification helpers — used across the app
# Each function maps to one approved Twilio Content Template.
# Template SIDs are stored in settings (TWILIO_TEMPLATE_*) so they can be
# overridden per environment without code changes.
# ─────────────────────────────────────────────────────────────────────────────

def notify_payment_confirmed(to_phone: str, student_name: str, subject: str, amount: str) -> tuple:
    """
    Notify a student that their payment was confirmed.
    Template variables: {{1}} = student name, {{2}} = subject, {{3}} = amount
    """
    sid = getattr(settings, 'TWILIO_TEMPLATE_PAYMENT_CONFIRMED', None)
    if not sid:
        # Fallback: free-form (works within 24-h window)
        body = (
            f"As-salamu alaykum {student_name} 🌙\n\n"
            f"✅ Your payment of {amount} for *{subject}* has been confirmed on Hidayah.\n"
            f"Your tutor will be in touch shortly. JazakAllah Khayran! 🎓"
        )
        return send_whatsapp_message(to_phone, body)

    return send_whatsapp_template(
        to_phone, sid,
        content_variables={"1": student_name, "2": subject, "3": amount}
    )


def notify_booking_approved(to_phone: str, student_name: str, tutor_name: str, subject: str, start_date: str) -> tuple:
    """
    Notify a student their booking has been approved by the tutor.
    Template variables: {{1}} = student name, {{2}} = tutor name, {{3}} = subject, {{4}} = start date
    """
    sid = getattr(settings, 'TWILIO_TEMPLATE_BOOKING_APPROVED', None)
    if not sid:
        body = (
            f"As-salamu alaykum {student_name} 🌙\n\n"
            f"📚 Great news! Your booking with *{tutor_name}* for *{subject}* has been *approved*.\n"
            f"📅 Classes start: *{start_date}*\n\n"
            f"Log in to Hidayah to view your schedule. JazakAllah Khayran!"
        )
        return send_whatsapp_message(to_phone, body)

    return send_whatsapp_template(
        to_phone, sid,
        content_variables={"1": student_name, "2": tutor_name, "3": subject, "4": start_date}
    )


def notify_session_reminder(to_phone: str, student_name: str, subject: str, session_time: str) -> tuple:
    """
    Remind a student about an upcoming live class session.
    Template variables: {{1}} = student name, {{2}} = subject, {{3}} = session time
    """
    sid = getattr(settings, 'TWILIO_TEMPLATE_SESSION_REMINDER', None)
    if not sid:
        body = (
            f"As-salamu alaykum {student_name} 🌙\n\n"
            f"⏰ Reminder: Your *{subject}* class starts at *{session_time}*.\n"
            f"Click your Hidayah dashboard to join. See you soon! 📖"
        )
        return send_whatsapp_message(to_phone, body)

    return send_whatsapp_template(
        to_phone, sid,
        content_variables={"1": student_name, "2": subject, "3": session_time}
    )


def notify_tutor_new_booking(to_phone: str, tutor_name: str, student_name: str, subject: str) -> tuple:
    """
    Notify a tutor that they have received a new booking request.
    Template variables: {{1}} = tutor name, {{2}} = student name, {{3}} = subject
    """
    sid = getattr(settings, 'TWILIO_TEMPLATE_TUTOR_NEW_BOOKING', None)
    if not sid:
        body = (
            f"As-salamu alaykum {tutor_name} 🌙\n\n"
            f"📬 You have a new booking request from *{student_name}* for *{subject}*.\n"
            f"Please log in to Hidayah to review and approve. JazakAllah Khayran!"
        )
        return send_whatsapp_message(to_phone, body)

    return send_whatsapp_template(
        to_phone, sid,
        content_variables={"1": tutor_name, "2": student_name, "3": subject}
    )


def notify_wallet_topup(to_phone: str, user_name: str, amount: str, new_balance: str) -> tuple:
    """
    Notify a user their wallet has been topped up.
    Template variables: {{1}} = name, {{2}} = amount, {{3}} = new balance
    """
    sid = getattr(settings, 'TWILIO_TEMPLATE_WALLET_TOPUP', None)
    if not sid:
        body = (
            f"As-salamu alaykum {user_name} 🌙\n\n"
            f"💳 Your Hidayah wallet has been topped up with *{amount}*.\n"
            f"New balance: *{new_balance}*. Use it to pay for upcoming sessions!"
        )
        return send_whatsapp_message(to_phone, body)

    return send_whatsapp_template(
        to_phone, sid,
        content_variables={"1": user_name, "2": amount, "3": new_balance}
    )
