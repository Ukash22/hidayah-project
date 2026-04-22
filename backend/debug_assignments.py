# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.models import TrialApplication
from students.models import StudentProfile
from classes.models import ScheduledSession

print("--- Trial Applications ---")
trials = TrialApplication.objects.all()
for t in trials:
    print(f"ID: {t.id}, Student: {t.first_name}, Status: {t.status}, Tutor: {t.tutor}")

print("\n--- Student Profiles ---")
profiles = StudentProfile.objects.all()
for p in profiles:
    print(f"ID: {p.id}, Student: {p.user.username}, Tutor: {p.assigned_tutor}")

print("\n--- Scheduled Sessions ---")
sessions = ScheduledSession.objects.all()
for s in sessions:
    print(f"ID: {s.id}, Student: {s.student.username}, Tutor: {s.tutor.username}, Status: {s.status}")
