# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path
from .views import StudentProfileDetailView, ParentPortalView, AdminStudentViewSet, AdminStudentDetailView, TutorAssignedStudentsView, EnrollInCourseView, PromoteStudentView

urlpatterns = [
    path('me/', StudentProfileDetailView.as_view(), name='student-me'),
    path('children/', ParentPortalView.as_view(), name='parent-children'),
    path('tutor/my-students/', TutorAssignedStudentsView.as_view(), name='tutor_assigned_students'),
    path('enroll-subject/', EnrollInCourseView.as_view(), name='enroll_subject'),

    # Admin Student Management
    path('admin/all/', AdminStudentViewSet.as_view(), name='admin_student_list'),
    path('admin/<int:pk>/', AdminStudentDetailView.as_view(), name='admin_student_detail'),
    path('admin/<int:pk>/update/', AdminStudentDetailView.as_view(), name='admin_student_update'),
    path('admin/<int:pk>/promote/', PromoteStudentView.as_view(), name='admin_student_promote'),
]
