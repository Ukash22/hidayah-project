# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import StudentProfile, Enrollment

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'level', 'approval_status', 'payment_status', 'total_amount')
    list_filter = ('approval_status', 'payment_status', 'level')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'enrolled_course')

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'subject', 'tutor', 'status', 'enrolled_at')
    list_filter = ('status', 'subject', 'enrolled_at')
    search_fields = ('student__user__username', 'subject__name', 'tutor__username')
