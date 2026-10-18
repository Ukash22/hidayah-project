# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def health_check(request):
    from django.contrib.auth import get_user_model
    from django.db.migrations.recorder import MigrationRecorder
    User = get_user_model()
    try:
        admin_user = User.objects.filter(username__iexact='admin').first() or User.objects.filter(role='ADMIN').first()
        m_applied = MigrationRecorder.Migration.objects.filter(app='accounts', name='0006_promote_admin_user').exists()
        if admin_user:
            status_str = f"id={admin_user.id}, user={admin_user.username}, email={admin_user.email}, m0006={m_applied}"
        else:
            status_str = f"not_found, m0006={m_applied}"
    except Exception as e:
        status_str = f"error: {e}"
    return HttpResponse(f"Backend is running properly. Admin: {status_str}")

def favicon_view(request):
    return HttpResponse(status=204)

urlpatterns = [
    path('', health_check),
    path('favicon.ico', favicon_view),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/', include('applications.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/students/', include('students.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/tutors/', include('tutors.urls')),
    path('api/classes/', include('classes.urls')),
    path('api/complaints/', include('feedback.urls')),
    path('api/curriculum/', include('curriculum.urls')),
    
    # New HITIS Routes
    path('api/scheduling/', include('scheduling.urls')),
    path('api/exams/', include('exams.urls')),
    path('api/ai/', include('ai_engine.urls')),
    path('api/programs/', include('programs.urls')),
    path('api/parents/', include('parents.urls')),
    path('api/whiteboard/', include('whiteboard.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
