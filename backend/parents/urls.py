# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ParentViewSet

router = DefaultRouter()
router.register(r'dashboard', ParentViewSet, basename='parent-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
