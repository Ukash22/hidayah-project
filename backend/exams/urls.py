# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'list', views.ExamViewSet, basename='exam')
router.register(r'results', views.ExamResultViewSet, basename='exam-result')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'assignments', views.ExamAssignmentViewSet, basename='exam-assignment')

urlpatterns = [
    path('', include(router.urls)),
]
