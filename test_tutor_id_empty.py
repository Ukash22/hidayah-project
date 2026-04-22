import requests
import json

url = "http://localhost:8000/api/auth/register/"
payload = {
    "username": "tutor_id_test_user_6",
    "email": "tutor_id_test_user_6@example.com",
    "password": "password123",
    "dob": "2000-01-01",
    "first_name": "Tutor",
    "last_name": "Test",
    "gender": "Male",
    "country": "Nigeria",
    "phone": "08012345678",
    "address": "123 Test Street",
    "days_per_week": 3,
    "hours_per_week": 1,
    "enrolled_course": "Mathematics",
    "subject_enrollments": [{"subject": "Mathematics", "preferred_tutor_id": ""}], # EMPTY STRING TUTOR ID
    "preferred_tutor_id": "", # EMPTY STRING HERE TOO
    "total_amount": 1500
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
