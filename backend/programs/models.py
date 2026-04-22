# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models

class Program(models.Model):
    PROGRAM_TYPES = (
        ('ISLAMIC', 'Islamic Education'),
        ('WESTERN', 'Western Education'),
        ('EXAM_PREP', 'Exam Preparation'),
    )
    
    name = models.CharField(max_length=100)
    program_type = models.CharField(max_length=20, choices=PROGRAM_TYPES)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_program_type_display()})"

class Subject(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    admin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=5.00, help_text="Default admin commission (%) for this subject")
    
    def __str__(self):
        return f"{self.name} - {self.program.name}"
