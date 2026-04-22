# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class PricingTier(models.Model):
    """Hourly rate pricing for different class types"""
    CLASS_TYPE_CHOICES = (
        ('ONE_ON_ONE', 'One-on-One Class'),
        ('GROUP', 'Group Class'),
    )
    
    class_type = models.CharField(max_length=20, choices=CLASS_TYPE_CHOICES, unique=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_class_type_display()} - ₦{self.hourly_rate}/hr"
    
    class Meta:
        verbose_name = "Pricing Tier"
        verbose_name_plural = "Pricing Tiers"


class Payment(models.Model):
    """Track all payment transactions"""
    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    )
    
    PAYMENT_METHOD_CHOICES = (
        ('PAYSTACK', 'Paystack'),
        ('BANK_TRANSFER', 'Bank Transfer'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    # Gateway-specific fields
    transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    gateway_reference = models.CharField(max_length=255, null=True, blank=True)
    
    # Metadata
    payment_metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.student.username} - ₦{self.amount} ({self.status})"
    
    def mark_as_completed(self):
        """Mark payment as completed and update timestamp"""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.save()
    
    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Wallet of {self.user.username} - Balance: {self.balance}"

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ('DEPOSIT', 'Deposit'),
        ('SESSION_DEBIT', 'Session Debit (Student)'),
        ('SESSION_PAYOUT', 'Session Payout (Tutor)'),
        ('WITHDRAWAL', 'Withdrawal'),
        ('COMMISSION', 'Internal Commission'),
        ('REFUND', 'Refund'),
        ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    description = models.TextField()
    reference = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} for {self.user.username}: {self.amount}"

class Withdrawal(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    tutor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='withdrawals')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Bank Details
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=20, blank=True, null=True)
    account_name = models.CharField(max_length=150, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Withdrawal for {self.tutor.username}: {self.amount} ({self.status})"


class PlatformSettings(models.Model):
    """Singleton model for global platform settings"""
    default_commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.00,
        help_text="Global default platform commission (%) if no tutor or subject override exists."
    )
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"

    def save(self, *args, **kwargs):
        self.pk = 1 # Force singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Global Platform Settings (Default Comm: {self.default_commission_percentage}%)"
