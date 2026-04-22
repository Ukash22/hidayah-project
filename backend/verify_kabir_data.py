# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.models import StudentProfile
from django.contrib.auth import get_user_model
User = get_user_model()
kabir = User.objects.get(username='kabir')

print(f"Authenticating as {kabir.username} (ID: {kabir.id})")
students = StudentProfile.objects.filter(assigned_tutor=kabir)
print(f"Assigned Students count: {students.count()}")
for s in students:
    print(f"- {s.user.username} (Profile ID: {s.id})")

from applications.models import TrialApplication
trials = TrialApplication.objects.filter(tutor=kabir, status='approved')
print(f"Trial Classes count: {trials.count()}")
for t in trials:
    print(f"- {t.first_name} (Trial ID: {t.id})")
