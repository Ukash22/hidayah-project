# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIQuestionViewSet

router = DefaultRouter()
router.register(r'questions', AIQuestionViewSet, basename='ai-question')

urlpatterns = [
    path('', include(router.urls)),
]
