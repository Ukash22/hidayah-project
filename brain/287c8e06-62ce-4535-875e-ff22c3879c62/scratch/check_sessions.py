import os
import django
import sys

# Set up Django environment
sys.path.append(r'c:\Users\USER\Desktop\hidayah\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from classes.models import ScheduledSession
from applications.models import TrialApplication
from students.models import StudentProfile

User = get_user_model()
target_email = 'tb@gmail.com' # From the previous user request screenshot description

try:
    user = User.objects.get(email=target_email)
    print(f"User: {user.username}, Role: {user.role}")
    
    profile = StudentProfile.objects.get(user=user)
    print(f"Profile Payment Status: {profile.payment_status}")
    
    reg_sessions = ScheduledSession.objects.filter(student=user).count()
    print(f"Regular Sessions: {reg_sessions}")
    
    trial_sessions = TrialApplication.objects.filter(email=user.email, status='approved').count()
    print(f"Trial Sessions (Approved): {trial_sessions}")
    
except Exception as e:
    print(f"Error: {e}")
