# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from students.models import StudentProfile
from applications.models import TrialApplication

User = get_user_model()
kabir = User.objects.get(username='kabir')

print(f"--- Dashboard Data for Tutor: {kabir.username} (ID: {kabir.id}) ---")

print("\nRegular Students Assigned:")
students = StudentProfile.objects.filter(assigned_tutor=kabir)
for s in students:
    print(f"- {s.user.username} (Level: {s.level}, Course: {s.enrolled_course})")

print("\nTrial Classes Assigned:")
trials = TrialApplication.objects.filter(tutor=kabir, status='approved')
for t in trials:
    print(f"- {t.first_name} (Course: {t.course_interested}, Time: {t.scheduled_at})")
