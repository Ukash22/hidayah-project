# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.zoom_service import ZoomService

print("Testing Zoom Service...")
print(f"Account ID present: {bool(settings.ZOOM_ACCOUNT_ID)}")
print(f"Client ID present: {bool(settings.ZOOM_CLIENT_ID)}")
print(f"Client Secret present: {bool(settings.ZOOM_CLIENT_SECRET)}")

print("\nAttempting to get access token...")
token = ZoomService.get_access_token()
if token:
    print("Success: Access token retrieved.")
    print(f"Token length: {len(token)}")
    
    print("\nAttempting to create meeting...")
    meeting = ZoomService.create_meeting("Test Meeting")
    if meeting:
        print("Success: Meeting created.")
        print(f"Join URL: {meeting.get('join_url')}")
    else:
        print("Failed to create meeting.")
else:
    print("Failed to get access token.")
