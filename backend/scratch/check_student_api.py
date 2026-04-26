# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.views import StudentProfileDetailView
from django.contrib.auth import get_user_model
User = get_user_model()

def check_student(username):
    try:
        student = User.objects.get(username=username)
        print(f"\n--- Checking Student {username} (ID: {student.id}) ---")
        
        factory = APIRequestFactory()
        request = factory.get('/api/students/me/')
        force_authenticate(request, user=student)
        
        view = StudentProfileDetailView.as_view()
        response = view(request)
        
        import json
        print(f"Response (Status: {response.status_code}):")
        # Just show key fields
        data = response.data
        if data:
             print(f"Enrolled Course: {data.get('enrolled_course')}")
             print(f"Assigned Tutor ID: {data.get('assigned_tutor')}")
             print(f"Tutor Details: {data.get('assigned_tutor_details')}")
             print(f"Wallet Balance: {data.get('wallet_balance')}")
    except User.DoesNotExist:
        print(f"User {username} not found")

# Let's check some students
check_student('UMMA')
check_student('ukshat01')
check_student('umar')
