import requests
import json

url = "http://localhost:8000/api/auth/register/"
payload = {
    "username": "testuser_unique_1",
    "email": "testuser_unique_1@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "dob": "2000-01-01",
    "gender": "Male",
    "country": "Nigeria",
    "phone": "08012345678",
    "address": "123 Test Street",
    "days_per_week": 3,
    "hours_per_week": 1,
    "enrolled_course": "Mathematics",
    "subject_enrollments": [{"subject": "Mathematics", "preferred_tutor_id": None}],
    "total_amount": 1500
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
