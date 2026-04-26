# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from students.views import TutorAssignedStudentsView
from applications.views import TutorScheduleView

User = get_user_model()
u = User.objects.get(id=45) # kabir umar (sale)

print(f"--- API TEST FOR TUTOR {u.username} (ID: {u.id}) ---")

factory = APIRequestFactory()

# 1. Test Regular Students
print("\n[Testing Regular Students API]")
request1 = factory.get('/api/students/tutor/my-students/')
force_authenticate(request1, user=u)
view1 = TutorAssignedStudentsView.as_view()
response1 = view1(request1)
import json
print(f"Response (Status {response1.status_code}):")
print(json.dumps(response1.data, indent=2))

# 2. Test Trial Classes
print("\n[Testing Trial Schedule API]")
request2 = factory.get('/api/applications/tutor/schedule/')
force_authenticate(request2, user=u)
view2 = TutorScheduleView.as_view()
response2 = view2(request2)
print(f"Response (Status {response2.status_code}):")
print(json.dumps(response2.data, indent=2))
