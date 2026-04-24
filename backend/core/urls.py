# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("Backend is running properly.")

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('applications.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/students/', include('students.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/tutors/', include('tutors.urls')),
    path('api/classes/', include('classes.urls')),
    path('api/complaints/', include('feedback.urls')),
    path('api/curriculum/', include('curriculum.urls')),
    
    # New HITIS Routes
    # New HITIS Routes
    path('api/scheduling/', include('scheduling.urls')),
    path('api/exams/', include('exams.urls')),
    path('api/ai/', include('ai_engine.urls')),
    path('api/programs/', include('programs.urls')),
    path('api/parents/', include('parents.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
