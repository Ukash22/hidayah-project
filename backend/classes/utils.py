from .models import ScheduledSession
from django.utils import timezone

def sync_student_tutor_change(student_user, new_tutor_user):
    """
    Automated logic to reassign all upcoming/PENDING sessions from old tutor to new one.
    Triggered when an Admin changes the student's assigned tutor.
    """
    # Find all PENDING sessions for this student
    pending_sessions = ScheduledSession.objects.filter(
        student=student_user, 
        status='PENDING'
    )
    
    count = pending_sessions.update(
        tutor=new_tutor_user,
        meeting_link=None, # Force new links to be generated if they were tutor-specific
        whiteboard_link=None
    )
    
    print(f"DEBUG: Reassigned {count} sessions for {student_user.username} to {new_tutor_user.username}")
    return count
import json
from .models import Booking, ScheduledSession

def check_tutor_conflict(tutor_user, proposed_schedule):
    """
    Checks if a tutor has any schedule overlaps with paid bookings or active enrollments.
    proposed_schedule: Can be:
        1. List of dicts: [{"day": "Monday", "time": "10:00"}] (Bookings)
        2. List of dicts with 'preferred_days'/'preferred_time': [{"preferred_days": "MONDAY", "preferred_time": "10:00"}] (Registration)
    Returns (True, message) if conflict exists, else (False, None)
    """
    from students.models import Enrollment
    
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
                normalized_proposed.append({'day': day.strip().upper(), 'time': time.strip().upper()})

    # Compare each proposed slot against active slots
    for proposed_slot in normalized_proposed:
        p_day = proposed_slot.get('day')
        p_time = proposed_slot.get('time')
        
        for schedule_list in active_schedules:
            for active_slot in schedule_list:
                a_day = (active_slot.get('day') or active_slot.get('preferred_days', '')).strip().upper()
                a_time = (active_slot.get('time') or active_slot.get('preferred_time', '')).strip().upper()
                
                if a_day == p_day and a_time == p_time:
                    return True, f"Tutor is already busy on {p_day} at {p_time}."

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
