# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import TutorProfile, TutorAvailability
from django.contrib.auth import get_user_model
from programs.models import Subject

User = get_user_model()


def resolve_media_url(field):
    """Resolve a File/ImageField that may hold an uploaded file OR a raw URL
    string (direct-to-Cloudinary uploads store the URL in the name).

    Returns the http URL, the storage URL, the raw name, or None. Never
    raises — a misconfigured storage backend degrades to the stored name.
    """
    if not field:
        return None
    name = str(getattr(field, 'name', field) or '')
    if name.startswith('http'):
        return name
    try:
        return field.url if hasattr(field, 'url') else (name or None)
    except Exception:
        return name or None


# Named to avoid OpenAPI component collisions with accounts.UserSerializer
# and programs.SubjectSerializer (identical class names produce a broken schema).
class TutorUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_verified']


class TutorSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'program']


class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ['id', 'day', 'start_time', 'end_time']


class TutorMediaFieldsMixin:
    """Shared media/rating method fields — single source of truth for the
    file-or-URL resolution that was previously duplicated per serializer."""

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image(self, obj):
        return resolve_media_url(obj.image)

    @extend_schema_field(serializers.FloatField())
    def get_rating(self, obj):
        return 5.0

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_video_url(self, obj):
        return resolve_media_url(obj.intro_video) or obj.intro_video_url or None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_video_type(self, obj):
        """Returns 'youtube', 'file', or None so frontend picks the right player"""
        if obj.intro_video and obj.intro_video.name:
            return 'file'
        url = obj.intro_video_url or ''
        if 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        if url:
            return 'file'
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_recitation_url(self, obj):
        url = resolve_media_url(obj.short_recitation)
        # Only expose real URLs — a bare storage name is not playable
        if url and (url.startswith('http') or url.startswith('/')):
            return url
        return None


