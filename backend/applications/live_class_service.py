# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import random
import string
import hashlib
import time

from django.conf import settings

class LiveClassService:
    @staticmethod
    def generate_meeting_id():
        """Generate a unique meeting ID for the internal live classroom"""
        random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        timestamp = str(int(time.time()))
        unique_id = hashlib.md5((random_str + timestamp).encode()).hexdigest()[:12]
        return f"room_{unique_id}"

    @staticmethod
    def create_meeting(topic):
        """
        Generates an internal meeting link for the Hidayah Live Classroom.
        """
        room_name = LiveClassService.generate_meeting_id()
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        join_url = f"{frontend_url}/live/{room_name}"
        
        return {
            "id": room_name,
            "join_url": join_url,
            "start_url": join_url,
            "room_name": room_name,
            "whiteboard_url": join_url # Both video and whiteboard are in the same room
        }
