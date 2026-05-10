from django.urls import path
from .views import LibraryView

urlpatterns = [
    path('library/', LibraryView.as_view(), name='whiteboard-library'),
]
