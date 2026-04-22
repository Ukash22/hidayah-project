# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from applications.models import TrialApplication
from classes.models import ScheduledSession # Import new model

class Command(BaseCommand):
    help = 'Sends email reminders for upcoming trial and regular classes'

    def handle(self, *args, **options):
        now = timezone.now()
        threshold = now + timedelta(minutes=30)
        
        # 1. TRIAL REMINDERS
        upcoming_trials = TrialApplication.objects.filter(
            status='approved',
            scheduled_at__gte=now,
            scheduled_at__lte=threshold,
            reminder_sent=False
        )
        
        for app in upcoming_trials:
            try:
                zoom_info = getattr(app, 'zoom_class', None)
                zoom_link = zoom_info.join_url if zoom_info else "Join link will be in your email."
                zoom_pass = zoom_info.password if zoom_info else "Check previous email."
                
                subject = f"Friendly Reminder: Your Trial Class starts soon! ({app.course_interested})"
                message = f"""Assalamu Alaikum {app.first_name},
                
This is a friendly reminder that your free trial class at Hidayah e Madarasah International starts in less than 30 minutes!

📅 Details:
----------
Tutor: {app.assigned_tutor}
Course: {app.course_interested}
Time: {app.scheduled_at.strftime('%H:%M')} (UTC)

🔴 Quick Join Link:
{zoom_link}
Password: {zoom_pass}

Please ensure you have a stable internet connection and are in a quiet place.

Best Regards,
Hidayah e Madarasah Team"""
                
                send_mail(subject, message, settings.EMAIL_HOST_USER, [app.email])
                app.reminder_sent = True
                app.save()
                self.stdout.write(self.style.SUCCESS(f"Sent trial reminder to {app.email}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send trial reminder to {app.email}: {e}"))

        # 2. REGULAR CLASS REMINDERS
        upcoming_sessions = ScheduledSession.objects.filter(
            status='PENDING',
            scheduled_at__gte=now,
            scheduled_at__lte=threshold,
            reminder_sent=False
        ).select_related('student', 'tutor')

        for session in upcoming_sessions:
            try:
                # Notify Student
                subject = f"Friendly Reminder: Your Class starts soon!"
                message = f"""Assalamu Alaikum {session.student.first_name},
                
Your class with {session.tutor.get_full_name()} starts in less than 30 minutes!

📅 Time: {session.scheduled_at.strftime('%H:%M')} (UTC)
🔴 Join Link: {session.meeting_link or 'Check your dashboard'}

JazakAllahu Khairan,
Hidayah Academic Team"""
                
                send_mail(subject, message, settings.EMAIL_HOST_USER, [session.student.email])

                # Notify Tutor
                tutor_message = f"""Assalamu Alaikum {session.tutor.first_name},
                
Your class with {session.student.get_full_name()} starts in less than 30 minutes!

📅 Time: {session.scheduled_at.strftime('%H:%M')} (UTC)
🔴 Start Link: {session.meeting_link or 'Check your dashboard'}

JazakAllahu Khairan,
Hidayah Management"""
                
                send_mail(f"Class Reminder: {session.student.get_full_name()}", tutor_message, settings.EMAIL_HOST_USER, [session.tutor.email])

                session.reminder_sent = True
                session.save()
                self.stdout.write(self.style.SUCCESS(f"Sent session reminders for {session.id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send session reminder for {session.id}: {e}"))
