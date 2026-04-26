import requests
import json

url = "http://localhost:8000/api/auth/register/"
payload = {
    "username": "minor_test_user_6",
    "email": "minor_test_user_6@example.com",
    "password": "password123",
    "dob": "2015-01-01", # MINOR
    "first_name": "Minor",
    "last_name": "Student",
    "gender": "Male",
    "country": "Nigeria",
    "phone": "08012345678",
    "address": "123 Test Street",
    "days_per_week": 3,
    "hours_per_week": 1,
    "enrolled_course": "Mathematics",
    "subject_enrollments": [{"subject": "Mathematics", "preferred_tutor_id": None}],
    "total_amount": 1500,
    "parent_first_name": "Parent",
    "parent_last_name": "Student",
    "parent_email": "parent_minor_6@example.com",
    "parent_password": "password123",
    "relationship": "Father"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
