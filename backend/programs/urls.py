# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgramViewSet, SubjectViewSet

router = DefaultRouter()
router.register(r'', ProgramViewSet, basename='program')
router.register(r'subjects', SubjectViewSet, basename='subject')

urlpatterns = [
    path('', include(router.urls)),
]
