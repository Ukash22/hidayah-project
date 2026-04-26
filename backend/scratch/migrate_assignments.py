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
from classes.models import ScheduledSession

User = get_user_model()
old_tutor = User.objects.get(id=33) # ukasha yau musa (kabir)
new_tutor = User.objects.get(id=45) # kabir umar (sale)

print(f"Moving assignments from {old_tutor.username} (ID {old_tutor.id}) to {new_tutor.username} (ID {new_tutor.id})")

# 1. Update Student Profiles
students = StudentProfile.objects.filter(assigned_tutor=old_tutor)
for s in students:
    s.assigned_tutor = new_tutor
    s.save()
    print(f"Moved StudentProfile: {s.user.username}")

# 2. Update Trial Applications
trials = TrialApplication.objects.filter(tutor=old_tutor)
for t in trials:
    t.tutor = new_tutor
    t.save()
    print(f"Moved TrialApplication: {t.first_name}")

# 3. Update Scheduled Sessions
sessions = ScheduledSession.objects.filter(tutor=old_tutor)
for sess in sessions:
    sess.tutor = new_tutor
    sess.save()
    print(f"Moved ScheduledSession: {sess.id}")

print("Done.")
