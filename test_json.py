import requests, random, json

u = f'std{random.randint(10000, 99999)}'
payload = {
  "username": u,
  "email": f"{u}@test.com",
  "password": "password123",
  "role": "STUDENT",
  "first_name": "Test",
  "last_name": "Test",
  "country": "Nigeria",
  "phone": "08012345678",
  "dob": None,
  "gender": "Male",
  "timezone": "Africa/Lagos",
  "preferred_language": "English",
  "address": "123 Test",
  "class_type": "ONE_ON_ONE",
  "level": "PRIMARY",
  "days_per_week": 1,
  "hours_per_week": None,
  "preferred_days": "MONDAY",
  "preferred_time_exact": "08:00-10:30",
  "preferred_start_date": "2026-05-01",
  "target_exam_type": None,
  "target_exam_year": None,
  "preferred_tutor_id": None,
  "subject_enrollments": [{"subject": "Math", "preferred_tutor_id": None}],
  "total_amount": 1500
}

resp = requests.post('http://localhost:8000/api/auth/register/', json=payload)
print(resp.status_code)
print(resp.text)
