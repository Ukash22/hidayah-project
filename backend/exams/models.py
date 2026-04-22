# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class Exam(models.Model):
    EXAM_TYPES = (
        ('JAMB', 'JAMB'),
        ('WAEC', 'WAEC'),
        ('NECO', 'NECO'),
        ('JSSCE', 'JSSCE'),
        ('PRIMARY', 'Common Entrance (Primary)'),
        ('INTERNAL', 'Internal Assessment'),
    )
    
    title = models.CharField(max_length=200)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    subject = models.ForeignKey('programs.Subject', on_delete=models.CASCADE, related_name='exams')
    year = models.IntegerField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=60)
    is_active = models.BooleanField(default=True)
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_exams')
    
    def __str__(self):
        return f"{self.title} ({self.exam_type})"

class Question(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=(('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')))
    
    def __str__(self):
        return f"{self.exam.title} - {self.text[:50]}"

class ExamResult(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_results')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    score = models.DecimalField(max_digits=5, decimal_places=2)
    total_questions = models.IntegerField()
    date_taken = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.exam.title}: {self.score}"

class ExamAssignment(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='assignments')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_exams')
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_assignments')
    due_date = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} assigned {self.exam.title}"
