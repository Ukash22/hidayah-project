# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import TutorProfile, TutorAvailability, TutorDiscipline

@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'mode', 'is_public', 'is_blocked', 'created_at')
    list_filter = ('status', 'mode', 'is_public', 'is_blocked')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'subjects_to_teach')

@admin.register(TutorAvailability)
class TutorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('tutor', 'day', 'start_time', 'end_time')
    list_filter = ('day',)

@admin.register(TutorDiscipline)
class TutorDisciplineAdmin(admin.ModelAdmin):
    list_display = ('tutor', 'discipline_type', 'subject', 'date_issued')
    list_filter = ('discipline_type', 'date_issued')
    search_fields = ('tutor__username', 'subject')
