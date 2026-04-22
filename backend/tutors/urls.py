# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorViewSet

router = DefaultRouter()
router.register(r'', TutorViewSet, basename='tutor')

urlpatterns = [
    path('', include(router.urls)),
]
