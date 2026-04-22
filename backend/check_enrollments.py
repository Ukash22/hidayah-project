from students.models import Enrollment
from classes.models import ScheduledSession
import json

def check_enrollments():
    enrs = Enrollment.objects.filter(status='APPROVED')
    print(f"Total Approved Enrollments: {enrs.count()}")
    for e in enrs:
        print(f"User: {e.student.user.username}, Subject: {e.subject.name}")
        print(f"  Enrollment Schedule: {e.schedule}")
        print(f"  Sessions Count: {ScheduledSession.objects.filter(student=e.student.user, subject=e.subject).count()}")
        
        # Check student profile too
        profile = e.student
        print(f"  Profile Schedule Days: {profile.preferred_days}")
        print(f"  Profile Schedule Exact: {profile.preferred_time_exact}")
        print("-" * 20)

if __name__ == "__main__":
    check_enrollments()
