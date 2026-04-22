# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import TutorProfile, TutorAvailability
from django.contrib.auth import get_user_model
from programs.models import Subject

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_verified']

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'program']

class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ['id', 'day', 'start_time', 'end_time']

class TutorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    availabilities = TutorAvailabilitySerializer(many=True, read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    video_url = serializers.SerializerMethodField()
    video_type = serializers.SerializerMethodField()
    recitation_url = serializers.SerializerMethodField()
    
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
    
    rating = serializers.SerializerMethodField()
    
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
                except: pass

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
                except: pass

        return slots

    def get_rating(self, obj):
        return 5.0

    video_type = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        if obj.intro_video and obj.intro_video.name:
            return obj.intro_video.url
        return obj.intro_video_url or None

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

    def get_recitation_url(self, obj):
        if obj.short_recitation and hasattr(obj.short_recitation, 'url') and obj.short_recitation.name:
            return obj.short_recitation.url
        # Fallback: short_recitation might be stored as a URL string
        val = str(obj.short_recitation) if obj.short_recitation else None
        if val and val.startswith('http'):
            return val
        return None

class PublicTutorSerializer(TutorProfileSerializer):
    image = serializers.SerializerMethodField()

    class Meta(TutorProfileSerializer.Meta):
        fields = ['id', 'user', 'full_name', 'mode', 'rate_per_month', 'hourly_rate', 'state', 'city', 
                  'qualification', 'subjects', 'subjects_to_teach', 'languages', 'availability_days', 'availability_hours', 'availabilities',
                  'video_url', 'video_type', 'recitation_url', 'live_class_link',
                  'experience_years', 'rating', 'bio', 'image']

    def get_image(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            return obj.image.url
        return None



class LiteTutorSerializer(serializers.ModelSerializer):
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

    def get_image(self, obj):
        if obj.image:
            if hasattr(obj.image, 'url'):
                return obj.image.url
            return str(obj.image)
        return None

    def get_rating(self, obj):
        return 5.0

    def get_video_url(self, obj):
        if obj.intro_video and obj.intro_video.name:
            return obj.intro_video.url
        return obj.intro_video_url or None

    def get_video_type(self, obj):
        if obj.intro_video and obj.intro_video.name:
            return 'file'
        url = obj.intro_video_url or ''
        if 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        if url:
            return 'file'
        return None

    def get_recitation_url(self, obj):
        if obj.short_recitation and hasattr(obj.short_recitation, 'url') and obj.short_recitation.name:
            return obj.short_recitation.url
        val = str(obj.short_recitation) if obj.short_recitation else None
        if val and val.startswith('http'):
            return val
        return None
