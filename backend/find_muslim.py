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

from applications.models import TrialApplication
from django.contrib.auth import get_user_model
User = get_user_model()

print("--- Searching for Muslim Yau Musa ---")
trials = TrialApplication.objects.filter(first_name__icontains='Muslim')
for t in trials:
    print(f"Trial ID: {t.id}")
    print(f"Name: {t.first_name} {t.last_name}")
    print(f"Status: {t.status}")
    print(f"Assigned Tutor (Char): {t.assigned_tutor}")
    print(f"Tutor (FK): {t.tutor}")
    if t.tutor:
        print(f"Tutor Username: {t.tutor.username}")
    
    # Check if there's a ZoomClass
    try:
        zoom = t.zoom_class
        print(f"Zoom Join URL: {zoom.join_url}")
    except:
        print("No Zoom Class found")
    print("-" * 20)

print("\n--- Searching for Kabir Tutor ---")
try:
    kabir = User.objects.get(username='kabir')
    print(f"Kabir ID: {kabir.id}")
except User.DoesNotExist:
    print("Kabir not found")
