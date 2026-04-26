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
tutors = User.objects.filter(role='TUTOR')

print("--- FULL ASSIGNMENT REPORT ---")
for t in tutors:
    print(f"\nTutor: {t.first_name} {t.last_name} (Username: {t.username}, ID: {t.id})")
    
    reg_students = StudentProfile.objects.filter(assigned_tutor=t)
    print(f"  Regular Students: {reg_students.count()}")
    for s in reg_students:
        print(f"    - {s.user.first_name} {s.user.last_name} ({s.user.username})")
        
    trials = TrialApplication.objects.filter(tutor=t, status='approved')
    print(f"  Trial Classes: {trials.count()}")
    for tr in trials:
        print(f"    - {tr.first_name} {tr.last_name}")

print("\n--- Orphaned / Admin Assigned Trials ---")
orphans = TrialApplication.objects.filter(status='approved', tutor__isnull=True)
for o in orphans:
    print(f"- Trial {o.id}: {o.first_name} {o.last_name} | Field 'assigned_tutor': '{o.assigned_tutor}'")

others = TrialApplication.objects.filter(status='approved').exclude(tutor__role='TUTOR')
for ot in others:
    print(f"- Trial {ot.id}: {ot.first_name} {ot.last_name} | Assigned to NON-TUTOR: {ot.tutor.username} ({ot.tutor.role})")
