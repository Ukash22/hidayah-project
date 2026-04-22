# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.models import TrialApplication
from django.contrib.auth import get_user_model
from tutors.models import TutorProfile

User = get_user_model()

print("Correcting TrialApplication tutor foreign keys...")
trials = TrialApplication.objects.filter(status='approved')
count = 0
for t in trials:
    if t.assigned_tutor:
        # Check if current tutor is weird
        curr_tutor = t.tutor
        if curr_tutor and curr_tutor.role != 'TUTOR':
            print(f"Trial {t.id} has non-tutor user {curr_tutor.username} assigned. Re-finding...")
        
        # We know assigned_tutor (string) is the name, but we ALSO know the admin likely picked a TutorProfile
        # and our old bug used that Profile ID as User ID.
        # Let's try to match by name in TutorProfile first since that's more reliable.
        name = t.assigned_tutor.strip()
        
        # Try finding a TutorProfile where user's name matches
        parts = name.split(' ')
        potential_profiles = TutorProfile.objects.filter(status='APPROVED')
        found_tP = None
        for tp in potential_profiles:
            tp_name = f"{tp.user.first_name} {tp.user.last_name}".strip()
            if tp_name.lower() == name.lower():
                found_tP = tp
                break
        
        if found_tP:
            t.tutor = found_tP.user
            t.save()
            print(f"Fixed Trial {t.id}: Set tutor to {t.tutor.username} ({t.tutor.get_full_name()})")
            count += 1
        else:
            print(f"Trial {t.id}: Could not find APPROVED tutor for name '{name}'")

print(f"\nFixed {count} trial applications.")
