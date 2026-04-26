# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("--- Users ---")
for u in User.objects.all():
    print(f"ID: {u.id}, Username: {u.username}, Role: {getattr(u, 'role', 'N/A')}, Staff: {u.is_staff}")

print("\n--- Tutor Profiles ---")
from tutors.models import TutorProfile
for tp in TutorProfile.objects.all():
    print(f"ID: {tp.id}, User ID: {tp.user.id}, Username: {tp.user.username}, Status: {tp.status}")
