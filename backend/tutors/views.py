# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import django_filters
from rest_framework import viewsets, filters
from rest_framework.pagination import LimitOffsetPagination
import logging
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

logger = logging.getLogger(__name__)
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from .models import TutorProfile
from .serializers import TutorProfileSerializer
import cloudinary
import cloudinary.utils
import time

class TutorFilter(django_filters.FilterSet):
    subject_name = django_filters.CharFilter(field_name='subjects__name', lookup_expr='icontains')
    program_type = django_filters.CharFilter(field_name='subjects__program__program_type')
    min_rate = django_filters.NumberFilter(field_name='rate_per_month', lookup_expr='gte')
    max_rate = django_filters.NumberFilter(field_name='rate_per_month', lookup_expr='lte')
    
    class Meta:
        model = TutorProfile
        fields = ['mode', 'state', 'city', 'status']

class TutorViewSet(viewsets.ModelViewSet):
    queryset = TutorProfile.objects.all().select_related('user').prefetch_related('subjects', 'availabilities')
    serializer_class = TutorProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, filters.SearchFilter]
    filterset_class = TutorFilter
    search_fields = ['user__first_name', 'user__last_name', 'qualification', 'city', 'state']
    
    @action(detail=False, methods=['get'], permission_classes=[])
    def cloudinary_signature(self, request):
        """Generate a signed upload signature for frontend direct-to-cloud uploads."""
        try:
            timestamp = int(time.time())
            folder = request.query_params.get('folder', 'tutor_media')
            
            if not hasattr(settings, 'CLOUDINARY_STORAGE') or not settings.CLOUDINARY_STORAGE.get('API_SECRET'):
                return Response({
                    "error": "Cloudinary is not configured on the server. Please check environment variables (CLOUDINARY_API_SECRET)."
                }, status=500)
            
            params = {
                'timestamp': timestamp,
                'folder': folder,
            }
            
            signature = cloudinary.utils.api_sign_request(
                params, 
                settings.CLOUDINARY_STORAGE['API_SECRET']
            )
            
            return Response({
                'signature': signature,
                'timestamp': timestamp,
                'cloud_name': settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
                'api_key': settings.CLOUDINARY_STORAGE['API_KEY'],
            })
        except Exception as e:
            logger.error("Cloudinary signature generation failed: %s", e)
            return Response({"error": "Failed to generate upload signature."}, status=500)
    
    def get_serializer_class(self):
        # Use lightweight serializer for lists and public views to improve performance
        if self.action in ['list', 'public', 'by_subject']:
            from .serializers import LiteTutorSerializer
            return LiteTutorSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        # Admin-only workflow endpoints — the viewset default (IsAuthenticatedOrReadOnly)
        # would otherwise expose these to any user (admin_list even to anonymous GETs).
        from rest_framework.permissions import IsAdminUser
        if self.action in ['admin_list', 'admin_action', 'manage', 'assign',
                           'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], permission_classes=[])
    def public(self, request):
        """High-performance landing page tutors list"""
        # queryset already optimized with select/prefetch in get_queryset
        queryset = self.get_queryset().filter(status='APPROVED').order_by('-created_at')[:6]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[])
    def me(self, request):
        """Endpoint for the logged-in tutor to fetch their own profile regardless of status"""
        if not request.user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=401)
        try:
            profile = TutorProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=404)

    @action(detail=False, methods=['put'], url_path='me/availability')
    def set_availability(self, request):
        """Tutor replaces their own availability slots (post-registration editing)."""
        if not request.user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=401)
        try:
            profile = TutorProfile.objects.get(user=request.user)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=404)

        slots = request.data.get('slots', [])
        if not isinstance(slots, list):
            return Response({"error": "slots must be a list"}, status=400)
        cleaned = []
        for s in slots:
            day = str(s.get('day', '')).strip().upper()
            start = s.get('start_time') or s.get('startTime')
            end = s.get('end_time') or s.get('endTime')
            if day and start and end:
                cleaned.append((day, start, end))
        if not cleaned:
            return Response({"error": "Provide at least one complete slot (day, start_time, end_time)."}, status=400)

        from .models import TutorAvailability
        from django.db import transaction
        with transaction.atomic():
            profile.availabilities.all().delete()
            for day, start, end in cleaned:
                TutorAvailability.objects.create(tutor=profile, day=day, start_time=start, end_time=end)
            profile.availability_days = ", ".join(sorted({d.capitalize() for d, _, _ in cleaned}))
            profile.save(update_fields=['availability_days'])

        from .serializers import TutorAvailabilitySerializer
        return Response({
            "message": "Availability updated.",
            "availabilities": TutorAvailabilitySerializer(profile.availabilities.all(), many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='admin/list')
    def admin_list(self, request):
        """Optimized admin list view for recruiter oversight."""
        from payments.models import Wallet
        queryset = TutorProfile.objects.all().select_related('user').prefetch_related('subjects')
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        tutor_list = list(queryset)
        user_ids = [t.user_id for t in tutor_list]

        # Bulk wallet lookup — avoids one Wallet.objects.get_or_create() per tutor in the loop
        wallets = {w.user_id: w.balance for w in Wallet.objects.filter(user_id__in=user_ids)}

        from .serializers import resolve_media_url

        def safe_url(f):
            url = resolve_media_url(f)
            if url and not url.startswith('http'):
                return request.build_absolute_uri(url)
            return url

        data = []
        for t in tutor_list:
            data.append({
                'id': t.id,
                'user_id': t.user.id,
                'name': t.user.get_full_name(),
                'email': t.user.email,
                'phone': t.phone_number,
                'status': t.status,
                'subjects': t.subjects_to_teach,
                'experience': t.experience_years,
                'hourly_rate': str(t.hourly_rate),
                'created_at': t.created_at,
                'image_url': safe_url(t.image),
                'cv_url': safe_url(t.cv_resume),
                'wallet_balance': str(wallets.get(t.user_id, 0)),
                'commission_percentage': t.commission_percentage,
            })
        return Response(data)

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache_key = f"tutor_list:{request.query_params.urlencode()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=300)
        return response

    @action(detail=False, methods=['post'], url_path=r'admin/action/(?P<app_id>\d+)')
    def admin_action(self, request, app_id=None):
        """Admin recruitment workflow: INTERVIEW, APPROVE, REJECT"""
        from applications.live_class_service import LiveClassService
        from core.dispatch import run_async
        from core.tasks import send_tutor_email_task
        
        try:
            profile = TutorProfile.objects.get(id=app_id)
            action_type = request.data.get('action')
            
            if action_type == 'INTERVIEW':
                interview_at = request.data.get('interview_at')
                interview_link = request.data.get('interview_link', '')
                generate_zoom = request.data.get('generate_zoom', False)
                
                if generate_zoom:
                    topic = f"Interview with {profile.user.get_full_name()}"
                    meeting_data = LiveClassService.create_meeting(topic)
                    interview_link = meeting_data.get('join_url')
                
                profile.status = 'INTERVIEW_SCHEDULED'
                profile.interview_at = interview_at
                profile.interview_link = interview_link
                profile.save()

                run_async(send_tutor_email_task, profile.user.pk, profile.pk, 'INTERVIEW', '', interview_link)
                return Response({"message": "Interview scheduled", "link": interview_link})
                
            elif action_type == 'APPROVE':
                profile.status = 'APPROVED'
                profile.save()
                run_async(send_tutor_email_task, profile.user.pk, profile.pk, 'APPROVE')
                return Response({"message": "Tutor approved"})

            elif action_type == 'REJECT':
                reason = request.data.get('reason', '')
                profile.status = 'REJECTED'
                profile.rejection_reason = reason
                profile.save()
                run_async(send_tutor_email_task, profile.user.pk, profile.pk, 'REJECT', reason)
                return Response({"message": "Tutor rejected"})
                
            return Response({"error": "Invalid action"}, status=400)
            
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=404)
        except Exception:
            logger.exception("Tutor admin action failed")
            return Response({"error": "Action failed. Please check server logs."}, status=400)


    @action(detail=False, methods=['post'], permission_classes=[])
    def register(self, request):
        """Tutor application. Validation + creation live in TutorRegisterSerializer;
        this endpoint keeps the legacy {'detail': msg} error shape."""
        from .serializers import TutorRegisterSerializer

        # Never log request.data here — it contains the plaintext password.
        logger.info("Tutor registration attempt: username=%s", request.data.get('username'))

        serializer = TutorRegisterSerializer(data=request.data, context={'files': request.FILES})
        if not serializer.is_valid():
            first_errors = next(iter(serializer.errors.values()))
            msg = first_errors[0] if isinstance(first_errors, list) else str(first_errors)
            return Response({"detail": str(msg)}, status=400)

        try:
            profile = serializer.save()
            logger.info("Tutor profile created for %s", profile.user.username)
            return Response({"message": "Tutor application submitted successfully!"}, status=201)
        except Exception:
            logger.exception("Tutor registration failed")
            return Response({"detail": "Registration failed. Please check your details and try again."}, status=400)

    @action(detail=True, methods=['patch'])
    def update_profile(self, request, pk=None):
        instance = self.get_object()
        if instance.user_id != request.user.id and not request.user.is_staff:
            return Response({"error": "You can only update your own profile."}, status=403)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def manage(self, request, pk=None):
        """Admin actions: Update Rate, Wallet Credit/Debit"""
        instance = self.get_object()
        action_type = request.data.get('action')
        amount = float(request.data.get('amount', 0))
        description = request.data.get('description', '')

        from payments.models import Wallet, Transaction
        from decimal import Decimal
        wallet, _ = Wallet.objects.get_or_create(user=instance.user)
        amount_dec = Decimal(str(amount))

        if action_type == 'UPDATE_RATE':
            instance.hourly_rate = amount_dec
            instance.save()
        elif action_type == 'CREDIT':
            wallet.balance += amount_dec
            wallet.save()
            Transaction.objects.create(
                user=instance.user,
                amount=amount_dec,
                transaction_type='DEPOSIT',
                description=f"ADMIN CREDIT: {description}"
            )
        elif action_type == 'DEBIT':
            # Balance MAY go negative: intentional clawback mechanism for over-payments.
            wallet.balance -= amount_dec
            wallet.save()
            Transaction.objects.create(
                user=instance.user,
                amount=amount_dec,
                transaction_type='SESSION_DEBIT',
                description=f"ADMIN DEBIT: {description}"
            )
        elif action_type == 'UPDATE_BIO':
            instance.bio = description
            instance.save()
        elif action_type == 'UPDATE_COMMISSION':
            instance.commission_percentage = Decimal(str(amount))
            instance.save()
            
        return Response({"message": "Tutor managed successfully"})

    @action(detail=False, methods=['post'])
    def assign(self, request):
        """Admin action to directly assign a tutor to a student and schedule first class"""
        from students.models import StudentProfile
        from classes.models import ScheduledSession
        from applications.live_class_service import LiveClassService
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        import datetime
        
        User = get_user_model()
        student_user_id = request.data.get('student_id')
        tutor_id = request.data.get('tutor_id')
        meeting_link = request.data.get('meeting_link', '')
        generate_zoom = request.data.get('generate_zoom', False)
        start_time_str = request.data.get('start_time')
        duration = int(request.data.get('duration', 40))

        try:
            # Flexible lookup: Try as Profile ID first, then as User ID
            student_profile = StudentProfile.objects.filter(id=student_user_id).first()
            if not student_profile:
                student_profile = StudentProfile.objects.filter(user_id=student_user_id).first()
            
            if not student_profile:
                return Response({"error": f"Student with ID {student_user_id} not found in profiles"}, status=404)
                
            student_user = student_profile.user
            tutor_profile = TutorProfile.objects.get(id=tutor_id)
            tutor_user = tutor_profile.user

            # 1. Generate LiveClass/Whiteboard if requested
            whiteboard_link = ''
            if generate_zoom:
                topic = f"Class: {student_user.get_full_name()} with {tutor_user.get_full_name()}"
                meeting_data = LiveClassService.create_meeting(topic)
                meeting_link = meeting_data.get('join_url')
                whiteboard_link = meeting_data.get('whiteboard_url')

            # 2. Update Student Profile
            student_profile.assigned_tutor = tutor_user
            student_profile.meeting_link = meeting_link
            student_profile.whiteboard_link = whiteboard_link
            student_profile.save()

            # 3. Create Initial Scheduled Session
            scheduled_at = timezone.now() + timezone.timedelta(days=1)
            if start_time_str:
                try:
                    scheduled_at = timezone.datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                except ValueError:
                    pass

            # Look up enrolled subject
            enrolled_subject = None
            if student_profile.enrolled_course:
                from programs.models import Subject
                enrolled_subject = Subject.objects.filter(name__icontains=student_profile.enrolled_course).first()

            # Calculate Fee (hourly_rate * duration_ratio)
            fee = (tutor_profile.hourly_rate * duration) / 60

            ScheduledSession.objects.create(
                student=student_user,
                tutor=tutor_user,
                subject=enrolled_subject,
                scheduled_at=scheduled_at,
                duration=duration,
                fee_amount=fee,
                meeting_link=meeting_link,
                whiteboard_link=whiteboard_link,
                status='PENDING'
            )

            return Response({"message": f"Tutor {tutor_user.get_full_name()} assigned to {student_user.get_full_name()}"})

        except User.DoesNotExist:
            return Response({"error": "Student user not found"}, status=404)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor not found"}, status=404)
        except Exception:
            logger.exception("Tutor admin action failed")
            return Response({"error": "Action failed. Please check server logs."}, status=400)

    @action(detail=False, methods=['get'], permission_classes=[])
    def by_subject(self, request):
        """Return approved tutors who teach a given subject name (for student enrollment).
        Uses bidirectional keyword matching so 'Quranic Recitation' matches 'Quran' stored in DB.
        Falls back to ALL approved tutors when no subject filter given.
        """
        subject_name = request.query_params.get('subject', '').strip()
        from students.models import Enrollment
        from django.db.models import Q
        
        # 1. Base query with prefetching optimized in get_queryset
        queryset = TutorProfile.objects.filter(status='APPROVED').select_related('user')
        
        if subject_name:
            # SQL-level search across multiple fields
            query_keywords = [w.lower() for w in subject_name.replace(',', ' ').split() if len(w) > 2]
            if query_keywords:
                search_query = Q()
                for kw in query_keywords:
                    # search in subjects_to_teach text and qualification
                    search_query |= Q(subjects_to_teach__icontains=kw)
                    search_query |= Q(qualification__icontains=kw)
                    # also search in related subjects through prefetch_related if needed, 
                    # but subjects__name__icontains is faster for SQL
                    search_query |= Q(subjects__name__icontains=kw)
                
                matched = list(queryset.filter(search_query).distinct()[:30])
            else:
                matched = list(queryset[:30])
        else:
            matched = list(queryset[:30])

        # 2. Serialize basic data
        serializer = self.get_serializer(matched, many=True)
        data = serializer.data
        
        # 3. FIX N+1: Bulk fetch all enrollments for these tutors in one query
        tutor_user_ids = [t.user.id for t in matched]
        all_busy = Enrollment.objects.filter(
            tutor_id__in=tutor_user_ids, 
            status='APPROVED'
        ).values('tutor_id', 'preferred_days', 'preferred_time')
        
        # Group busy slots by tutor_id in memory
        busy_map = {}
        for entry in all_busy:
            t_id = entry['tutor_id']
            if t_id not in busy_map:
                busy_map[t_id] = []
            busy_map[t_id].append({
                'day': entry['preferred_days'],
                'time': entry['preferred_time']
            })
            
        # Map them back to the serialized data
        for tutor_data in data:
            # Note: LiteTutorSerializer might not have user_id, 
            # so we use the id from matched object lookup
            u_id = next((t.user.id for t in matched if t.id == tutor_data['id']), None)
            tutor_data['busy_slots'] = busy_map.get(u_id, [])
            
        return Response(data)
            
        return Response(data)


    def get_queryset(self):
        # By default, show only approved tutors to public
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.filter(status='APPROVED')
        return queryset
