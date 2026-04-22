# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from .views import ApplicationCreateView, ApproveApplicationView, ApplicationListView, RejectApplicationView, ApplicationUpdateView, MyClassesView, TutorScheduleView, JoinClassView, CompleteSessionView, AdminReleasePayoutView, PendingPayoutsView

urlpatterns = [
    path('applications/', ApplicationCreateView.as_view(), name='create-application'),
    path('admin/applications/', ApplicationListView.as_view(), name='list-applications'),
    path('admin/applications/<int:pk>/approve/', ApproveApplicationView.as_view(), name='approve-application'),
    path('admin/applications/<int:pk>/reject/', RejectApplicationView.as_view(), name='reject-application'),
    path('admin/applications/<int:pk>/update/', ApplicationUpdateView.as_view(), name='update-application'),
    path('applications/student/my-classes/', MyClassesView.as_view(), name='student-classes'),
    path('applications/tutor/schedule/', TutorScheduleView.as_view(), name='tutor-schedule'),
    path('student/classes/<int:pk>/join/', JoinClassView.as_view(), name='join-class'),
    path('admin/classes/pending-payouts/', PendingPayoutsView.as_view(), name='pending-payouts'),
    path('admin/classes/<int:pk>/release-payout/', AdminReleasePayoutView.as_view(), name='release-payout'),
]
