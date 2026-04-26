import requests
import json

url = "http://localhost:8000/api/auth/register/"
payload = {
    "username": "testuser_empty_dob",
    "email": "testuser_empty_dob@example.com",
    "password": "password123",
    "dob": "", # EMPTY STRING TEST
    "first_name": "Test",
    "last_name": "User",
    "gender": "Male",
    "country": "Nigeria",
    "phone": "08012345678",
    "address": "123 Test Street",
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
