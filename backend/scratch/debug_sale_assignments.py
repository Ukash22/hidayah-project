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

User = get_user_model()
try:
    u = User.objects.get(username='sale')
    print(f"User: {u.username}, ID: {u.id}, Role: {u.role}")
    
    students = StudentProfile.objects.filter(assigned_tutor=u)
    print(f"Students count: {students.count()}")
    for s in students:
        print(f"  - Student ID: {s.id}, User: {s.user.username}")
        
    trials = TrialApplication.objects.filter(tutor=u, status='approved')
    print(f"Trials count: {trials.count()}")
    for t in trials:
        print(f"  - Trial ID: {t.id}, Name: {t.first_name}")
except User.DoesNotExist:
    print("User 'sale' not found")
