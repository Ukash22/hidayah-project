# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LearningMaterialViewSet

router = DefaultRouter()
router.register(r'materials', LearningMaterialViewSet, basename='material')

urlpatterns = [
    path('', include(router.urls)),
]
