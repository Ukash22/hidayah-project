import json
import datetime
import uuid
import logging
from django.utils import timezone
from decimal import Decimal
from .models import ScheduledSession

logger = logging.getLogger(__name__)


def parse_time_slot(time_str):
    """
    Safely parse any time representation:
    - Keywords: 'Morning' -> 09:00, 'Afternoon' -> 14:00, 'Evening' -> 18:00, 'Night' -> 20:00
    - Ranges: '10:00-11:00' -> 10:00
    - 12h AM/PM: '10:00 AM', '10:00PM', '10 AM', '10AM'
    - 24h: '10:00', '14:30'
    Fallback: 10:00 AM
    """
    if not time_str:
        return datetime.time(10, 0)

    raw = str(time_str).strip()
    raw_lower = raw.lower()

    if 'morning' in raw_lower:
        return datetime.time(9, 0)
    if 'afternoon' in raw_lower:
        return datetime.time(14, 0)
    if 'evening' in raw_lower:
        return datetime.time(18, 0)
    if 'night' in raw_lower:
        return datetime.time(20, 0)

    # Take first portion of range if hyphen present
    pure_time = raw.split('-')[0].strip()
    pure_upper = pure_time.upper()

    if 'AM' in pure_upper or 'PM' in pure_upper:
        for fmt in ("%I:%M %p", "%I:%M%p", "%I %p", "%I%p"):
            try:
                return datetime.datetime.strptime(pure_upper, fmt).time()
            except ValueError:
                pass

    try:
        parts = pure_time.split(':')
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return datetime.time(h % 24, m % 60)
    except Exception:
        return datetime.time(10, 0)


def normalize_schedule_data(schedule_data, fallback_time="10:00 AM"):
    """
    Converts various schedule representations into a standardized list of dicts:
    [{"day": "Monday", "time": "10:00 AM"}, ...]
    """
    if not schedule_data:
        return []

    # If it's a JSON string, parse it
    if isinstance(schedule_data, str):
        try:
            parsed = json.loads(schedule_data)
            if isinstance(parsed, list):
                schedule_data = parsed
        except Exception:
            # Maybe it's a comma-separated list of days e.g. "Monday, Wednesday, Friday"
            days = [d.strip() for d in schedule_data.split(',') if d.strip()]
            return [{"day": d, "time": fallback_time} for d in days]

    slots = []
    if isinstance(schedule_data, list):
        for item in schedule_data:
            if isinstance(item, dict):
                day_val = item.get('day') or item.get('preferred_days') or ''
                time_val = item.get('time') or item.get('preferred_time') or fallback_time
                if day_val:
                    # Might have multiple comma-separated days in one dict
                    for d in str(day_val).split(','):
                        d_clean = d.strip()
                        if d_clean:
                            slots.append({'day': d_clean, 'time': time_val})
            elif isinstance(item, str) and item.strip():
                slots.append({'day': item.strip(), 'time': fallback_time})

    return slots


def generate_recurring_sessions(student, tutor, subject_obj, schedule_data, fee_per_session=0, weeks=4, start_date=None):
    """
    Generates a series of ScheduledSession objects based on a weekly schedule.
    - student: User object
    - tutor: User object
    - subject_obj: Subject object
    - schedule_data: List of dicts [{"day": "Monday", "time": "10:00"}] or JSON string or comma-separated days
    - fee_per_session: Decimal amount to attribute to each session
    - weeks: Number of weeks to generate (Default 4)
    - start_date: Optional specific start date (date object or string)
    """
    normalized_slots = normalize_schedule_data(schedule_data)
    if not normalized_slots:
        return []

    day_map = {
        'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3,
        'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6
    }

    # Ensure subject_obj exists
    if not subject_obj:
        from programs.models import Subject, Program
        default_prog, _ = Program.objects.get_or_create(name="General Education", defaults={'program_type': 'WESTERN'})
        subject_obj, _ = Subject.objects.get_or_create(name="General Studies", defaults={'program': default_prog, 'admin_percentage': 20})

    # Get Tutor's Meeting Links
    meeting_link = None
    whiteboard_link = None
    if tutor and hasattr(tutor, 'tutor_profile'):
        meeting_link = tutor.tutor_profile.live_class_link
        whiteboard_link = tutor.tutor_profile.live_class_link

    if not start_date:
        start_date = timezone.now().date()
    elif isinstance(start_date, str):
        try:
            start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        except Exception:
            start_date = timezone.now().date()
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    sessions_created = []

    for week_offset in range(weeks):
        for slot in normalized_slots:
            day_name = slot.get('day', '')
            time_str = slot.get('time', '')

            if not day_name:
                continue

            target_weekday = day_map.get(day_name.strip().upper())
            if target_weekday is None:
                continue

            # Find the first occurrence of this weekday on or after the start_date
            days_ahead = (target_weekday - start_date.weekday()) % 7
            total_days_ahead = days_ahead + (week_offset * 7)
            session_date = start_date + datetime.timedelta(days=total_days_ahead)

            try:
                dt_time = parse_time_slot(time_str)
                session_at = timezone.make_aware(datetime.datetime.combine(session_date, dt_time))

                final_meeting_link = meeting_link
                final_whiteboard_link = whiteboard_link

                if not final_meeting_link:
                    room_id = f"class-{subject_obj.name.replace(' ', '-').lower()}-{uuid.uuid4().hex[:8]}"
                    from django.conf import settings
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                    final_meeting_link = f"{frontend_url}/live/{room_id}"
                    final_whiteboard_link = final_meeting_link

                session = ScheduledSession.objects.create(
                    student=student,
                    tutor=tutor,
                    subject=subject_obj,
                    scheduled_at=session_at,
                    duration=60,
                    fee_amount=Decimal(str(fee_per_session or 0)),
                    meeting_link=final_meeting_link,
                    whiteboard_link=final_whiteboard_link,
                    status='PENDING'
                )
                sessions_created.append(session)
            except Exception as e:
                logger.warning("Error creating session for %s %s: %s", day_name, time_str, e)

    if sessions_created:
        try:
            from accounts.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = User.objects.filter(role='ADMIN')
            tutor_name = tutor.get_full_name() if tutor else "Assigned Tutor"
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    title="New Classes Generated",
                    message=f"{len(sessions_created)} classes generated for {student.get_full_name()} with {tutor_name} for {subject_obj.name}.",
                    link=f"/admin/classes"
                )
        except Exception as e:
            logger.warning("Error notifying admins about new sessions: %s", e)

    return sessions_created


