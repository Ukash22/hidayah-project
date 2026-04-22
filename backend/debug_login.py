# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import requests

url = "http://127.0.0.1:8000/api/auth/login/"
data = {
    "username": "admin",
    "password": "admin123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
