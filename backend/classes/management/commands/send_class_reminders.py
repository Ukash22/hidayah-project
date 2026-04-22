from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from classes.models import ScheduledSession
from applications.email_service import send_class_reminder_email
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Send automated email reminders for upcoming classes."

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting class reminder check..."))
        
        # Determine the target window: Now to +45 minutes from now
        now = timezone.now()
        target_time = now + timedelta(minutes=45)
        
        # Find sessions that:
        # 1. Are scheduled between now and target_time
        # 2. Have NOT had a reminder sent yet
        # 3. Are not CANCELLED or COMPLETED
        sessions = ScheduledSession.objects.filter(
            scheduled_at__gte=now,
            scheduled_at__lte=target_time,
            reminder_sent=False
        ).exclude(status__in=['CANCELLED', 'COMPLETED'])
        
        if not sessions.exists():
            self.stdout.write(self.style.SUCCESS("No upcoming classes require reminders at this time."))
            return
            
        success_count = 0
        error_count = 0
        
        for session in sessions:
            try:
                # 1. Send to Student
                send_class_reminder_email(user=session.student, session=session, is_tutor=False)
                
                # 2. Send to Tutor
                send_class_reminder_email(user=session.tutor, session=session, is_tutor=True)
                
                # 3. Mark as sent
                session.reminder_sent = True
                session.save(update_fields=['reminder_sent'])
                
                self.stdout.write(self.style.SUCCESS(f"Successfully sent reminders for session {session.id}"))
                success_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send reminder for session {session.id}: {str(e)}"))
                logger.error(f"Class Reminder Error session={session.id}: {e}")
                error_count += 1
                
        self.stdout.write(self.style.SUCCESS(
            f"Reminder execution complete. Sent: {success_count}, Failed: {error_count}"
        ))
