# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Test script to verify tutor API endpoint with admin authentication
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

# Get an admin user
admin = User.objects.filter(is_staff=True, is_superuser=True).first()

if not admin:
    print("No admin user found. Please create one first.")
    exit(1)

print(f"Testing with admin user: {admin.username}")

# Create API client
client = APIClient()
client.force_authenticate(user=admin)

# Test the endpoint
response = client.get('/api/tutors/admin/list/')

print(f"\nStatus Code: {response.status_code}")
print(f"Number of tutors: {len(response.data)}")

if len(response.data) > 0:
    print("\nFirst tutor data:")
    print(response.data[0])
    print("\nAll tutor names:")
    for tutor in response.data:
        print(f"  - {tutor.get('name', 'N/A')} ({tutor.get('status', 'N/A')})")
