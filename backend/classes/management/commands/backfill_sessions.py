from django.core.management.base import BaseCommand
from students.models import StudentProfile, Enrollment
from classes.models import ScheduledSession
from classes.scheduler import generate_recurring_sessions
from decimal import Decimal


class Command(BaseCommand):
    help = 'Backfill 4 weeks of class sessions for all existing PAID students who have no sessions yet.'

    def add_arguments(self, parser):
        parser.add_argument('--student-id', type=int, help='Only backfill for a specific student user ID')
        parser.add_argument('--force', action='store_true', help='Force regeneration even if sessions already exist')

    def handle(self, *args, **options):
        student_id = options.get('student_id')
        force = options.get('force', False)

        profiles = StudentProfile.objects.filter(payment_status='PAID')
        if student_id:
            profiles = profiles.filter(user__id=student_id)

        self.stdout.write(f"Found {profiles.count()} paid student(s) to process...")
        total_sessions = 0

        for profile in profiles:
            user = profile.user
            enrollments = Enrollment.objects.filter(student=profile, status='APPROVED')

            if not enrollments.exists():
                self.stdout.write(f"  [SKIP] {user.get_full_name()} -- no approved enrollments.")
                continue

            for enrollment in enrollments:
                if not force:
                    existing = ScheduledSession.objects.filter(
                        student=user, subject=enrollment.subject
                    ).exists()
                    if existing:
                        self.stdout.write(f"  [SKIP] {user.get_full_name()} -- sessions already exist for {enrollment.subject}.")
                        continue

                if not enrollment.schedule:
                    self.stdout.write(f"  [SKIP] {user.get_full_name()} -- no schedule data.")
                    continue

                if not enrollment.tutor:
                    self.stdout.write(f"  [SKIP] {user.get_full_name()} -- no tutor assigned.")
                    continue

                sessions = generate_recurring_sessions(
                    student=user,
                    tutor=enrollment.tutor,
                    subject_obj=enrollment.subject,
                    schedule_data=enrollment.schedule,
                    fee_per_session=Decimal("0"),
                    weeks=4
                )
                count = len(sessions)
                total_sessions += count
                subject_name = enrollment.subject.name if enrollment.subject else "Unknown"
                self.stdout.write(
                    self.style.SUCCESS(f"  [OK] {user.get_full_name()} -- generated {count} sessions for {subject_name}")
                )

        self.stdout.write(self.style.SUCCESS(f"\nDone! Total sessions created: {total_sessions}"))
