import json
from decimal import Decimal
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from classes.models import Booking, ScheduledSession
from tutors.models import TutorProfile
from students.models import StudentProfile
from payments.models import Wallet, Transaction
from payments.services import process_payment, fulfill_and_generate_sessions_for_booking

User = get_user_model()

class BookingLifecycleEnhancedTests(APITestCase):
    def setUp(self):
        self.student_user = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='Password123!',
            role='STUDENT'
        )
        self.student_profile, _ = StudentProfile.objects.get_or_create(
            user=self.student_user
        )

        self.tutor_user1 = User.objects.create_user(
            username='tutor1',
            email='tutor1@test.com',
            password='Password123!',
            role='TUTOR'
        )
        self.tutor_profile1, _ = TutorProfile.objects.get_or_create(
            user=self.tutor_user1,
            defaults={'hourly_rate': Decimal('2000.00'), 'status': 'APPROVED'}
        )
        self.tutor_profile1.hourly_rate = Decimal('2000.00')
        self.tutor_profile1.status = 'APPROVED'
        self.tutor_profile1.save()

        self.tutor_user2 = User.objects.create_user(
            username='tutor2',
            email='tutor2@test.com',
            password='Password123!',
            role='TUTOR'
        )
        self.tutor_profile2, _ = TutorProfile.objects.get_or_create(
            user=self.tutor_user2,
            defaults={'hourly_rate': Decimal('2500.00'), 'status': 'APPROVED'}
        )
        self.tutor_profile2.hourly_rate = Decimal('2500.00')
        self.tutor_profile2.status = 'APPROVED'
        self.tutor_profile2.save()

        self.admin_user = User.objects.create_superuser(
            username='admin1',
            email='admin1@test.com',
            password='Password123!',
            role='ADMIN'
        )

    def test_booking_payment_and_tutor_approval_generates_classes(self):
        # 1. Student creates booking for a subject
        self.client.force_authenticate(user=self.student_user)
        schedule = [{"day": "Monday", "time": "10:00"}]
        res = self.client.post('/api/classes/booking/request/', {
            'tutor_id': self.tutor_profile1.id,
            'subject': 'Mathematics',
            'schedule': schedule,
            'hours_per_session': 1.0,
            'preferred_start_date': '2026-11-10'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        booking_id = res.data['id']
        booking = Booking.objects.get(id=booking_id)

        # Ensure booking starts as UNPAID and UNAPPROVED
        self.assertFalse(booking.paid)
        self.assertFalse(booking.approved)

        # 2. Student pays for the booking via wallet
        wallet, _ = Wallet.objects.get_or_create(user=self.student_user)
        wallet.balance = Decimal('50000.00')
        wallet.save()
        pay_res = self.client.post(f'/api/payments/booking/wallet-pay/{booking.id}/')
        self.assertEqual(pay_res.status_code, 200)

        booking.refresh_from_db()
        self.assertTrue(booking.paid)
        self.assertFalse(booking.approved) # Paid, but waiting for tutor approval

        # Ensure NO classes are generated before approval
        session_count = ScheduledSession.objects.filter(student=self.student_user).count()
        self.assertEqual(session_count, 0)

        # 3. Check serializer status and approval message
        list_res = self.client.get('/api/classes/booking/request/')
        student_booking_data = [b for b in list_res.data if b['id'] == booking.id][0]
        self.assertEqual(student_booking_data['status'], 'AWAITING_APPROVAL')
        self.assertIn("Wait for approval of your tutor", student_booking_data['approval_message'])

        # 4. Tutor approves the booking request
        self.client.force_authenticate(user=self.tutor_user1)
        app_res = self.client.post(f'/api/classes/booking/{booking.id}/approve/')
        self.assertEqual(app_res.status_code, 200)

        booking.refresh_from_db()
        self.assertTrue(booking.approved)
        self.assertTrue(booking.paid)

        # Classes MUST now be generated!
        sessions = ScheduledSession.objects.filter(student=self.student_user, tutor=self.tutor_user1)
        self.assertGreater(sessions.count(), 0)

    def test_admin_can_assign_new_tutor_and_generate_classes(self):
        # 1. Create paid booking awaiting tutor
        booking = Booking.objects.create(
            student=self.student_user,
            tutor=self.tutor_user1,
            subject='Physics',
            price=Decimal('10000.00'),
            schedule=json.dumps([{"day": "Tuesday", "time": "14:00"}]),
            hours_per_week=1,
            hours_per_session=Decimal('1.0'),
            approved=False,
            paid=True
        )

        # No sessions initially
        self.assertEqual(ScheduledSession.objects.filter(student=self.student_user).count(), 0)

        # 2. Admin views paid bookings awaiting approval
        self.client.force_authenticate(user=self.admin_user)
        admin_res = self.client.get('/api/classes/admin/bookings/?status=paid_awaiting_approval')
        self.assertEqual(admin_res.status_code, 200)
        found = any(b['id'] == booking.id for b in admin_res.data)
        self.assertTrue(found)

        # 3. Admin assigns new tutor (tutor 2)
        assign_res = self.client.post(f'/api/classes/admin/bookings/{booking.id}/action/', {
            'tutor_id': self.tutor_user2.id,
            'action': 'approve'
        }, format='json')
        self.assertEqual(assign_res.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.tutor, self.tutor_user2)
        self.assertTrue(booking.approved)
        self.assertTrue(booking.paid)

        # Classes MUST now be generated for tutor 2!
        sessions = ScheduledSession.objects.filter(student=self.student_user, tutor=self.tutor_user2)
        self.assertGreater(sessions.count(), 0)
        self.assertTrue(all(bool(s.meeting_link) for s in sessions))

    def test_admin_can_change_tutor_at_any_time_and_notifies_with_class_link(self):
        from accounts.models import Notification
        from classes.utils import sync_student_tutor_change
        from programs.models import Program, Subject
        import datetime
        from django.utils import timezone

        prog, _ = Program.objects.get_or_create(name='General', defaults={'program_type': 'WESTERN'})
        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'program': prog})

        # 1. Setup active session with tutor 1
        session = ScheduledSession.objects.create(
            student=self.student_user,
            tutor=self.tutor_user1,
            subject=subj,
            scheduled_at=timezone.now() + datetime.timedelta(days=2),
            duration=60,
            status='PENDING',
            meeting_link='http://localhost:5173/live/old-link'
        )

        # 2. Admin changes tutor to tutor 2
        result = sync_student_tutor_change(
            student_user=self.student_user,
            new_tutor_user=self.tutor_user2,
            old_tutor_user=self.tutor_user1,
            subject_name='Mathematics'
        )

        self.assertTrue(result['success'])
        self.assertIsNotNone(result['class_link'])

        # Session should be reassigned to tutor 2 and link regenerated
        session.refresh_from_db()
        self.assertEqual(session.tutor, self.tutor_user2)
        self.assertIsNotNone(session.meeting_link)
        self.assertIn(str(session.id), session.meeting_link)

        # Student notification must contain the new class link
        student_notif = Notification.objects.filter(
            user=self.student_user,
            title__icontains="Tutor Changed"
        ).first()
        self.assertIsNotNone(student_notif)
        self.assertIn(session.meeting_link, student_notif.message)

        # New tutor notification must contain the class link
        new_tutor_notif = Notification.objects.filter(
            user=self.tutor_user2,
            title__icontains="New Student Assigned"
        ).first()
        self.assertIsNotNone(new_tutor_notif)
        self.assertIn(session.meeting_link, new_tutor_notif.message)

        # Old tutor notification exists
        old_tutor_notif = Notification.objects.filter(
            user=self.tutor_user1,
            title__icontains="Student Reassigned"
        ).first()
        self.assertIsNotNone(old_tutor_notif)

