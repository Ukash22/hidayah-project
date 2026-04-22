import os
import django
import json
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.models import Enrollment, StudentProfile
from classes.models import ScheduledSession
from classes.scheduler import generate_recurring_sessions

def repair():
    print("Starting Enrollment Repair...")
    
    # 1. Find enrollments with or without schedules that are APPROVED
    enrollments = Enrollment.objects.filter(status='APPROVED')
    print(f"Checking {enrollments.count()} approved enrollments.")
    
    for enr in enrollments:
        profile = enr.student
        print(f"Checking Enrollment for {profile.user.username} - {enr.subject.name if enr.subject else 'Unknown Subject'}")
        
        # [REPAIR ADD-ON] Assign a default tutor if missing to allow session generation
        if not enr.tutor:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            default_tutor = User.objects.filter(role='TUTOR').first()
            if default_tutor:
                enr.tutor = default_tutor
                enr.save()
                print(f"  -> Assigned Default Tutor: {default_tutor.username}")

        # Build schedule from profile
        days_str = profile.preferred_days or ""
        times_str = profile.preferred_time_exact or ""
        
        days_list = [d.strip().upper() for d in str(days_str).split(',') if d.strip()]
        times_list = [t.strip() for t in str(times_str).split(',') if t.strip()]
        
        new_schedule = []
        for d, t in zip(days_list, times_list):
            new_schedule.append({"day": d, "time": t})
        
        if new_schedule:
            enr.schedule = json.dumps(new_schedule)
            enr.save()
            print(f"  -> Updated schedule: {enr.schedule}")
            
            # 2. Force mark as PAID to trigger generation (User said they paid)
            if profile.payment_status != 'PAID':
                profile.payment_status = 'PAID'
                profile.save()
                print(f"  -> Forced status to PAID.")

            # 3. Generate sessions
            if enr.tutor:
                # Check if sessions already exist
                if not ScheduledSession.objects.filter(student=profile.user, subject=enr.subject).exists():
                    print(f"  -> Generating sessions for {profile.user.username}...")
                    sessions = generate_recurring_sessions(
                        student=profile.user,
                        tutor=enr.tutor,
                        subject_obj=enr.subject,
                        schedule_data=new_schedule,
                        weeks=4,
                        start_date=enr.preferred_start_date
                    )
                    print(f"  -> Created {len(sessions)} sessions.")
                else:
                    print(f"  -> Sessions already exist for this subject.")
        else:
            print(f"  -> Warning: No schedule found in profile for this student.")

    print("Repair complete.")

if __name__ == "__main__":
    repair()
