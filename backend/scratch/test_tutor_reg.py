# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import requests

url = 'http://localhost:8000/api/tutors/register/'
data = {
    'username': 'testtutor4',
    'email': 'testtutor4@example.com',
    'password': 'password123',
    'first_name': 'Test',
    'last_name': 'Tutor',
    'gender': 'Male',
    'country': 'Nigeria',
    'age': 30,
    'address': '123 test st',
    'experience_years': 5,
    'subjects_to_teach': 'Quran',
    'languages': 'Arabic, English',
    'has_online_exp': True,
    'device_type': 'COMPUTER',
    'network_type': 'Fiber',
    'availability_days': 'Monday, Tuesday',
    'availability_hours': '10:00 AM - 2:00 PM'
}

response = requests.post(url, data=data)
print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.json()}")
