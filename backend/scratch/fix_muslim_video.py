# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tutors.models import TutorProfile
from django.contrib.auth import get_user_model

User = get_user_model()
u = User.objects.filter(username='usmany').first()
if u:
    tp = TutorProfile.objects.filter(user=u).first()
    if tp:
        # Set a real YouTube video URL (a Quran recitation sample)
        tp.intro_video_url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
        tp.save()
        print(f"Updated intro_video_url for {u.get_full_name()}")
    else:
        print("No profile found")
else:
    print("User not found")
