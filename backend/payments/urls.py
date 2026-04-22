# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from .views import (
    InitiatePaymentView,
    VerifyPaymentView,
    PaystackWebhookView,
    PaymentStatusView,
    PricingTiersView,
    AdminWalletActionView,
    AdminTransactionListView,
    StudentWalletTransactionView,
    InitiateBookingPaymentView,
    VerifyBookingPaymentView,
    TutorWalletView,
    WithdrawalRequestView,
    AdminWithdrawalApprovalView,
    AdminPaymentAnalyticsView,
    AdminFinancialStatsView,
    TutorFinancialsView,
    AdminPlatformSettingsView
)

urlpatterns = [
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('verify/<str:reference>/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('status/', PaymentStatusView.as_view(), name='payment-status'),
    path('pricing/', PricingTiersView.as_view(), name='pricing-tiers'),
    path('wallet/transactions/', StudentWalletTransactionView.as_view(), name='student_transactions'),
    
    # Admin Financials
    path('booking/initiate/<int:booking_id>/', InitiateBookingPaymentView.as_view(), name='initiate_booking_payment'),
    path('booking/verify/<str:reference>/', VerifyBookingPaymentView.as_view(), name='verify_booking_payment'),
    path('verify/<str:reference>/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('admin/financials/', AdminFinancialStatsView.as_view(), name='admin-financials'),
    path('tutor/wallet/', TutorWalletView.as_view(), name='tutor_wallet'),
    path('tutor/financials/', TutorFinancialsView.as_view(), name='tutor-financials'),
    path('tutor/withdrawal/', WithdrawalRequestView.as_view(), name='tutor_withdrawal'),
    
    # Admin Financials
    path('admin/wallet-action/', AdminWalletActionView.as_view(), name='admin_wallet_action'),
    path('admin/transactions/', AdminTransactionListView.as_view(), name='admin_transaction_list'),
    path('admin/withdrawal/approve/<int:withdrawal_id>/', AdminWithdrawalApprovalView.as_view(), name='admin_withdrawal_approve'),
    path('admin/withdrawals/pending/', AdminWithdrawalApprovalView.as_view(), name='admin_pending_withdrawals'),
    path('admin/analytics/', AdminPaymentAnalyticsView.as_view(), name='admin_payment_analytics'),
    path('admin/settings/', AdminPlatformSettingsView.as_view(), name='admin_platform_settings'),
]
