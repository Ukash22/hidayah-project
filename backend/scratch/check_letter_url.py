# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.models import StudentProfile
from django.conf import settings

# Find a profile with an admission letter
profile = StudentProfile.objects.filter(admission_letter__isnull=False).first()
if profile:
    print(f"admission_letter: {profile.admission_letter}")
    print(f"admission_letter.url: {profile.admission_letter.url}")
    print(f"MEDIA_URL: {settings.MEDIA_URL}")
else:
    print("No profile with letter found")
