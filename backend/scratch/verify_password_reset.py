# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import smart_bytes
from django.utils.http import urlsafe_base64_encode

User = get_user_model()

def run_verification():
    print("Starting Password Reset Verification...")

    # Fix Allowed Hosts
    from django.conf import settings
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = settings.ALLOWED_HOSTS + ['testserver']

    # 1. Setup Test User
    email = "test_reset@example.com"
    password = "oldpassword123"
    
    try:
        user = User.objects.get(email=email)
        user.delete()
    except User.DoesNotExist:
        pass
        
    user = User.objects.create_user(
        username="test_reset",
        email=email,
        password=password,
        first_name="Reset",
        last_name="Tester"
    )
    print(f"Created user: {email} with password '{password}'")
    
    client = APIClient()
    
    # 2. Test Request Reset (POST /api/auth/password-reset/request/)
    print("\n1. Testing Request Reset API...")
    response = client.post('/api/auth/password-reset/request/', {'email': email})
    
    if response.status_code == 200:
        print("Request Reset Successful (Email mock sent).")
    else:
        print(f"Request Reset Failed: {getattr(response, 'data', response.content)}")
        return

    # 3. Simulate Token Generation (Backend internal check)
    uidb64 = urlsafe_base64_encode(smart_bytes(user.id))
    token = PasswordResetTokenGenerator().make_token(user)
    print(f"Generated Token manually for verification: {token}")

    # 4. Test API Confirm Reset
    print("\n2. Testing Confirm Reset API...")
    new_password = "newpassword456"
    
    response = client.post('/api/auth/password-reset/confirm/', {
        'uidb64': uidb64,
        'token': token,
        'password': new_password
    })
    
    if response.status_code == 200:
        print("Password Reset Confirmation Successful.")
    else:
        print(f"Password Reset Confirmation Failed: {getattr(response, 'data', response.content)}")
        return

    # 5. Verify New Login
    print("\n3. Verifying Login with New Password...")
    login_response = client.post('/api/auth/login/', {
        'username': user.username,
        'password': new_password
    })
    
    if login_response.status_code == 200:
        print("Login with new password SUCCESSFUL!")
    else:
        print(f"Login failed: {getattr(login_response, 'data', login_response.content)}")
        return

    print("\nVerification Complete.")

if __name__ == "__main__":
    run_verification()
