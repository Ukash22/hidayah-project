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
kabir = User.objects.get(username='kabir')

factory = APIRequestFactory()
request = factory.get('/api/students/tutor/my-students/')
force_authenticate(request, user=kabir)

view = TutorAssignedStudentsView.as_view()
response = view(request)

print("--- Kabir's Assigned Students API Response ---")
import json
print(json.dumps(response.data, indent=2))
