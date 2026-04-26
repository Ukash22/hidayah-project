# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.models import StudentProfile
from students.serializers import StudentProfileSerializer
from django.contrib.auth import get_user_model
User = get_user_model()

kabir = User.objects.get(username='kabir')
print(f"--- Kabir (ID: {kabir.id}) ---")

students = StudentProfile.objects.filter(assigned_tutor=kabir)
print(f"Database count: {students.count()}")

serializer = StudentProfileSerializer(students, many=True)
import json
print("Serialized Data:")
print(json.dumps(serializer.data, indent=2))
