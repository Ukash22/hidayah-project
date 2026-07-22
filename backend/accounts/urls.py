# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, LoginView, LogoutView, ChangePasswordView, CookieTokenRefreshView, UserProfileView, TutorListView, ApproveStudentView, PendingStudentListView, RequestPasswordResetView, SetNewPasswordView, NotificationListView, UserManagementViewSet

router = DefaultRouter()
router.register(r'admin/users', UserManagementViewSet, basename='user_management')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('password/change/', ChangePasswordView.as_view(), name='password_change'),
    path('refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('tutors/', TutorListView.as_view(), name='tutor_list'),
    path('pending-students/', PendingStudentListView.as_view(), name='pending_students'),
    path('approve-student/<int:pk>/', ApproveStudentView.as_view(), name='approve_student'),
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', SetNewPasswordView.as_view(), name='password_reset_confirm'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/<int:pk>/read/', NotificationListView.as_view(), name='notification_read'),
]
