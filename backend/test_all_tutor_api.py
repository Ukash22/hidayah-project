# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import requests

login_data = {'username': 'sale', 'password': 'password'}
try:
    login_res = requests.post('http://127.0.0.1:8000/api/auth/login/', json=login_data, timeout=5)
except Exception as e:
    print(f"Login failed: Connection error {str(e)}")
    exit()

if login_res.status_code != 200:
    print(f"Login failed: {login_res.status_code} {login_res.text}")
    exit()

token = login_res.json()['access']
headers = {'Authorization': f'Bearer {token}'}

endpoints = [
    'http://127.0.0.1:8000/api/applications/tutor/schedule/',
    'http://127.0.0.1:8000/api/students/tutor/my-students/',
    'http://127.0.0.1:8000/api/complaints/my/',
    'http://127.0.0.1:8000/api/curriculum/materials/',
    'http://127.0.0.1:8000/api/scheduling/requests/',
    'http://127.0.0.1:8000/api/tutors/',
]

for url in endpoints:
    try:
        res = requests.get(url, headers=headers, timeout=5)
        print(f"{url} -> {res.status_code}")
        if res.status_code != 200:
            print(f"  Error: {res.text[:200]}")
        else:
            print(f"  Data count: {len(res.json()) if isinstance(res.json(), list) else 'Object Response'}")
    except Exception as e:
        print(f"{url} -> FAILED: {str(e)}")
