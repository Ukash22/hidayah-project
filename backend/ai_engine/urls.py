# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIQuestionViewSet, PracticeSetView

router = DefaultRouter()
router.register(r'questions', AIQuestionViewSet, basename='ai-question')

urlpatterns = [
    path('', include(router.urls)),
    path('practice-sets/', PracticeSetView.as_view(), name='practice-set-list'),
    path('practice-sets/<int:pk>/', PracticeSetView.as_view(), name='practice-set-detail'),
]
