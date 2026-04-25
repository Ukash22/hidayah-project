# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Notification

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_parent_account', 'is_verified')
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'dob', 'gender', 'country', 'timezone', 'preferred_language', 'admission_number', 'is_parent_account', 'is_verified')}),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__username', 'title', 'message')
