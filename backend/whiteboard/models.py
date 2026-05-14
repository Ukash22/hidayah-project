from django.db import models
from django.conf import settings
from classes.models import ScheduledSession

class LiveWhiteboardSession(models.Model):
    session = models.ForeignKey(ScheduledSession, on_delete=models.CASCADE, related_name='live_boards')
    room_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

class LiveBoardSnapshot(models.Model):
    session = models.ForeignKey(LiveWhiteboardSession, on_delete=models.CASCADE, related_name='snapshots')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_snapshots')
    image_data = models.TextField() # Base64 data
    created_at = models.DateTimeField(auto_now_add=True)

class SavedWhiteboard(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_boards')
    title = models.CharField(max_length=255)
    snapshot = models.JSONField() # Store tldraw snapshot
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.teacher.email}"
