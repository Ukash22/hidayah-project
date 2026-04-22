import json
import datetime
import uuid
from django.utils import timezone
from decimal import Decimal
from .models import ScheduledSession

def generate_recurring_sessions(student, tutor, subject_obj, schedule_data, fee_per_session=0, weeks=4, start_date=None):
    """
    Generates a series of ScheduledSession objects based on a weekly schedule.
    - student: User object
    - tutor: User object
    - subject_obj: Subject object
    - schedule_data: List of dicts [{"day": "Monday", "time": "10:00"}] or JSON string
    - fee_per_session: Decimal amount to attribute to each session
    - weeks: Number of weeks to generate (Default 4)
    - start_date: Optional specific start date (date object or string)
    """
    if not schedule_data:
        return []

    # Parse JSON if necessary
    if isinstance(schedule_data, str):
        try:
            schedule_data = json.loads(schedule_data)
        except:
            return []

    day_map = {
        'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3,
        'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6
    }
    
    # Get Tutor's Meeting Links
    meeting_link = None
    whiteboard_link = None
    if hasattr(tutor, 'tutor_profile'):
        meeting_link = tutor.tutor_profile.live_class_link
        whiteboard_link = tutor.tutor_profile.live_class_link # Use same for now or leave blank

    if not start_date:
        start_date = timezone.now().date()
    elif isinstance(start_date, str):
        try:
            # Handle YYYY-MM-DD
            start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        except:
            start_date = timezone.now().date()
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    sessions_created = []

    for week_offset in range(weeks):
        for slot in schedule_data:
            day_name = slot.get('day') or slot.get('preferred_days')
            time_str = slot.get('time') or slot.get('preferred_time')
            
            if not day_name or not time_str:
                continue
                
            target_weekday = day_map.get(day_name.strip().upper())
            if target_weekday is None:
                continue
            
            # Find the first occurrence of this weekday on or after the start_date
            days_ahead = (target_weekday - start_date.weekday()) % 7
            
            # Add weeks
            total_days_ahead = days_ahead + (week_offset * 7)
            
            session_date = start_date + datetime.timedelta(days=total_days_ahead)
            
            try:
                # Handle time formats: "10:00", "10:00 AM", or ranges "10:00-11:00"
                pure_time = time_str.split('-')[0].strip() # Get start time if range
                
                # Check for AM/PM
                if 'AM' in pure_time or 'PM' in pure_time:
                    dt_time = datetime.datetime.strptime(pure_time, "%I:%M %p").time()
                else:
                    h, m = map(int, pure_time.split(':')[:2])
                    dt_time = datetime.datetime.combine(session_date, datetime.time(h, m)).time()
                
                session_at = timezone.make_aware(datetime.datetime.combine(session_date, dt_time))
                
                # Auto-generate a secure random Jitsi link if the tutor doesn't have a personal link
                if not meeting_link:
                    room_id = f"Hidayah-Session-{uuid.uuid4().hex[:12]}"
                    final_meeting_link = f"https://meet.jit.si/{room_id}"
                    final_whiteboard_link = final_meeting_link
                else:
                    final_meeting_link = meeting_link
                    final_whiteboard_link = whiteboard_link

                # Create the session
                session = ScheduledSession.objects.create(
                    student=student,
                    tutor=tutor,
                    subject=subject_obj,
                    scheduled_at=session_at,
                    duration=60,
                    fee_amount=Decimal(str(fee_per_session)),
                    meeting_link=final_meeting_link,
                    whiteboard_link=final_whiteboard_link,
                    status='PENDING'
                )
                sessions_created.append(session)
            except Exception as e:
                print(f"Error creating session for {day_name} {time_str}: {e}")

    return sessions_created
