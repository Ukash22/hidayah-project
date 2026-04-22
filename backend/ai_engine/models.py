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
