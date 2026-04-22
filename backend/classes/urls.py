# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from .views import (
    StudentRescheduleRequestView,
    TutorRescheduleRequestView,
    AdminRescheduleApprovalView,
    AdminClassListView,
    AdminUnifiedClassListView,
    SessionStartView,
    TrialStartView,
    BookingRequestView,
    BookingApprovalView,
    AdminBookingRequestView,
    SessionCompleteView,
    UserSessionListView,
    BackfillSessionsView,
)

urlpatterns = [
    path('student/reschedule/', StudentRescheduleRequestView.as_view(), name='student_reschedule'),
    path('tutor/reschedule/', TutorRescheduleRequestView.as_view(), name='tutor_reschedule'),
    path('admin/reschedule/<int:request_id>/action/', AdminRescheduleApprovalView.as_view(), name='admin_reschedule_action'),
    path('admin/all/', AdminClassListView.as_view(), name='admin_class_list'),
    path('admin/unified-list/', AdminUnifiedClassListView.as_view(), name='admin_unified_class_list'),
    path('session/<int:session_id>/start/', SessionStartView.as_view(), name='session_start'),
    path('trial/<int:trial_id>/start/', TrialStartView.as_view(), name='trial_start'),
    path('booking/request/', BookingRequestView.as_view(), name='booking_request'),
    path('booking/approval/', BookingApprovalView.as_view(), name='booking_approval_list'),
    path('booking/<int:booking_id>/approve/', BookingApprovalView.as_view(), name='booking_approve'),
    path('booking/<int:booking_id>/reject/', BookingApprovalView.as_view(), name='booking_reject'),
    path('admin/bookings/', AdminBookingRequestView.as_view(), name='admin_pending_bookings'),
    path('admin/bookings/<int:booking_id>/action/', AdminBookingRequestView.as_view(), name='admin_booking_action'),
    path('session/<int:session_id>/complete/', SessionCompleteView.as_view(), name='session_complete'),
    path('sessions/', UserSessionListView.as_view(), name='user_sessions'),
    path('admin/backfill-sessions/', BackfillSessionsView.as_view(), name='backfill_sessions'),
]
