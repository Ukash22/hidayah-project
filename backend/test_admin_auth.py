# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def test_admin_auth():
    print("Testing Admin Auth Flow...")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login/"
    creds = {"username": "admin", "password": "admin123"}
    
    try:
        resp = requests.post(login_url, json=creds)
        
        if resp.status_code != 200:
            print(f"Login Failed: {resp.status_code} - {resp.text}")
            return
            
        data = resp.json()
        user = data.get('user', {})
        role = user.get('role', 'MISSING')
        token = data.get('access')
        
        print(f"Login Successful")
        print(f"   Role in Login Response: {role}")
        
        if role != 'ADMIN':
            print(f"   WARNING: Login role is '{role}' (expected 'ADMIN')")
        
        # 2. Get Profile
        profile_url = f"{BASE_URL}/auth/profile/"
        headers = {"Authorization": f"Bearer {token}"}
        
        resp2 = requests.get(profile_url, headers=headers)
        
        if resp2.status_code != 200:
            print(f"Profile Fetch Failed: {resp2.status_code} - {resp2.text}")
            return
            
        p_data = resp2.json()
        p_role = p_data.get('role', 'MISSING')
        
        print(f"Profile Fetch Successful")
        print(f"   Role in Profile Response: {p_role}")
        
        if p_role != 'ADMIN':
            print(f"   CRITICAL: Profile role is '{p_role}'! This causes the redirect bug.")
        else:
            print("   Profile role is CORRECT ('ADMIN'). Backend is fine.")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_admin_auth()
