# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorRequestViewSet

router = DefaultRouter()
router.register(r'requests', TutorRequestViewSet, basename='tutor-request')

urlpatterns = [
    path('', include(router.urls)),
]
