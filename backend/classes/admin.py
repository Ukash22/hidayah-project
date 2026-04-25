# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import ScheduledSession, RescheduleRequest, WhiteboardSession, Booking

@admin.register(ScheduledSession)
class ScheduledSessionAdmin(admin.ModelAdmin):
    list_display = ('student', 'tutor', 'subject', 'scheduled_at', 'status', 'payout_status')
    list_filter = ('status', 'payout_status', 'scheduled_at')
    search_fields = ('student__username', 'tutor__username', 'subject__name')

@admin.register(RescheduleRequest)
class RescheduleRequestAdmin(admin.ModelAdmin):
    list_display = ('initiated_by', 'requested_date', 'requested_time', 'status', 'created_at')
    list_filter = ('status', 'initiated_by', 'created_at')

@admin.register(WhiteboardSession)
class WhiteboardSessionAdmin(admin.ModelAdmin):
    list_display = ('session', 'created_at')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('student', 'tutor', 'subject', 'price', 'approved', 'paid', 'created_at')
    list_filter = ('approved', 'paid', 'created_at')
    search_fields = ('student__username', 'tutor__username', 'subject')
