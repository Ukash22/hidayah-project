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

