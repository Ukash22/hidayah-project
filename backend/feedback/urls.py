# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from .views import (
    FileComplaintView,
    AdminComplaintManagementView
)

urlpatterns = [
    path('file/', FileComplaintView.as_view(), name='file_complaint'),
    path('my/', FileComplaintView.as_view(), name='my_complaints'),
    path('admin/all/', AdminComplaintManagementView.as_view(), name='admin_complaints'),
    path('admin/<int:complaint_id>/resolve/', AdminComplaintManagementView.as_view(), name='admin_complaint_resolve'),
]
