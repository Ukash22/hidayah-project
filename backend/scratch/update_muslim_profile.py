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
    tp, created = TutorProfile.objects.get_or_create(user=u)
    tp.experience_years = 3
    tp.languages = 'English, Arabic, Hausa'
    tp.hourly_rate = 1500.00
    tp.subjects_to_teach = 'Quran, Arabic, Tauheed'
    tp.live_class_link = 'https://meet.jit.si/HidayahLiveRoom_Muslim'
    tp.trial_class_link = 'https://meet.jit.si/HidayahTrialRoom_Muslim'
    tp.save()
    print(f"Updated profile for {u.username}")
else:
    print("User 'usmany' not found.")
