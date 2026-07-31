# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models

class AIGeneratedQuestion(models.Model):
    EXAM_TYPES = (
        ('JAMB', 'JAMB'),
        ('WAEC', 'WAEC'),
        ('NECO', 'NECO'),
    )
    
    subject = models.ForeignKey('programs.Subject', on_delete=models.CASCADE)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    year_range = models.CharField(max_length=50, help_text="e.g. 2010-2023")
    content = models.JSONField(help_text="Generated questions in JSON format")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"AI {self.exam_type} {self.subject.name} - {self.created_at.date()}"


class PracticeSet(models.Model):
    """A saved set of AI-generated questions belonging to one student."""
    from django.conf import settings as _s
    owner = models.ForeignKey(_s.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='practice_sets')
    title = models.CharField(max_length=200)
    subject_name = models.CharField(max_length=100, blank=True)
    exam_type = models.CharField(max_length=20, blank=True)
    questions = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.owner.username}"
