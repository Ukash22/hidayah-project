# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Test script to verify admin approval/rejection functionality
Run this from the backend directory with: python test_approval.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.models import TrialApplication, ZoomClass
from applications.zoom_service import ZoomService
from django.core.mail import send_mail
from django.conf import settings

def test_zoom_credentials():
    """Test if Zoom credentials are loaded correctly"""
    print("\n[*] Testing Zoom Credentials...")
    print(f"Account ID: {settings.ZOOM_ACCOUNT_ID}")
    print(f"Client ID: {settings.ZOOM_CLIENT_ID}")
    print(f"Client Secret: {'*' * 20}{settings.ZOOM_CLIENT_SECRET[-4:]}")
    
    if not all([settings.ZOOM_ACCOUNT_ID, settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_SECRET]):
        print("[FAIL] Missing Zoom credentials!")
        return False
    print("[PASS] Zoom credentials loaded")
    return True

def test_zoom_token():
    """Test if we can get a Zoom access token"""
    print("\n[*] Testing Zoom OAuth Token...")
    try:
        token = ZoomService.get_access_token()
        if token:
            print(f"[PASS] Successfully got access token: {token[:20]}...")
            return True
        else:
            print("[FAIL] Failed to get access token")
            return False
    except Exception as e:
        print(f"[FAIL] Error getting token: {e}")
        return False

def test_email_config():
    """Test if email configuration is correct"""
    print("\n[*] Testing Email Configuration...")
    print(f"Email Host: {settings.EMAIL_HOST}")
    print(f"Email Port: {settings.EMAIL_PORT}")
    print(f"Email User: {settings.EMAIL_HOST_USER}")
    print(f"Use TLS: {settings.EMAIL_USE_TLS}")
    
    if not all([settings.EMAIL_HOST, settings.EMAIL_PORT, settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD]):
        print("[FAIL] Missing email credentials!")
        return False
    print("[PASS] Email configuration loaded")
    return True

def test_database():
    """Test database connection and check for applications"""
    print("\n[*] Testing Database...")
    try:
        count = TrialApplication.objects.count()
        pending_count = TrialApplication.objects.filter(status='pending').count()
        print(f"[PASS] Total applications: {count}")
        print(f"[PASS] Pending applications: {pending_count}")
        
        if pending_count > 0:
            print("\nPending Applications:")
            for app in TrialApplication.objects.filter(status='pending')[:5]:
                print(f"  - ID: {app.id}, Name: {app.first_name}, Email: {app.email}")
        return True
    except Exception as e:
        print(f"[FAIL] Database error: {e}")
        return False

def test_create_zoom_meeting():
    """Test creating a Zoom meeting"""
    print("\n[*] Testing Zoom Meeting Creation...")
    try:
        zoom_data = ZoomService.create_meeting("Test Meeting - Admin Approval Test")
        if zoom_data:
            print("[PASS] Successfully created test Zoom meeting!")
            print(f"  Meeting ID: {zoom_data.get('id')}")
            print(f"  Join URL: {zoom_data.get('join_url')[:50]}...")
            return True
        else:
            print("[FAIL] Failed to create Zoom meeting")
            return False
    except Exception as e:
        print(f"[FAIL] Error creating meeting: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("ADMIN APPROVAL FUNCTIONALITY TEST")
    print("=" * 60)
    
    results = []
    results.append(("Zoom Credentials", test_zoom_credentials()))
    results.append(("Zoom OAuth Token", test_zoom_token()))
    results.append(("Email Configuration", test_email_config()))
    results.append(("Database Connection", test_database()))
    results.append(("Zoom Meeting Creation", test_create_zoom_meeting()))
    
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("SUCCESS: ALL TESTS PASSED! System is ready.")
    else:
        print("WARNING: SOME TESTS FAILED. Check errors above.")
    print("=" * 60)
