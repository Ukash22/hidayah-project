# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tutors.views import TutorViewSet
from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.filter(is_staff=True).first()

factory = APIRequestFactory()
request = factory.get('/api/tutors/admin/list/?status=APPROVED')
force_authenticate(request, user=admin)

view = TutorViewSet.as_view({'get': 'admin_list'})
response = view(request)

print("--- Tutors Admin List ---")
for t in response.data:
    print(f"ID: {t['id']}, User ID: {t['user_id']}, Name: {t['name']}")
