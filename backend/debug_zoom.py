# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import sys
import django

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.zoom_service import ZoomService
from datetime import datetime, timedelta

def test_zoom():
    print("Testing Zoom Service...")
    topic = "Test Meeting"
    start_time = (datetime.utcnow() + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    duration = 30
    description = "Test Description"
    
    print(f"Attempting to create meeting at {start_time}")
    result = ZoomService.create_meeting(topic, start_time, duration, description)
    
    if result:
        print("Success! Meeting created:")
        print(f"ID: {result.get('id')}")
        print(f"Join URL: {result.get('join_url')}")
    else:
        print("Failed to create meeting. Check console for Zoom errors.")

if __name__ == "__main__":
    test_zoom()
