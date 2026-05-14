import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

# Set up Django environment
sys.path.append(r'c:\Users\USER\Desktop\hidayah\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from classes.models import ScheduledSession
from applications.models import TrialApplication
from students.models import StudentProfile

User = get_user_model()
target_email = 'tb@gmail.com'

try:
    user = User.objects.get(email=target_email)
    print(f"User: {user.username}, Role: {user.role}, ID: {user.id}")
    
    now = timezone.now()
    
    # 1. Regular Sessions
    try:
        profile = StudentProfile.objects.get(user=user)
        print(f"Profile Status: {profile.payment_status}")
        if profile.payment_status == 'PAID':
            reg = ScheduledSession.objects.filter(student=user)
            print(f"Found {reg.count()} regular sessions")
            for s in reg:
                print(f" - Session: {s.subject.name if s.subject else 'None'} at {s.scheduled_at}")
        else:
            print("Profile NOT PAID, sessions hidden")
    except StudentProfile.DoesNotExist:
        print("Profile not found")
        
    # 2. Trial Sessions
    trials = TrialApplication.objects.filter(email=user.email, status='approved', scheduled_at__isnull=False)
    print(f"Found {trials.count()} trial sessions")
    for t in trials:
        print(f" - Trial: {t.course_interested} at {t.scheduled_at}")
        
except Exception as e:
    print(f"Error: {e}")
