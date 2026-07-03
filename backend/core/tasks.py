# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Celery tasks for slow I/O operations (email, PDF generation).
All args are JSON-serializable so they survive Celery serialization.
Each task retries up to 3 times with 60-second back-off on failure.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='core.tasks.admission_letter')
def send_admission_letter_task(self, profile_id, payment_url, enrollment_data):
    """Generate the admission letter PDF, save it to the profile, and email it."""
    try:
        from students.models import StudentProfile
        from core.utils.pdf_generator import generate_admission_letter
        from applications.email_service import send_admission_letter_email

        profile = StudentProfile.objects.select_related('user').get(pk=profile_id)
        user = profile.user
        total_payment = sum(float(e['monthly_rate']) for e in enrollment_data)

        letter_path = generate_admission_letter(
            user, profile,
            {'enrollments': enrollment_data, 'total_payment': total_payment},
            payment_url=payment_url,
        )
        profile.admission_letter = letter_path
        profile.save(update_fields=['admission_letter'])
        send_admission_letter_email(user, profile)
    except Exception as exc:
        logger.exception("send_admission_letter_task failed for profile %s", profile_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='core.tasks.tutor_email')
def send_tutor_email_task(self, user_id, profile_id, action_type, reason='', interview_link=''):
    """Send the correct tutor workflow email (interview / approve / reject)."""
    try:
        from django.contrib.auth import get_user_model
        from tutors.models import TutorProfile
        from applications.email_service import (
            send_tutor_interview_email,
            send_tutor_approval_email,
            send_tutor_rejection_email,
        )
        User = get_user_model()
        user = User.objects.get(pk=user_id)
        profile = TutorProfile.objects.get(pk=profile_id)

        if action_type == 'INTERVIEW':
            send_tutor_interview_email(user, profile, interview_link)
        elif action_type == 'APPROVE':
            send_tutor_approval_email(user, profile)
        elif action_type == 'REJECT':
            send_tutor_rejection_email(user, reason)
    except Exception as exc:
        logger.exception("send_tutor_email_task failed for user %s action %s", user_id, action_type)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='core.tasks.trial_confirmation')
def send_trial_confirmation_task(
    self, email, first_name, tutor_name, course,
    formatted_time, duration, join_link, whiteboard_link,
):
    """Send the trial class confirmation email to the applicant."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings

        subject = "Your Free Trial Class Confirmation - Hidayah e Madarasah"
        message = f"""Assalamu Alaikum {first_name},

Your free trial class has been scheduled!

📅 Class Details:
----------------
Tutor: {tutor_name}
Topic: {course}
Date & Time: {formatted_time} (UTC)
Duration: {duration} Minutes

🔴 Join Class Directly:
{join_link}

🎨 Whiteboard Link (if applicable):
{whiteboard_link}

You can also join via your Student Dashboard:
Link: {settings.FRONTEND_URL}/student

Note: Joining the class will deduct the session fee from your wallet.

Best Regards,
Hidayah e Madarasah Team"""

        send_mail(subject, message, settings.EMAIL_HOST_USER, [email], fail_silently=False)
    except Exception as exc:
        logger.exception("send_trial_confirmation_task failed for %s", email)
        raise self.retry(exc=exc)
