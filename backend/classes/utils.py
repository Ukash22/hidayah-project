import logging
from django.utils import timezone
from django.conf import settings
from .models import ScheduledSession, Booking

logger = logging.getLogger(__name__)

def sync_student_tutor_change(student_user, new_tutor_user, old_tutor_user=None, subject_name=None, booking=None):
    """
    Automated logic to reassign a student to a new tutor (triggered at any time by Admin):
    1. Reassign upcoming/PENDING sessions to new_tutor_user.
    2. Generate/update valid classroom links for each session for tutor and student.
    3. If no pending sessions exist yet (e.g. paid booking or approved enrollment), generate them with links.
    4. Update StudentProfile (assigned_tutor, meeting_link).
    5. Update Enrollment(s) to new_tutor_user.
    6. Update Booking(s) to new_tutor_user.
    7. Notify the student and tutor (and old tutor if changed) with the generated class link.
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    # Tutor's custom meeting link if provided (e.g. Zoom/Google Meet), otherwise internal WebRTC room
    tutor_custom_link = None
    if hasattr(new_tutor_user, 'tutor_profile') and new_tutor_user.tutor_profile.live_class_link:
        tutor_custom_link = new_tutor_user.tutor_profile.live_class_link

    from django.db.models import Q
    # 1. Reassign all upcoming/PENDING sessions for this student
    pending_sessions = ScheduledSession.objects.filter(
        student=student_user,
        status='PENDING'
    )
    if subject_name:
        pending_sessions = pending_sessions.filter(Q(subject__name__icontains=subject_name) | Q(subject__isnull=True))

    primary_class_link = None
    first_session_id = None
    count = 0

    for session in pending_sessions:
        session.tutor = new_tutor_user
        session_link = tutor_custom_link or f"{frontend_url}/live/{session.id}"
        session.meeting_link = session_link
        session.whiteboard_link = session_link
        session.save(update_fields=['tutor', 'meeting_link', 'whiteboard_link'])
        count += 1
        if not primary_class_link:
            primary_class_link = session_link
            first_session_id = session.id

    # 2. If no pending sessions exist yet, ensure or generate them
    if not primary_class_link:
        if booking and booking.paid:
            from payments.services import fulfill_and_generate_sessions_for_booking
            booking.tutor = new_tutor_user
            booking.approved = True
            booking.tutor_declined = False
            booking.save()
            fulfill_and_generate_sessions_for_booking(booking)
        else:
            from classes.scheduler import ensure_student_sessions
            ensure_student_sessions(student_user)

        first_sess = ScheduledSession.objects.filter(
            student=student_user,
            tutor=new_tutor_user,
            status='PENDING'
        ).order_by('scheduled_at').first()

        if first_sess:
            first_session_id = first_sess.id
            primary_class_link = first_sess.meeting_link or tutor_custom_link or f"{frontend_url}/live/{first_sess.id}"
            if not first_sess.meeting_link:
                first_sess.meeting_link = primary_class_link
                first_sess.whiteboard_link = primary_class_link
                first_sess.save(update_fields=['meeting_link', 'whiteboard_link'])
        else:
            primary_class_link = tutor_custom_link or f"{frontend_url}/live/student-{student_user.id}"

    # 3. Update StudentProfile
    try:
        from students.models import StudentProfile
        profile = StudentProfile.objects.filter(user=student_user).first()
        if profile:
            profile.assigned_tutor = new_tutor_user
            profile.meeting_link = primary_class_link
            profile.save(update_fields=['assigned_tutor', 'meeting_link'])
    except Exception as pe:
        logger.warning("Error updating StudentProfile in sync_student_tutor_change: %s", pe)

    # 4. Update Enrollments
    try:
        from students.models import Enrollment
        enr_qs = Enrollment.objects.filter(student__user=student_user)
        if subject_name:
            enr_qs = enr_qs.filter(subject__name__icontains=subject_name)
        enr_qs.update(tutor=new_tutor_user)
    except Exception as ee:
        logger.warning("Error updating Enrollments in sync_student_tutor_change: %s", ee)

    # 5. Update Bookings
    try:
        b_qs = Booking.objects.filter(student=student_user)
        if subject_name:
            b_qs = b_qs.filter(subject__icontains=subject_name)
        b_qs.update(tutor=new_tutor_user, tutor_declined=False)
    except Exception as be:
        logger.warning("Error updating Bookings in sync_student_tutor_change: %s", be)

    # 6. Notifications with generated class link for student & tutor
    try:
        from accounts.models import Notification
        new_tutor_name = new_tutor_user.get_full_name() or new_tutor_user.username
        student_name = student_user.get_full_name() or student_user.username
        subj_str = f" for {subject_name}" if subject_name else ""
        student_link = f"/live/{first_session_id}" if first_session_id else "/student/classes"
        tutor_link = f"/live/{first_session_id}" if first_session_id else "/tutor/schedule"

        # Student notification
        Notification.create(
            user=student_user,
            title="Tutor Changed & Class Link Ready",
            message=f"Admin has assigned {new_tutor_name} as your tutor{subj_str}. Your class link has been generated: {primary_class_link}",
            link=student_link
        )

        # New Tutor notification
        Notification.create(
            user=new_tutor_user,
            title="New Student Assigned & Class Link Ready",
            message=f"Admin assigned student {student_name} to you{subj_str}. Your class link has been generated: {primary_class_link}",
            link=tutor_link
        )

        # Old Tutor notification (if reassigned from another tutor)
        if old_tutor_user and old_tutor_user != new_tutor_user:
            Notification.create(
                user=old_tutor_user,
                title="Student Reassigned",
                message=f"Student {student_name}{subj_str} has been reassigned to another tutor by Admin.",
                link="/tutor/schedule"
            )

        # Admin notification
        Notification.notify_admins(
            title="Tutor Reassignment Completed",
            message=f"Student {student_name} reassigned to tutor {new_tutor_name}{subj_str}. Class link: {primary_class_link}",
            link="/admin/classes"
        )
    except Exception as ne:
        logger.warning("Notification error in sync_student_tutor_change: %s", ne)

    logger.info("Reassigned %s sessions for %s to %s. Link: %s", count, student_user.username, new_tutor_user.username, primary_class_link)
    return {
        "success": True,
        "count": count,
        "class_link": primary_class_link,
        "first_session_id": first_session_id
    }
import json
from .models import Booking, ScheduledSession

def check_tutor_conflict(tutor_user, proposed_schedule):
    """
    Checks if a tutor has any schedule overlaps with paid bookings or active enrollments.
    proposed_schedule: Can be:
        1. List of dicts: [{"day": "Monday", "time": "10:00-11:00"}] (Bookings)
        2. List of dicts with 'preferred_days'/'preferred_time': [{"preferred_days": "MONDAY", "preferred_time": "10:00"}] (Registration)
    Returns (True, message) if conflict exists, else (False, None)
    """
    from students.models import Enrollment
    from datetime import datetime
    
    # Helper to parse time strings like "10:00", "10:00 AM", "10:00-11:00"
    def parse_time_range(time_str):
        if not time_str: return None, None
        
        # Handle range like "10:00-11:00"
        if '-' in time_str:
            start_s, end_s = time_str.split('-', 1)
        else:
            start_s = time_str
            end_s = None # Will default to 1 hour later if needed
            
        def to_minutes(s):
            s = s.strip().upper()
            if not s: return None
            
            is_pm = 'PM' in s
            is_am = 'AM' in s
            clean_s = s.replace('AM', '').replace('PM', '').strip()
            
            try:
                parts = clean_s.split(':')
                h = int(parts[0])
                m = int(parts[1]) if len(parts) > 1 else 0
                
                if is_pm and h < 12: h += 12
                if is_am and h == 12: h = 0
                
                return h * 60 + m
            except:
                return None

        start_m = to_minutes(start_s)
        end_m = to_minutes(end_s) if end_s else (start_m + 60 if start_m is not None else None)
        
        return start_m, end_m

    # 1. Fetch Paid Bookings
    existing_bookings = Booking.objects.filter(tutor=tutor_user, paid=True)
    
    # 2. Fetch Approved Enrollments
    existing_enrollments = Enrollment.objects.filter(tutor=tutor_user, status='APPROVED')
    
    # Combine active recurring schedules
    active_schedules = []
    
    for b in existing_bookings:
        if b.schedule:
            try:
                active_schedules.append(json.loads(b.schedule))
            except: pass
            
    for e in existing_enrollments:
        if e.schedule:
            try:
                active_schedules.append(json.loads(e.schedule))
            except: pass

    # Normalize proposed schedule to common format
    normalized_proposed = []
    if isinstance(proposed_schedule, list):
        for slot in proposed_schedule:
            day = slot.get('day') or slot.get('preferred_days')
            time = slot.get('time') or slot.get('preferred_time')
            if day and time:
                start, end = parse_time_range(time)
                if start is not None:
                    normalized_proposed.append({
                        'day': day.strip().upper(),
                        'start': start,
                        'end': end,
                        'original_time': time
                    })

    # Normalization complete. First check explicitly set availability.
    def check_tutor_availability(tutor_usr, norm_proposed):
        from tutors.models import TutorAvailability
        
        availabilities = TutorAvailability.objects.filter(tutor__user=tutor_usr)
        if not availabilities.exists():
            return False, None # Lenient if no schedule set
            
        for p_slot in norm_proposed:
            day = p_slot['day']
            p_start = p_slot['start']
            p_end = p_slot['end']
            
            day_avails = availabilities.filter(day__iexact=day)
            fits = False
            for av in day_avails:
                av_start = av.start_time.hour * 60 + av.start_time.minute
                av_end = av.end_time.hour * 60 + av.end_time.minute
                if p_start >= av_start and p_end <= av_end:
                    fits = True
                    break
            if not fits:
                return True, f"Tutor is not available on {day} between {p_slot.get('original_time')}."
        return False, None

    has_avail_conflict, avail_msg = check_tutor_availability(tutor_user, normalized_proposed)
    if has_avail_conflict:
        return True, avail_msg

    # Compare each proposed slot against active slots (Double-booking check)
    for p_slot in normalized_proposed:
        for schedule_list in active_schedules:
            for active_slot in schedule_list:
                a_day = (active_slot.get('day') or active_slot.get('preferred_days', '')).strip().upper()
                a_time = (active_slot.get('time') or active_slot.get('preferred_time', '')).strip().upper()
                
                if a_day == p_slot['day']:
                    a_start, a_end = parse_time_range(a_time)
                    if a_start is not None:
                        # Check for overlap: (StartA < EndB) and (EndA > StartB)
                        if a_start < p_slot['end'] and a_end > p_slot['start']:
                            return True, f"Tutor is already busy on {p_slot['day']} during {a_time}."

    return False, None

def calculate_schedule_hours(schedule_list):
    """
    Parses a schedule list of dicts like [{"day": "MON", "time": "10:00-12:30"}]
    and returns the total decimal hours per week.
    Defaults to 1 hour for any malformed slot.
    """
    import datetime
    from decimal import Decimal
    
    if not schedule_list or not isinstance(schedule_list, list):
        return Decimal('1.0')
        
    total_hours = Decimal('0.0')
    fmt = "%H:%M"
    
    for slot in schedule_list:
        time_str = slot.get('time') or slot.get('preferred_time', '')
        if '-' in time_str:
            start_str, end_str = time_str.split('-', 1)
            try:
                start_dt = datetime.datetime.strptime(start_str.strip(), fmt)
                end_dt = datetime.datetime.strptime(end_str.strip(), fmt)
                diff = (end_dt - start_dt).total_seconds() / 3600.0
                if diff > 0:
                    total_hours += Decimal(str(diff))
                else:
                    total_hours += Decimal('1.0')
            except Exception:
                total_hours += Decimal('1.0')
        else:
            total_hours += Decimal('1.0')
            
    # Guarantee at least something is returned in edge cases
    if total_hours <= Decimal('0.0'):
        return Decimal('1.0')
        
    return total_hours
