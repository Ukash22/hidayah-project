# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import random
import string
import hashlib
import time

class JitsiService:
    @staticmethod
    def generate_meeting_id():
        """Generate a random unique meeting ID for Jitsi"""
        random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        timestamp = str(int(time.time()))
        unique_id = hashlib.md5((random_str + timestamp).encode()).hexdigest()[:12]
        return f"HidayahClass_{unique_id}"

    @staticmethod
    def create_meeting(topic):
        """
        For Jitsi, 'creating' a meeting is just generating a URL.
        However, we return a dict to match the structure expected by the views.
        """
        room_name = JitsiService.generate_meeting_id()
        # You can append config variables to enable things like whiteboard if using the web URL
        # But usually these are set in the Jitsi API on the frontend.
        base_url = "https://meet.jit.si"
        join_url = f"{base_url}/{room_name}"
        
        return {
            "id": room_name,
            "join_url": join_url,
            "start_url": join_url, # For Jitsi, start and join are the same
            "room_name": room_name,
            "whiteboard_url": f"https://excalidraw.com/#room={room_name}" # Example of linking to a unique excalidraw room
        }
