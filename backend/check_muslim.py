# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from tutors.models import TutorProfile

User = get_user_model()
u = User.objects.filter(username='usmany').first()
if u:
    tp = TutorProfile.objects.filter(user=u).first()
    if tp:
        print(f"Status: {tp.status}")
        print(f"Is Public: {tp.is_public}")
        print(f"intro_video: {tp.intro_video}")
        print(f"intro_video_url: {tp.intro_video_url}")
        print(f"short_recitation: {tp.short_recitation}")
        print(f"live_class_link: {tp.live_class_link}")
        print(f"trial_class_link: {tp.trial_class_link}")
    else:
        print("No tutor profile")
else:
    print("User not found")
