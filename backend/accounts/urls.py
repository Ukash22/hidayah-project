# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, UserProfileView, TutorListView, ApproveStudentView, PendingStudentListView, RequestPasswordResetView, SetNewPasswordView, NotificationListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('tutors/', TutorListView.as_view(), name='tutor_list'),
    path('pending-students/', PendingStudentListView.as_view(), name='pending_students'),
    path('approve-student/<int:pk>/', ApproveStudentView.as_view(), name='approve_student'),
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', SetNewPasswordView.as_view(), name='password_reset_confirm'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/<int:pk>/read/', NotificationListView.as_view(), name='notification_read'),
]
