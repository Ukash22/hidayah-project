"""
One-time fix script: Creates a TutorProfile for any TUTOR-role users
who were created by the admin panel without one.

Run with:
    python fix_missing_tutor_profiles.py
from the backend/ directory (with the venv active), or:
    python manage.py shell < fix_missing_tutor_profiles.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from tutors.models import TutorProfile

User = get_user_model()

# Find all TUTOR users without a TutorProfile
tutors_without_profile = User.objects.filter(role='TUTOR').exclude(
    id__in=TutorProfile.objects.values_list('user_id', flat=True)
)

count = 0
for user in tutors_without_profile:
    TutorProfile.objects.create(
        user=user,
        status='APPROVED',
        subjects_to_teach='',
        availability_days='',
        availability_hours='',
        experience_years=0,
        mode='ONLINE',
    )
    count += 1
    print(f"  Created TutorProfile for: {user.username} ({user.email})")

print(f"\nDone. Created {count} missing TutorProfile(s).")
