# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
import sys
import requests

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings

def verify_paystack_keys():
    print(f"Checking Paystack Keys...")
    secret_key = settings.PAYSTACK_SECRET_KEY
    public_key = settings.PAYSTACK_PUBLIC_KEY
    mock_mode = settings.PAYSTACK_MOCK_MODE
    
    print(f"Secret Key loaded: {secret_key[:10]}...")
    print(f"Public Key loaded: {public_key[:10]}...")
    print(f"Mock Mode: {mock_mode}")
    
    if mock_mode:
        print("ERROR: Mock mode is still enabled in settings.py")
        return

    # Test initialization with minimum amount (100 kobo = N1)
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": "test_verification@example.com",
        "amount": 10000, # N100
        "reference": "VERIFY_KEYS_" + os.urandom(4).hex()
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            print("SUCCESS: Paystack keys are valid and API is reachable.")
            print(f"Authorization URL: {response.json()['data']['authorization_url']}")
        else:
            print(f"FAILURE: Paystack API returned {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"ERROR: Could not connect to Paystack: {e}")

if __name__ == "__main__":
    verify_paystack_keys()
