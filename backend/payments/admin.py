# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import Payment, PricingTier

@admin.register(PricingTier)
class PricingTierAdmin(admin.ModelAdmin):
    list_display = ('class_type', 'hourly_rate', 'is_active', 'created_at')
    list_filter = ('is_active', 'class_type')
    search_fields = ('class_type', 'description')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'amount', 'status', 'payment_method', 'created_at', 'completed_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('student__username', 'student__email', 'transaction_id', 'gateway_reference')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    
    actions = ['mark_as_completed']
    
    def mark_as_completed(self, request, queryset):
        """Admin action to manually verify payments"""
        count = 0
        for payment in queryset:
            if payment.status == 'PENDING':
                payment.mark_as_completed()
                count += 1
        self.message_user(request, f'{count} payment(s) marked as completed.')
    mark_as_completed.short_description = "Mark selected payments as completed"
