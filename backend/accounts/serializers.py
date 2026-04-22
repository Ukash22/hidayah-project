# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

def get_rate_by_level(level):
    """Dynamic rate based on student educational level"""
    if level in ['JAMB', 'WAEC', 'NECO']:
        return Decimal('2500.00')
    if level in ['SECONDARY', 'JUNIOR_WAEC']:
        return Decimal('2000.00')
    return Decimal('1500.00')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone', 'first_name', 'last_name', 'admission_number', 'dob', 'country', 'timezone', 'preferred_language')
        read_only_fields = ('id', 'role', 'admission_number')

class PendingStudentSerializer(serializers.ModelSerializer):
    profile_data = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'first_name', 'last_name', 'gender', 'dob', 'country', 'timezone', 'preferred_language', 'profile_data', 'is_parent_account')

    def get_profile_data(self, obj):
        try:
            from students.models import StudentProfile
            from students.serializers import StudentProfileSerializer
            profile = StudentProfile.objects.get(user=obj)
            return StudentProfileSerializer(profile).data
        except:
            return None

from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

from datetime import date
import random

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    parent_first_name = serializers.CharField(required=False, allow_blank=True)
    parent_last_name = serializers.CharField(required=False, allow_blank=True)
    parent_email = serializers.CharField(required=False, allow_blank=True)
    parent_password = serializers.CharField(required=False, allow_blank=True)
    relationship = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'role', 'phone', 
            'first_name', 'last_name', 'dob', 'gender', 'country', 
            'timezone', 'preferred_language',
            'parent_first_name', 'parent_last_name', 'parent_email', 
            'parent_password', 'relationship', 'address',
            'days_per_week', 'hours_per_week', 'preferred_days', 'preferred_time', 'preferred_time_exact', 'class_type', 'level', 'preferred_tutor_id', 'subject_enrollments', 'preferred_tutor', 'enrolled_course',
            'target_exam_type', 'target_exam_year', 'total_amount'
        )
    
    # Extra fields not on User model but needed for registration
    days_per_week = serializers.IntegerField(required=False, default=3)
    hours_per_week = serializers.FloatField(required=False, default=1.0)
    preferred_days = serializers.CharField(required=False, allow_blank=True)
    preferred_time = serializers.CharField(required=False, allow_blank=True)
    preferred_time_exact = serializers.CharField(required=False, allow_blank=True)
    class_type = serializers.CharField(required=False, default='ONE_ON_ONE')
    level = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    preferred_tutor_id = serializers.IntegerField(required=False, allow_null=True)
    subject_enrollments = serializers.JSONField(required=False, write_only=True)
    preferred_tutor = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='TUTOR'), required=False, allow_null=True)
    enrolled_course = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    target_exam_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    target_exam_year = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_amount = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, default=0.00)


    def generate_admission_number(self, course_code="GEN"):
        year = date.today().year
        serial = random.randint(1000, 9999)
        return f"HEMI/{year}/{course_code}/{serial}"

    def calculate_age(self, born):
        today = date.today()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

    def validate(self, attrs):
        # 1. Extract tutor and schedule info
        subject_enrollments = attrs.get('subject_enrollments', [])
        preferred_days = attrs.get('preferred_days', '')
        preferred_time_exact = attrs.get('preferred_time_exact', '')
        
        if subject_enrollments and (preferred_days or preferred_time_exact):
            # Parse proposed schedule
            days = [d.strip() for d in preferred_days.split(',') if d.strip()]
            times = [t.strip() for t in preferred_time_exact.split(',') if t.strip()]
            
            # Zip into slot list
            proposed_schedule = []
            for d, t in zip(days, times):
                proposed_schedule.append({'day': d, 'time': t})
            
            if proposed_schedule:
                from classes.utils import check_tutor_conflict
                
                # Check each tutor in enrollments
                for enrollment in subject_enrollments:
                    tutor_id = enrollment.get('preferred_tutor_id')
                    if tutor_id:
                        try:
                            tutor_user = User.objects.get(id=int(tutor_id), role='TUTOR')
                            has_conflict, msg = check_tutor_conflict(tutor_user, proposed_schedule)
                            if has_conflict:
                                raise serializers.ValidationError({
                                    "error": f"Tutor {tutor_user.get_full_name()} conflict: {msg} Please choose another time or tutor."
                                })
                        except User.DoesNotExist:
                            pass
        
        return attrs

    def create(self, validated_data):
        try:
            # Extract parent data
            parent_email = validated_data.pop('parent_email', None)
            parent_pwd = validated_data.pop('parent_password', None)
            parent_fname = validated_data.pop('parent_first_name', '')
            parent_lname = validated_data.pop('parent_last_name', '')
            relationship = validated_data.pop('relationship', '')
            address = validated_data.pop('address', '')
            
            dob = validated_data.get('dob')
            age = self.calculate_age(dob) if dob else 20
            
            # Student User Loop (Handle Admission Number Uniqueness)
            user = None
            max_retries = 3
            for i in range(max_retries):
                try:
                    user = User.objects.create_user(
                        username=validated_data['username'],
                        email=validated_data.get('email', ''),
                        password=validated_data['password'],
                        role='STUDENT',
                        first_name=validated_data.get('first_name', ''),
                        last_name=validated_data.get('last_name', ''),
                        dob=dob,
                        gender=validated_data.get('gender'),
                        country=validated_data.get('country'),
                        timezone=validated_data.get('timezone'),
                        preferred_language=validated_data.get('preferred_language', 'English'),
                        admission_number=self.generate_admission_number()
                    )
                    break
                except Exception as e:
                    if i == max_retries - 1:
                        # Use a more specific error detail if possible
                        raise serializers.ValidationError({"error": f"Username or ID collision: {str(e)}"})
                    continue
            
            if not user:
                raise serializers.ValidationError({"error": "Failed to create student user."})

            parent_user = None
            if age < 18 and parent_email and parent_pwd:
                try:
                    # Create Parent User
                    p_username = f"parent_{user.username}_{random.randint(10, 99)}"
                    parent_user = User.objects.create_user(
                        username=p_username,
                        email=parent_email,
                        password=parent_pwd,
                        role='PARENT',
                        is_parent_account=True,
                        first_name=parent_fname,
                        last_name=parent_lname
                    )
                except Exception as e:
                    print(f"Non-critical error creating parent user: {e}")
                
            # Extract enrollment preferences
            days_per_week = validated_data.pop('days_per_week', 3)
            hours_per_week = validated_data.pop('hours_per_week', 1.0)
            preferred_days = validated_data.pop('preferred_days', '')
            preferred_time = validated_data.pop('preferred_time', '')
            preferred_time_exact = validated_data.pop('preferred_time_exact', '')
            class_type = validated_data.pop('class_type', 'ONE_ON_ONE')
            level = validated_data.pop('level', None)
            target_exam_type = validated_data.pop('target_exam_type', None)
            target_exam_year = validated_data.pop('target_exam_year', None)
            preferred_tutor_id = validated_data.pop('preferred_tutor_id', None)
            preferred_start_date = validated_data.pop('preferred_start_date', None)
            
            # Zip preferences into a formal schedule list
            import json
            days_list = [d.strip().upper() for d in str(preferred_days).split(',') if d.strip()]
            times_list = [t.strip() for t in str(preferred_time_exact).split(',') if t.strip()]
            enrollment_schedule = []
            for d, t in zip(days_list, times_list):
                enrollment_schedule.append({"day": d, "time": t})
            
            # Calculate first payment (Tuition ONLY, No One-Time Fees)
            from decimal import Decimal
            
            # Pull total amount dynamically calculated from frontend
            first_payment = validated_data.pop('total_amount', Decimal('1500.00')) 
            if first_payment <= 0:
                first_payment = Decimal('1500.00')
            
            # Extract subject enrollments if any
            subject_enrollments = validated_data.pop('subject_enrollments', [])
            enrolled_course_str = validated_data.get('enrolled_course', "General Studies")
            if subject_enrollments:
                subject_names = [item.get('subject') for item in subject_enrollments if item.get('subject')]
                if subject_names:
                    enrolled_course_str = ", ".join(subject_names)

            # Create Student Profile
            from students.models import StudentProfile
            import uuid
            
            # FIX: Sanitize preferred_tutor_id (ensure it's int or None)
            final_tutor_id = None
            if preferred_tutor_id and str(preferred_tutor_id).strip():
                try: 
                    final_tutor_id = int(preferred_tutor_id)
                except: 
                    pass

            profile = StudentProfile.objects.create(
                user=user,
                parent=parent_user,
                relationship=relationship,
                address=address,
                enrolled_course=enrolled_course_str,
                days_per_week=days_per_week,
                hours_per_week=hours_per_week,
                preferred_days=preferred_days,
                preferred_time=preferred_time,
                preferred_time_exact=preferred_time_exact,
                class_type=class_type,
                level=level,
                target_exam_type=target_exam_type,
                target_exam_year=target_exam_year,
                preferred_tutor_id=final_tutor_id,
                assigned_tutor=User.objects.filter(id=final_tutor_id, role='TUTOR').first() if final_tutor_id else None,
                approval_status='APPROVED', # Instant Admission
                payment_reference=f"HEMI-{uuid.uuid4().hex[:8].upper()}",
                total_amount=first_payment,
                payment_status='UNPAID'
            )

            # Create formal Enrollment objects for each subject (Instant Enrollment)
            if subject_enrollments:
                from students.models import Enrollment
                from programs.models import Subject
                
                for enrollment in subject_enrollments:
                    subj_name = enrollment.get('subject')
                    pref_t_id = enrollment.get('preferred_tutor_id')
                    
                    if subj_name:
                        try:
                            t_user = User.objects.filter(id=int(pref_t_id), role='TUTOR').first() if pref_t_id else None
                            # Robust subject matching
                            s_obj = Subject.objects.filter(name__iexact=subj_name).first() or \
                                    Subject.objects.filter(name__icontains=subj_name).first()
                            
                            # Determine rate for this enrollment (Dynamic based on Level)
                            current_rate = get_rate_by_level(level)
                            if t_user and t_user.tutor_profile and t_user.tutor_profile.hourly_rate:
                                current_rate = t_user.tutor_profile.hourly_rate

                            # CRITICAL MATH FIX: Backend Enrollment expects Hours PER SESSION
                            # hours_per_week in serializer is TOTAL WEEKLY HOURS
                            hours_per_session = hours_per_week / days_per_week if days_per_week > 0 else hours_per_week

                            Enrollment.objects.create(
                                student=profile,
                                subject=s_obj,
                                tutor=t_user,
                                hourly_rate=current_rate,
                                hours_per_week=Decimal(str(hours_per_session)),
                                days_per_week=days_per_week,
                                preferred_days=preferred_days,
                                schedule=json.dumps(enrollment_schedule) if enrollment_schedule else None,
                                preferred_start_date=preferred_start_date,
                                status='APPROVED' # Instant Approval
                            )
                        except Exception as e:
                            print(f"Error creating auto-enrollment for {subj_name}: {e}")

            # Generate and Send Admission Letter Immediately
            try:
                from core.utils.pdf_generator import generate_admission_letter
                from applications.email_service import send_admission_letter_email
                
                # Format enrollment data for PDF
                enrollment_data = []
                for enr in profile.enrollments.all():
                    enrollment_data.append({
                        'subject_name': enr.subject.name,
                        'tutor_name': f"{enr.tutor.first_name} {enr.tutor.last_name}" if enr.tutor else "TBA",
                        'monthly_rate': float(enr.monthly_rate),
                        'days': enr.preferred_days or "TBA",
                        'time': profile.preferred_time_exact or "TBA",
                    })
                
                payment_url = f"{settings.FRONTEND_URL}/admission-portal" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:5173/admission-portal"
                
                letter_path = generate_admission_letter(user, profile, {
                    'enrollments': enrollment_data,
                    'total_payment': float(first_payment),
                }, payment_url=payment_url)
                
                profile.admission_letter = letter_path
                profile.save()
                
                send_admission_letter_email(user, profile)
            except Exception as doc_err:
                print(f"Non-critical Error generating instant admission docs: {doc_err}")
                
            return user
        except serializers.ValidationError:
            raise
        except Exception as e:
            import traceback
            trace_err = traceback.format_exc()
            print(f"CRITICAL REGISTRATION ERROR: {e}")
            print(f"TRACEBACK: {trace_err}")
            # Identify specific constraint errors
            if "unique constraint" in str(e).lower() or "already exists" in str(e).lower():
                 raise serializers.ValidationError({"error": f"Database Conflict: {str(e)}"})
            raise serializers.ValidationError({"error": f"Server Error during profiling: {str(e)}", "trace": trace_err[:500]})

        # Generate Admission Letter PDF with payment details
        # SKIPPED: Moved to Admin Approval Step (ApproveStudentView)
        # from core.utils.pdf_generator import generate_admission_letter
        # try:
        #     letter_path = generate_admission_letter(user, profile, {
        #         'registration_fee': float(registration_fee),
        #         'maintenance_fee': float(maintenance_fee),
        #         'materials_fee': float(materials_fee),
        #         'first_month_tuition': float(first_month_tuition),
        #         'first_payment': float(first_payment),
        #         'hourly_rate': float(pricing.hourly_rate),
        #         'hours_per_week': hours_per_week,
        #         'days_per_week': days_per_week,
        #     })
        #     profile.admission_letter = letter_path
        #     profile.save()
            
        #     # Send admission letter email immediately
        #     # from applications.email_service import send_admission_letter_email
        #     # try:
        #     #     send_admission_letter_email(user, profile)
        #     # except Exception as email_err:
        #     #     print(f"Error sending admission email: {email_err}")
                
        # except Exception as e:
        #     print(f"Error generating PDF: {e}")
        
        return user
