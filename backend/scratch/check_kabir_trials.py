# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.views import TutorScheduleView
from django.contrib.auth import get_user_model
User = get_user_model()

kabir = User.objects.get(username='kabir')
print(f"--- Kabir's Trial Schedule (ID: {kabir.id}) ---")

factory = APIRequestFactory()
request = factory.get('/api/applications/tutor/schedule/')
force_authenticate(request, user=kabir)

view = TutorScheduleView.as_view()
response = view(request)

import json
print(json.dumps(response.data, indent=2))