class TutorProfileSerializer(TutorMediaFieldsMixin, serializers.ModelSerializer):
    user = TutorUserSerializer(read_only=True)
    subjects = TutorSubjectSerializer(many=True, read_only=True)
    availabilities = TutorAvailabilitySerializer(many=True, read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    video_url = serializers.SerializerMethodField()
    video_type = serializers.SerializerMethodField()
    recitation_url = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()

    busy_slots = serializers.SerializerMethodField()
    wallet_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = TutorProfile
        fields = ['id', 'user', 'full_name', 'status', 'mode', 'rate_per_month', 'hourly_rate', 'state', 'city',
                  'qualification', 'subjects', 'subjects_to_teach', 'languages', 'intro_video', 'short_recitation', 'availabilities',
                  'availability_days', 'availability_hours',
                  'experience_years', 'rating', 'bio', 'video_url', 'video_type', 'recitation_url', 'live_class_link', 'trial_class_link',
                  'busy_slots', 'image', 'intro_video_url', 'commission_percentage', 'wallet_balance']

    def update(self, instance, validated_data):
        # Handle direct-to-cloud URL fields that might be in request.data but not in validated_data
        # since they aren't explicit fields in the serializer/model (except intro_video_url)
        data = self.context['request'].data

        if 'image_url' in data:
            instance.image = data['image_url']
        if 'intro_video_url' in data:
            instance.intro_video_url = data['intro_video_url']
            instance.intro_video = None # Clear file field if URL is provided
        if 'short_recitation_url' in data:
            instance.short_recitation = data['short_recitation_url']
        if 'cv_url' in data:
            instance.cv_resume = data['cv_url']
        if 'credentials_url' in data:
            instance.credentials = data['credentials_url']

        return super().update(instance, validated_data)

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_busy_slots(self, obj):
        from classes.models import ScheduledSession, Booking
        from students.models import Enrollment
        from applications.models import TrialApplication
        import datetime
        import json

        slots = []

        # 1. Get One-off Sessions (ScheduledSession)
        sessions = ScheduledSession.objects.filter(tutor=obj.user, status='PENDING')
        for s in sessions:
            slots.append({
                'start': s.scheduled_at.isoformat(),
                'end': (s.scheduled_at + datetime.timedelta(minutes=s.duration)).isoformat(),
                'type': 'SESSION'
            })

        # 2. Get Trial Classes
        trials = TrialApplication.objects.filter(tutor=obj.user, status='approved')
        for t in trials:
            if t.scheduled_at:
                slots.append({
                    'start': t.scheduled_at.isoformat(),
                    'end': (t.scheduled_at + datetime.timedelta(minutes=t.duration)).isoformat(),
                    'type': 'TRIAL'
                })

        # 3. Get Recurring Schedules (The most important for Registration)
        # From Paid Bookings
        bookings = Booking.objects.filter(tutor=obj.user, paid=True)
        for b in bookings:
            if b.schedule:
                try:
                    sched_list = json.loads(b.schedule)
                    for slot in sched_list:
                        slots.append({
                            'preferred_days': (slot.get('day') or slot.get('preferred_days', '')).upper(),
                            'preferred_time': (slot.get('time') or slot.get('preferred_time', '')).upper(),
                            'type': 'RECURRING_BOOKING'
                        })
                except (ValueError, TypeError):
                    pass  # malformed schedule JSON — skip this booking

        # From Approved Enrollments
        enrollments = Enrollment.objects.filter(tutor=obj.user, status='APPROVED')
        for e in enrollments:
            if e.schedule:
                try:
                    sched_list = json.loads(e.schedule)
                    for slot in sched_list:
                        slots.append({
                            'preferred_days': (slot.get('day') or slot.get('preferred_days', '')).upper(),
                            'preferred_time': (slot.get('time') or slot.get('preferred_time', '')).upper(),
                            'type': 'RECURRING_ENROLLMENT'
                        })
                except (ValueError, TypeError):
                    pass  # malformed schedule JSON — skip this enrollment

        return slots


class PublicTutorSerializer(TutorProfileSerializer):
    image = serializers.SerializerMethodField()

    class Meta(TutorProfileSerializer.Meta):
        fields = ['id', 'user', 'full_name', 'mode', 'rate_per_month', 'hourly_rate', 'state', 'city',
                  'qualification', 'subjects', 'subjects_to_teach', 'languages', 'availability_days', 'availability_hours', 'availabilities',
                  'video_url', 'video_type', 'recitation_url', 'live_class_link',
                  'experience_years', 'rating', 'bio', 'image']


class LiteTutorSerializer(TutorMediaFieldsMixin, serializers.ModelSerializer):
    """Lightweight serializer for landing page and search results."""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    image = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    availabilities = TutorAvailabilitySerializer(many=True, read_only=True)
    video_url = serializers.SerializerMethodField()
    video_type = serializers.SerializerMethodField()
    recitation_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = ['id', 'full_name', 'hourly_rate', 'state', 'city', 'qualification',
                  'subjects_to_teach', 'languages', 'experience_years', 'image', 'rating',
                  'availability_hours', 'availabilities',
                  'video_url', 'video_type', 'recitation_url', 'live_class_link']


class TutorRegisterSerializer(serializers.Serializer):
    """Tutor application: creates the User + TutorProfile + availability slots.

    Replaces the former ~80-line inline implementation in TutorViewSet.register.
    Field mapping and behaviour are unchanged; extra payload keys (media URLs,
    availabilitySlots, ...) are read from initial_data in create().
    """
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                f"Username '{value}' is already taken. Please choose another one.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                f"Email '{value}' is already registered. Please login or use a different email.")
        return value

    def create(self, validated_data):
        from django.db import transaction
        data = self.initial_data
        files = self.context.get('files') or {}

        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                role='TUTOR',
                gender=data.get('gender'),
                country=data.get('country'),
            )

            slots = data.get('availabilitySlots', []) or []
            derived_days = ", ".join(sorted({s.get('day', '').strip() for s in slots if s.get('day')}))

            profile = TutorProfile.objects.create(
                user=user,
                age=data.get('age'),
                address=data.get('address'),
                experience_years=data.get('experience_years', 0),
                subjects_to_teach=data.get('subjects_to_teach') or 'Not specified',
                languages=data.get('languages', 'English'),
                has_online_exp=data.get('has_online_exp') in ('true', True),
                device_type=data.get('device_type', 'COMPUTER'),
                network_type=data.get('network_type'),
                availability_days=data.get('availability_days') or derived_days or 'Flexible',
                availability_hours=data.get('availability_hours') or 'Contact for details',
                hourly_rate=data.get('hourly_rate', 1500.00),
                # Direct-to-cloud URLs take precedence over multipart files
                image=data.get('image_url') or files.get('image'),
                intro_video=data.get('intro_video_url') or files.get('intro_video'),
                short_recitation=data.get('short_recitation_url') or files.get('short_recitation'),
                cv_resume=data.get('cv_url') or files.get('cv_resume'),
                credentials=data.get('credentials_url') or files.get('credentials'),
            )

            for slot in slots:
                day = slot.get('day', '').strip().upper()
                start = slot.get('startTime')
                end = slot.get('endTime')
                if day and start and end:
                    TutorAvailability.objects.create(
                        tutor=profile, day=day, start_time=start, end_time=end)

        return profile
