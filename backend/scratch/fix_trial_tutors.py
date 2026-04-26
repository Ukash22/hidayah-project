# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from applications.models import TrialApplication
from tutors.models import TutorProfile

User = get_user_model()

print("Fixing TrialApplication tutor foreign keys...")
trials = TrialApplication.objects.filter(status='approved', tutor__isnull=True)
count = 0
for t in trials:
    if t.assigned_tutor:
        # Try to find a tutor user whose name matches assigned_tutor string
        # assigned_tutor is usually "First Last"
        parts = t.assigned_tutor.split(' ')
        if len(parts) >= 1:
            # Try to find by first name and last name
            potential_users = User.objects.filter(role='TUTOR', first_name__icontains=parts[0])
            if potential_users.count() == 1:
                t.tutor = potential_users.first()
                t.save()
                print(f"Fixed Trial {t.id}: Set tutor to {t.tutor.username}")
                count += 1
            else:
                print(f"Trial {t.id}: Could not unambiguously find tutor for '{t.assigned_tutor}'")

print(f"Fixed {count} trial applications.")
