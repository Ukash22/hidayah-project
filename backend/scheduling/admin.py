# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import TutorRequest

@admin.register(TutorRequest)
class TutorRequestAdmin(admin.ModelAdmin):
    list_display = ('student', 'tutor', 'subject', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('student__username', 'tutor__username', 'subject__name')
