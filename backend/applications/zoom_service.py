# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import requests
import base64
from django.conf import settings

class ZoomService:
    @staticmethod
    def get_access_token():
        client_id = settings.ZOOM_CLIENT_ID.strip() if settings.ZOOM_CLIENT_ID else ""
        client_secret = settings.ZOOM_CLIENT_SECRET.strip().replace(" ", "") if settings.ZOOM_CLIENT_SECRET else ""
        account_id = settings.ZOOM_ACCOUNT_ID.strip() if settings.ZOOM_ACCOUNT_ID else ""
        
        url = f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={account_id}"
        
        # Base64 encode client_id:client_secret
        auth_str = f"{client_id}:{client_secret}"

        auth_base64 = base64.b64encode(auth_str.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_base64}"
        }
        
        response = requests.post(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"Zoom Auth Error: {response.text}")
            return None

    @staticmethod
    def create_meeting(topic, start_time=None, duration=40, description=""):
        token = ZoomService.get_access_token()
        if not token:
            return None
        
        url = "https://api.zoom.us/v2/users/me/meetings"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        if start_time and 'T' in start_time:
            # Zoom doesn't like milliseconds (.000Z)
            start_time = start_time.split('.')[0]
            if not start_time.endswith('Z'):
                start_time += 'Z'

        data = {
            "topic": topic,
            "agenda": description, 
            "type": 2, # Scheduled meeting
            "start_time": start_time,
            "duration": duration,
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": False,
                "mute_upon_entry": True
            }
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 201:
            return response.json()
        else:
            print(f"Zoom Meeting Creation Error: {response.text}")
            return None
