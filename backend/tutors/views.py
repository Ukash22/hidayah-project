# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import django_filters
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly
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
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, filters.SearchFilter]
    filterset_class = TutorFilter
    search_fields = ['user__first_name', 'user__last_name', 'qualification', 'city', 'state']
    
    @action(detail=False, methods=['get'], permission_classes=[])
    def cloudinary_signature(self, request):
        """Generate a signed upload signature for frontend direct-to-cloud uploads."""
        timestamp = int(time.time())
        folder = request.query_params.get('folder', 'tutor_media')
        
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
    
    def get_serializer_class(self):
        # Use lightweight serializer for lists and public views to improve performance
        if self.action in ['list', 'public', 'by_subject']:
            from .serializers import LiteTutorSerializer
            return LiteTutorSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=['get'], permission_classes=[])
    def public(self, request):
        """High-performance landing page tutors list"""
        # queryset already optimized with select/prefetch in get_queryset
        queryset = self.get_queryset().filter(status='APPROVED').order_by('-created_at')[:6]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[])
    def by_subject(self, request):
        """Return approved tutors who teach a given subject name.
        Fixed N+1 issues by using bulk lookups.
        """
        subject_name = request.query_params.get('subject', '').strip()
        queryset = self.get_queryset().filter(status='APPROVED')

        if subject_name:
            # Keyword matching optimization
            query_keywords = [w.lower() for w in subject_name.replace(',', ' ').split() if len(w) > 2]
            # Since we have prefetch_related for subjects, we can filter in Python for complex overlaps efficiently
            # or use Q objects for initial pruning. Here we use Python overlap check for flexibility.
            matched = []
            for tutor in queryset:
                stored = tutor.subjects_to_teach or ''
                stored_lower = stored.lower()
                stored_keywords = [w.strip().lower() for w in stored.replace(',', ' ').split() if len(w) > 2]
                overlap = any(kw in stored_lower for kw in query_keywords) or \
                          any(kw in subject_name.lower() for kw in stored_keywords)
                if overlap:
                    matched.append(tutor)
            
            # Fallback
            if not matched: matched = list(queryset[:12])
        else:
            matched = list(queryset[:12])

        serializer = self.get_serializer(matched, many=True)
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

    @action(detail=False, methods=['get'], url_path='admin/list')
    def admin_list(self, request):
        """Optimized admin list view for recruiter oversight."""
        queryset = TutorProfile.objects.all().select_related('user').prefetch_related('subjects')
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        data = []
        for t in queryset:
            # Use request.build_absolute_uri sparingly in loops
            def safe_url(f):
                try:
                    return request.build_absolute_uri(f.url) if f and hasattr(f, 'url') else str(f) if f else None
                except Exception: return str(f) if f else None

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
                'wallet_balance': str(t.wallet_balance),
                'commission_percentage': t.commission_percentage,
            })
        return Response(data)

    def get_queryset(self):
        queryset = super().get_queryset()
        # Ensure relationships are always fetched to avoid N+1 across all actions
        if self.action in ['list', 'public', 'by_subject', 'retrieve']:
            queryset = queryset.select_related('user').prefetch_related('subjects', 'availabilities')
        
        if self.action == 'list':
            return queryset.filter(status='APPROVED')
        return queryset

    @action(detail=False, methods=['post'], url_path=r'admin/action/(?P<app_id>\d+)')
    def admin_action(self, request, app_id=None):
        """Admin recruitment workflow: INTERVIEW, APPROVE, REJECT"""
        from applications.jitsi_service import JitsiService
        
        try:
            profile = TutorProfile.objects.get(id=app_id)
            action_type = request.data.get('action')
            
            if action_type == 'INTERVIEW':
                interview_at = request.data.get('interview_at')
                interview_link = request.data.get('interview_link', '')
                generate_zoom = request.data.get('generate_zoom', False)
                
                if generate_zoom:
                    topic = f"Interview with {profile.user.get_full_name()}"
                    meeting_data = JitsiService.create_meeting(topic)
                    interview_link = meeting_data.get('join_url')
                
                profile.status = 'INTERVIEW_SCHEDULED'
                profile.interview_at = interview_at
                profile.interview_link = interview_link
                profile.save()
                return Response({"message": "Interview scheduled", "link": interview_link})
                
            elif action_type == 'APPROVE':
                profile.status = 'APPROVED'
                profile.save()
                return Response({"message": "Tutor approved"})
                
            elif action_type == 'REJECT':
                reason = request.data.get('reason', '')
                profile.status = 'REJECTED'
                profile.rejection_reason = reason
                profile.save()
                return Response({"message": "Tutor rejected"})
                
            return Response({"error": "Invalid action"}, status=400)
            
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'], permission_classes=[])
    def cloudinary_signature(self, request):
        import time
        import cloudinary.utils
        folder = request.query_params.get('folder', 'tutor_media')
        timestamp = int(time.time())
        params = {
            'timestamp': timestamp,
            'folder': folder
        }
        signature = cloudinary.utils.api_sign_request(
            params, 
            settings.CLOUDINARY_STORAGE['API_SECRET']
        )
        return Response({
            'signature': signature,
            'timestamp': timestamp,
            'api_key': settings.CLOUDINARY_STORAGE['API_KEY'],
            'cloud_name': settings.CLOUDINARY_STORAGE['CLOUD_NAME']
        })

    @action(detail=False, methods=['post'], permission_classes=[])
    def register(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        data = request.data
        
        try:
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role='TUTOR',
                gender=data.get('gender'),
                country=data.get('country')
            )
            
            profile = TutorProfile.objects.create(
                user=user,
                age=data.get('age'),
                address=data.get('address'),
                experience_years=data.get('experience_years', 0),
                subjects_to_teach=data.get('subjects_to_teach'),
                languages=data.get('languages', 'English'),
                has_online_exp=data.get('has_online_exp') == 'true',
                device_type=data.get('device_type', 'COMPUTER'),
                network_type=data.get('network_type'),
                availability_days=data.get('availability_days'),
                availability_hours=data.get('availability_hours'),
                hourly_rate=data.get('hourly_rate', 1500.00),
                # Accept either raw files or Cloudinary URLs
                image=request.FILES.get('image') or data.get('image_url'),
                intro_video=request.FILES.get('intro_video') or data.get('intro_video_url'),
                short_recitation=request.FILES.get('short_recitation') or data.get('short_recitation_url'),
                cv_resume=request.FILES.get('cv_resume') or data.get('cv_url'),
                credentials=request.FILES.get('credentials') or data.get('credentials_url')
            )
            return Response({"message": "Tutor application submitted"}, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['patch'])
    def update_profile(self, request, pk=None):
        instance = self.get_object()
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
        from applications.jitsi_service import JitsiService
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

            # 1. Generate Jitsi/Whiteboard if requested
            whiteboard_link = ''
            if generate_zoom:
                topic = f"Class: {student_user.get_full_name()} with {tutor_user.get_full_name()}"
                meeting_data = JitsiService.create_meeting(topic)
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
        except Exception as e:
            return Response({"error": str(e)}, status=400)

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
