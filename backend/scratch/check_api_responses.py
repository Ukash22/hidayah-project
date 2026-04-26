# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.views import TutorAssignedStudentsView
from django.contrib.auth import get_user_model
User = get_user_model()

def check_tutor(username):
    try:
        tutor = User.objects.get(username=username)
        print(f"\n--- Checking {username} (ID: {tutor.id}) ---")
        
        factory = APIRequestFactory()
        request = factory.get('/api/students/tutor/my-students/')
        force_authenticate(request, user=tutor)
        
        view = TutorAssignedStudentsView.as_view()
        response = view(request)
        
        import json
        print(f"Response (Status: {response.status_code}):")
        print(json.dumps(response.data, indent=2))
    except User.DoesNotExist:
        print(f"User {username} not found")

check_tutor('kabir')
# Check other tutors too if any
check_tutor('usmany')
check_tutor('sadiq')
