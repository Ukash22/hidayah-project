# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

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
from tutors.models import TutorProfile

User = get_user_model()

def cleanup_assignments():
    print("--- Searching for Incorrect Assignments ---")
    
    # 1. Check StudentProfile
    students = StudentProfile.objects.filter(assigned_tutor__isnull=False)
    for s in students:
        if s.assigned_tutor.role != 'TUTOR':
            print(f"Student Profile {s.id} ({s.user.username}) incorrectly assigned to {s.assigned_tutor.role} {s.assigned_tutor.username}")
            # Try to recover if assigned_tutor (the string field) exists or if we can find by name
            # Actually StudentProfile doesn't have a char 'assigned_tutor_name' field, it's just the FK.
            # So we just clear it.
            s.assigned_tutor = None
            s.save()
            print(f"  -> Assignment cleared.")

    # 2. Check TrialApplication
    trials = TrialApplication.objects.filter(tutor__isnull=False)
    for t in trials:
        if t.tutor.role != 'TUTOR':
            print(f"Trial {t.id} ({t.first_name}) incorrectly assigned to {t.tutor.role} {t.tutor.username}")
            # Recovery: Look at assigned_tutor string field
            if t.assigned_tutor:
                name = t.assigned_tutor.strip()
                tP = None
                # Try exact name match in profiles
                for p in TutorProfile.objects.filter(status='APPROVED'):
                    if f"{p.user.first_name} {p.user.last_name}".lower() == name.lower():
                        tP = p
                        break
                
                if tP:
                    t.tutor = tP.user
                    t.save()
                    print(f"  -> Recovered! Assigned to {t.tutor.username} ({t.tutor.get_full_name()})")
                else:
                    t.tutor = None
                    t.save()
                    print(f"  -> Assignment cleared (Tutor '{name}' not found).")
            else:
                t.tutor = None
                t.save()
                print(f"  -> Assignment cleared.")

    print("\n--- Current Assignments Summary ---")
    print("Regular Students:")
    for s in StudentProfile.objects.filter(assigned_tutor__isnull=False):
        print(f"- Student {s.user.username} -> Tutor {s.assigned_tutor.username}")
    
    print("\nTrials:")
    for t in TrialApplication.objects.filter(tutor__isnull=False):
        print(f"- Trial {t.first_name} -> Tutor {t.tutor.username}")

cleanup_assignments()
