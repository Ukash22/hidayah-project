# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import TrialApplication, ZoomClass

@admin.register(TrialApplication)
class TrialApplicationAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'email', 'phone', 'status', 'action_buttons', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['first_name', 'email', 'phone']
    readonly_fields = ['created_at']
    actions = ['make_approved', 'make_rejected']

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:application_id>/approve/',
                self.admin_site.admin_view(self.approve_application),
                name='application-approve',
            ),
            path(
                '<int:application_id>/reject/',
                self.admin_site.admin_view(self.reject_application),
                name='application-reject',
            ),
        ]
        return custom_urls + urls

    def action_buttons(self, obj):
        from django.utils.html import format_html
        from django.urls import reverse
        
        if obj.status.lower() == 'pending':
            approve_url = reverse('admin:application-approve', args=[obj.id])
            reject_url = reverse('admin:application-reject', args=[obj.id])
            return format_html(
                '<a class="button" href="{}" style="background-color: #28a745; color: white; padding: 5px 10px; border-radius: 4px; margin-right: 5px;">Approve</a>'
                '<a class="button" href="{}" style="background-color: #dc3545; color: white; padding: 5px 10px; border-radius: 4px;">Reject</a>',
                approve_url,
                reject_url
            )
        return format_html('<span style="color: grey;">{}</span>', obj.status.title())
    action_buttons.short_description = 'Actions'
    action_buttons.allow_tags = True

    def approve_application(self, request, application_id):
        from django.shortcuts import get_object_or_404, redirect
        from django.contrib import messages
        from .zoom_service import ZoomService
        from django.conf import settings
        from django.core.mail import send_mail

        application = get_object_or_404(TrialApplication, pk=application_id)
        
        if application.status == 'approved':
            messages.warning(request, f"Application for {application.first_name} is already approved.")
            return redirect('admin:applications_trialapplication_changelist')

        zoom_data = ZoomService.create_meeting(f"Trial Class for {application.first_name}")
        
        if zoom_data:
            ZoomClass.objects.create(
                application=application,
                meeting_id=zoom_data.get('id'),
                join_url=zoom_data.get('join_url'),
                start_url=zoom_data.get('start_url'),
                password=zoom_data.get('password')
            )
            
            application.status = 'approved'
            application.save()
            
            try:
                subject = "Your Free Trial Class at Hidayah e Madarasah International"
                message = f"Assalamu Alaikum {application.first_name},\n\nYour free trial class has been approved!\n\nMeeting Link: {zoom_data.get('join_url')}\nPassword: {zoom_data.get('password') or 'None'}\n\nPlease join on time.\n\nBest Regards,\nHidayah Admin"
                send_mail(subject, message, settings.EMAIL_HOST_USER, [application.email])
                messages.success(request, f"Application approved! Zoom meeting created and email sent to {application.email}.")
            except Exception as e:
                messages.warning(request, f"Application approved but email failed: {e}")
        else:
            messages.error(request, "Failed to create Zoom meeting. Please check Zoom credentials.")

        return redirect('admin:applications_trialapplication_changelist')

    def reject_application(self, request, application_id):
        from django.shortcuts import get_object_or_404, redirect
        from django.contrib import messages
        from django.conf import settings
        from django.core.mail import send_mail

        application = get_object_or_404(TrialApplication, pk=application_id)
        application.status = 'rejected'
        application.save()
        
        try:
            subject = "Update regarding your Trial Class at Hidayah e Madarasah International"
            message = f"Assalamu Alaikum {application.first_name},\n\nThank you for your interest. Unfortunately, we are unable to approve your trial class at this time.\n\nBest Regards,\nHidayah Admin"
            send_mail(subject, message, settings.EMAIL_HOST_USER, [application.email])
            messages.success(request, f"Application rejected and email sent to {application.email}.")
        except Exception as e:
            messages.warning(request, f"Application rejected but email failed: {e}")

        return redirect('admin:applications_trialapplication_changelist')

    def make_approved(self, request, queryset):
        success_count = 0
        for application in queryset:
            if application.status == 'approved':
                continue
            
            # Create Zoom Meeting
            from .zoom_service import ZoomService
            from django.conf import settings
            from django.core.mail import send_mail
            
            zoom_data = ZoomService.create_meeting(f"Trial Class for {application.first_name}")
            
            if zoom_data:
                ZoomClass.objects.create(
                    application=application,
                    meeting_id=zoom_data.get('id'),
                    join_url=zoom_data.get('join_url'),
                    start_url=zoom_data.get('start_url'),
                    password=zoom_data.get('password')
                )
                
                application.status = 'approved'
                application.save()
                
                try:
                    subject = "Your Free Trial Class at Hidayah e Madarasah International"
                    message = f"Assalamu Alaikum {application.first_name},\n\nYour free trial class has been approved!\n\nMeeting Link: {zoom_data.get('join_url')}\nPassword: {zoom_data.get('password') or 'None'}\n\nPlease join on time.\n\nBest Regards,\nHidayah Admin"
                    send_mail(subject, message, settings.EMAIL_HOST_USER, [application.email])
                    success_count += 1
                except Exception as e:
                    self.message_user(request, f"Error sending email to {application.email}: {e}", level='error')
        
        self.message_user(request, f"{success_count} application(s) approved and Zoom meetings created.")
    make_approved.short_description = "Approve selected applications (Create Zoom + Email)"

    def make_rejected(self, request, queryset):
        from django.conf import settings
        from django.core.mail import send_mail
        
        count = 0
        for application in queryset:
            application.status = 'rejected'
            application.save()
            count += 1
            
            try:
                subject = "Update regarding your Trial Class at Hidayah e Madarasah International"
                message = f"Assalamu Alaikum {application.first_name},\n\nThank you for your interest. Unfortunately, we are unable to approve your trial class at this time.\n\nBest Regards,\nHidayah Admin"
                send_mail(subject, message, settings.EMAIL_HOST_USER, [application.email])
            except Exception as e:
                pass
                
        self.message_user(request, f"{count} application(s) rejected and emails sent.")
    make_rejected.short_description = "Reject selected applications"

@admin.register(ZoomClass)
class ZoomClassAdmin(admin.ModelAdmin):
    list_display = ['application', 'meeting_id', 'created_at']
    readonly_fields = ['created_at']
