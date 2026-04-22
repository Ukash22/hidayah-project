# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class LearningMaterial(models.Model):
    MATERIAL_TYPES = (
        ('VIDEO', 'Video Lesson'),
        ('PDF', 'PDF Document'),
        ('AUDIO', 'Audio Recitation'),
        ('LINK', 'External Link'),
    )

    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    material_type = models.CharField(max_length=10, choices=MATERIAL_TYPES)
    
    # File storage (Cloudinary)
    file = models.FileField(upload_to='learning_materials/', blank=True, null=True)
    external_url = models.URLField(blank=True, null=True, help_text="For external links or YouTube videos")
    
    # Specific Assignment (Multiple Students)
    assigned_students = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='assigned_materials', help_text="If set, only these students can see this material")
    
    # Metadata
    thumbnail = models.ImageField(upload_to='material_thumbnails/', blank=True, null=True)
    is_public = models.BooleanField(default=False, help_text="Visible to all visitors")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.material_type}) - {self.tutor.get_full_name()}"