def ensure_student_sessions(student_user):
    """
    Self-healing helper:
    Checks if a student has an assigned tutor or enrollments but no upcoming sessions.
    If sessions are missing, auto-generates 4 weeks of sessions so their dashboard shows their classes.
    """
    from students.models import StudentProfile, Enrollment
    from programs.models import Subject, Program

    profile = StudentProfile.objects.filter(user=student_user).first()
    if not profile:
        return []

    created_sessions = []
    enrollments = list(Enrollment.objects.filter(student=profile))

    # If no enrollments exist yet, but profile has assigned_tutor and enrolled_course, create default enrollment
    if not enrollments and profile.assigned_tutor:
        course_name = profile.enrolled_course or "General Studies"
        # Find or create subject
        subject_obj = Subject.objects.filter(name__icontains=course_name).first()
        if not subject_obj:
            default_prog, _ = Program.objects.get_or_create(
                name="General Education",
                defaults={'program_type': 'WESTERN'}
            )
            subject_obj, _ = Subject.objects.get_or_create(
                name=course_name,
                defaults={'program': default_prog, 'admin_percentage': 20}
            )

        days_str = profile.preferred_days or "Monday, Wednesday, Friday"
        time_str = profile.preferred_time_exact or profile.preferred_time or "10:00 AM"
        days_list = [d.strip() for d in days_str.split(',') if d.strip()]
        sched = [{"day": d, "time": time_str} for d in days_list]

        enrollment = Enrollment.objects.create(
            student=profile,
            subject=subject_obj,
            tutor=profile.assigned_tutor,
            days_per_week=profile.days_per_week or len(days_list) or 3,
            hours_per_week=profile.hours_per_week or Decimal('1.0'),
            preferred_days=days_str,
            preferred_time=time_str,
            schedule=json.dumps(sched),
            status='APPROVED'
        )
        enrollments = [enrollment]

    for enr in enrollments:
        tutor = enr.tutor or profile.assigned_tutor
        if not tutor:
            continue

        # Keep enrollment in sync
        if not enr.tutor:
            enr.tutor = tutor
            enr.save()
        if enr.status != 'APPROVED':
            enr.status = 'APPROVED'
            enr.save()

        # Check if student already has active/upcoming sessions for this subject
        has_future_sessions = ScheduledSession.objects.filter(
            student=student_user,
            subject=enr.subject,
            scheduled_at__gte=timezone.now() - datetime.timedelta(days=2)
        ).exists()

        if not has_future_sessions:
            sched_data = enr.schedule
            if not sched_data:
                days_str = enr.preferred_days or profile.preferred_days or "Monday, Wednesday, Friday"
                time_str = enr.preferred_time or profile.preferred_time_exact or profile.preferred_time or "10:00 AM"
                days_list = [d.strip() for d in days_str.split(',') if d.strip()]
                sched_data = [{"day": d, "time": time_str} for d in days_list]

            new_sessions = generate_recurring_sessions(
                student=student_user,
                tutor=tutor,
                subject_obj=enr.subject,
                schedule_data=sched_data,
                fee_per_session=Decimal("0"),
                weeks=4,
                start_date=enr.preferred_start_date or timezone.now().date()
            )
            created_sessions.extend(new_sessions)

    return created_sessions
