import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.models import TrialApplication
from tutors.models import TutorProfile

print("--- Approved Trial Applications ---")
for app in TrialApplication.objects.filter(status='approved'):
    print(f"ID: {app.id}, Student: {app.first_name}, DB Tutor ID: {app.tutor_id}, Assigned Tutor Name: {app.assigned_tutor}")

print("--- Tutor Profiles ---")
for t in TutorProfile.objects.all():
    print(f"ID: {t.id}, User ID: {t.user_id}, Name: {t.full_name}")
