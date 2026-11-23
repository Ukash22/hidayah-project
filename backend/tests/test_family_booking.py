from decimal import Decimal
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from classes.models import Booking, ScheduledSession, Batch
from classes.family_pricing import calculate_family_fee
from students.models import StudentProfile, Enrollment
from tutors.models import TutorProfile
from parents.models import ParentProfile
from payments.services import fulfill_and_generate_sessions_for_booking

User = get_user_model()

class FamilyBookingPricingTests(TestCase):
    def test_single_student_individual_fee(self):
        # 1 student, 3000/hr, 1 hr/session, 2 days/week, 4 weeks = 8 sessions => 24,000
        quote = calculate_family_fee(
            tutor_hourly_rate=3000,
            hours_per_session=1.0,
            days_per_week=2,
            student_count=1,
            booking_type='INDIVIDUAL',
            weeks=4
        )
        self.assertEqual(quote['final_price'], 24000.00)
        self.assertEqual(quote['original_price'], 24000.00)
        self.assertEqual(quote['discount_amount'], 0.00)
        self.assertEqual(quote['discount_percentage'], 0.0)

    def test_shared_family_cohort_two_siblings(self):
        # 2 siblings shared:
        # Base per session = 3000
        # Multiplier = 1.0 (1st) + 0.35 (2nd) = 1.35
        # Per session = 4050
        # 8 sessions = 32,400 (vs 48,000 if booked as two separate 1-on-1s)
        # Sibling discount = 48000 - 32400 = 15,600 (32.5%)
        quote = calculate_family_fee(
            tutor_hourly_rate=3000,
            hours_per_session=1.0,
            days_per_week=2,
            student_count=2,
            booking_type='FAMILY_SHARED',
            weeks=4
        )
        self.assertEqual(quote['final_price'], 32400.00)
        self.assertEqual(quote['original_price'], 48000.00)
        self.assertEqual(quote['discount_amount'], 15600.00)
        self.assertEqual(quote['discount_percentage'], 32.5)

    def test_shared_family_cohort_three_siblings(self):
        # 3 siblings shared:
        # Base per session = 3000
        # Multiplier = 1.0 + 0.35 + 0.25 = 1.60
        # Per session = 4800
        # 8 sessions = 38,400 (vs 72,000)
        # Sibling discount = 72,000 - 38,400 = 33,600 (46.7%)
        quote = calculate_family_fee(
            tutor_hourly_rate=3000,
            hours_per_session=1.0,
            days_per_week=2,
            student_count=3,
            booking_type='FAMILY_SHARED',
            weeks=4
        )
        self.assertEqual(quote['final_price'], 38400.00)
        self.assertEqual(quote['original_price'], 72000.00)
        self.assertEqual(quote['discount_amount'], 33600.00)
        self.assertEqual(quote['discount_percentage'], 46.7)

    def test_family_bundle_separate_sessions(self):
        # 2 students, separate 1-on-1s => 10% volume discount
        # Original = 48,000; Discount 10% = 4,800; Final = 43,200
        quote = calculate_family_fee(
            tutor_hourly_rate=3000,
            hours_per_session=1.0,
            days_per_week=2,
            student_count=2,
            booking_type='FAMILY_BUNDLE',
            weeks=4
        )
        self.assertEqual(quote['original_price'], 48000.00)
        self.assertEqual(quote['discount_amount'], 4800.00)
        self.assertEqual(quote['discount_percentage'], 10.0)
        self.assertEqual(quote['final_price'], 43200.00)


class FamilyBookingLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent_user = User.objects.create_user(
            username='parent_fatima',
            email='fatima@example.com',
            password='password123',
            role='PARENT',
            first_name='Fatima',
            last_name='Ali'
        )
        ParentProfile.objects.create(user=self.parent_user, phone='08012345678', address='Abuja')

        # Create two children linked to this parent
        self.child1 = User.objects.create_user(
            username='child_zayd',
            email='zayd@example.com',
            password='password123',
            role='STUDENT',
            first_name='Zayd',
            last_name='Ali'
        )
        self.child1_prof, _ = StudentProfile.objects.get_or_create(user=self.child1)
        self.child1_prof.parent = self.parent_user
        self.child1_prof.save()

        self.child2 = User.objects.create_user(
            username='child_maryam',
            email='maryam@example.com',
            password='password123',
            role='STUDENT',
            first_name='Maryam',
            last_name='Ali'
        )
        self.child2_prof, _ = StudentProfile.objects.get_or_create(user=self.child2)
        self.child2_prof.parent = self.parent_user
        self.child2_prof.save()

        # Create Tutor
        self.tutor_user = User.objects.create_user(
            username='tutor_ahmad',
            email='ahmad@example.com',
            password='password123',
            role='TUTOR',
            first_name='Ahmad',
            last_name='Ibrahim'
        )
        self.tutor_prof, _ = TutorProfile.objects.get_or_create(user=self.tutor_user)
        self.tutor_prof.hourly_rate = Decimal('2000.00')
        self.tutor_prof.is_approved = True
        self.tutor_prof.live_class_link = 'https://meet.jit.si/hidayah-ahmad-room'
        self.tutor_prof.save()

    def test_api_family_pricing_quote(self):
        res = self.client.post('/api/classes/family-pricing/', {
            'tutor_id': self.tutor_prof.id,
            'hours_per_session': 1.0,
            'days_per_week': 2,
            'student_count': 2,
            'booking_type': 'FAMILY_SHARED',
            'weeks': 4
        }, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['booking_type'], 'FAMILY_SHARED')
        self.assertEqual(data['student_count'], 2)
        self.assertGreater(data['discount_amount'], 0)
        self.assertEqual(data['final_price'], 21600.00) # 2000 * 1.35 * 8 = 21,600

    def test_parent_create_family_booking_and_payment_fulfillment(self):
        self.client.force_authenticate(user=self.parent_user)
        schedule = [
            {"day": "Monday", "time": "16:00-17:00"},
            {"day": "Wednesday", "time": "16:00-17:00"}
        ]
        res = self.client.post('/api/classes/booking/request/', {
            'tutor_id': self.tutor_prof.id,
            'subject': 'Quran & Tajweed',
            'schedule': schedule,
            'hours_per_session': 1.0,
            'booking_type': 'FAMILY_SHARED',
            'student_ids': [self.child1.id, self.child2.id],
            'preferred_start_date': str(timezone.now().date())
        }, format='json')

        self.assertEqual(res.status_code, 201)
        booking_id = res.json()['id']
        booking = Booking.objects.get(id=booking_id)

        # Verify Booking model fields
        self.assertEqual(booking.parent, self.parent_user)
        self.assertEqual(booking.booking_type, 'FAMILY_SHARED')
        self.assertEqual(booking.participating_students.count(), 2)
        self.assertEqual(booking.price, Decimal('21600.00'))
        self.assertEqual(booking.original_price, Decimal('32000.00'))
        self.assertEqual(booking.sibling_discount_amount, Decimal('10400.00'))

        # Now simulate payment completion via fulfill_and_generate_sessions_for_booking
        booking.paid = True
        booking.save()
        fulfilled = fulfill_and_generate_sessions_for_booking(booking)
        self.assertTrue(fulfilled)

        booking.refresh_from_db()
        self.assertTrue(booking.paid)
        self.assertTrue(booking.approved)

        # Verify Batch created with both children
        batches = Batch.objects.filter(tutor=self.tutor_user)
        self.assertEqual(batches.count(), 1)
        family_batch = batches.first()
        self.assertIn(self.child1, family_batch.students.all())
        self.assertIn(self.child2, family_batch.students.all())

        # Verify ScheduledSessions created for both children
        child1_sessions = ScheduledSession.objects.filter(student=self.child1, tutor=self.tutor_user)
        child2_sessions = ScheduledSession.objects.filter(student=self.child2, tutor=self.tutor_user)
        self.assertEqual(child1_sessions.count(), 8)
        self.assertEqual(child2_sessions.count(), 8)

        # Verify meeting link is populated from tutor's profile
        first_session = child1_sessions.first()
        self.assertEqual(first_session.meeting_link, 'https://meet.jit.si/hidayah-ahmad-room')
        self.assertEqual(first_session.batch, family_batch)

        # Verify StudentProfiles updated to PAID and assigned tutor
        self.child1_prof.refresh_from_db()
        self.child2_prof.refresh_from_db()
        self.assertEqual(self.child1_prof.payment_status, 'PAID')
        self.assertEqual(self.child2_prof.payment_status, 'PAID')
        self.assertEqual(self.child1_prof.assigned_tutor, self.tutor_user)
        self.assertEqual(self.child2_prof.assigned_tutor, self.tutor_user)
        self.assertEqual(self.child1_prof.meeting_link, 'https://meet.jit.si/hidayah-ahmad-room')
        self.assertEqual(self.child2_prof.meeting_link, 'https://meet.jit.si/hidayah-ahmad-room')


class StudentRegistrationBookingLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            username='admin_boss',
            email='admin_boss@example.com',
            password='password123',
            role='ADMIN'
        )

        self.tutor_user = User.objects.create_user(
            username='tutor_zayd',
            email='tutor_zayd@example.com',
            password='password123',
            role='TUTOR',
            first_name='Zayd',
            last_name='Tutor'
        )
        self.tutor_prof, _ = TutorProfile.objects.get_or_create(user=self.tutor_user)
        self.tutor_prof.hourly_rate = Decimal('3000.00')
        self.tutor_prof.is_approved = True
        self.tutor_prof.live_class_link = 'https://meet.jit.si/hidayah-zayd-room'
        self.tutor_prof.save()

    def test_student_registration_creates_pending_booking_and_requires_payment(self):
        # 1. Register student with tutor and subject
        reg_payload = {
            'username': 'student_ibrahim',
            'email': 'ibrahim@example.com',
            'password': 'SecurePassword123!',
            'first_name': 'Ibrahim',
            'last_name': 'Musa',
            'role': 'STUDENT',
            'class_type': 'ONE_ON_ONE',
            'level': 'PRIMARY',
            'days_per_week': 2,
            'hours_per_week': 2.0,
            'preferred_days': 'Monday,Wednesday',
            'preferred_time_exact': '16:00,16:00',
            'preferred_tutor_id': self.tutor_user.id,
            'subject_enrollments': [
                {'subject': 'Quran & Tajweed', 'preferred_tutor_id': self.tutor_user.id}
            ]
        }
        res = self.client.post('/api/auth/register/', reg_payload, format='json')
        self.assertEqual(res.status_code, 201, res.data if hasattr(res, 'data') else res.content)

        student_user = User.objects.get(username='student_ibrahim')
        profile = StudentProfile.objects.get(user=student_user)

        # 2. Check profile: status UNPAID and PENDING
        self.assertEqual(profile.payment_status, 'UNPAID')
        self.assertEqual(profile.approval_status, 'PENDING')
        self.assertEqual(profile.assigned_tutor, self.tutor_user)

        # 3. Check enrollment: status PENDING
        enrollments = Enrollment.objects.filter(student=profile)
        self.assertEqual(enrollments.count(), 1)
        enr = enrollments.first()
        self.assertEqual(enr.status, 'PENDING')
        self.assertEqual(enr.tutor, self.tutor_user)

        # 4. Check Booking: exists, paid=False, approved=False
        bookings = Booking.objects.filter(student=student_user)
        self.assertEqual(bookings.count(), 1)
        booking = bookings.first()
        self.assertFalse(booking.paid)
        self.assertFalse(booking.approved)
        self.assertEqual(booking.tutor, self.tutor_user)
        self.assertEqual(booking.subject, 'Quran & Tajweed')
        # 3000/hr * 1 hr * 2 days * 4 weeks = 24,000
        self.assertEqual(booking.price, Decimal('24000.00'))

        # 5. Crucial: NO sessions generated prematurely
        sessions_count = ScheduledSession.objects.filter(student=student_user).count()
        self.assertEqual(sessions_count, 0)

        # 6. Student queries booking request endpoint: sees pending booking
        self.client.force_authenticate(user=student_user)
        book_res = self.client.get('/api/classes/booking/request/')
        self.assertEqual(book_res.status_code, 200)
        book_data = book_res.json()
        self.assertEqual(len(book_data), 1)
        self.assertFalse(book_data[0]['paid'])
        self.assertEqual(float(book_data[0]['price']), 24000.0)

        # 7. Student queries sessions: receives 0 sessions
        sess_res = self.client.get('/api/classes/sessions/')
        self.assertEqual(sess_res.status_code, 200)
        sess_data = sess_res.json()
        results = sess_data.get('results', sess_data) if isinstance(sess_data, dict) else sess_data
        self.assertEqual(len(results), 0)

        # 8. Student pays via wallet
        from payments.models import Wallet
        wallet, _ = Wallet.objects.get_or_create(user=student_user)
        wallet.balance = Decimal('30000.00')
        wallet.save()

        pay_res = self.client.post(f'/api/payments/booking/wallet-pay/{booking.id}/')
        self.assertEqual(pay_res.status_code, 200)
        booking.refresh_from_db()
        self.assertTrue(booking.paid)
        self.assertFalse(booking.approved) # Waiting for admin approval!

        # 9. Still 0 sessions because awaiting admin approval
        self.assertEqual(ScheduledSession.objects.filter(student=student_user).count(), 0)

        # 10. Admin approves booking
        self.client.force_authenticate(user=self.admin_user)
        appr_res = self.client.post(f'/api/classes/admin/bookings/{booking.id}/action/', {'action': 'approve'}, format='json')
        self.assertEqual(appr_res.status_code, 200)

        booking.refresh_from_db()
        self.assertTrue(booking.approved)

        # 11. Sessions and class links now fully generated!
        sessions = ScheduledSession.objects.filter(student=student_user)
        self.assertEqual(sessions.count(), 8)
        first_session = sessions.first()
        self.assertEqual(first_session.meeting_link, 'https://meet.jit.si/hidayah-zayd-room')

        # 12. Student dashboard sessions endpoint now returns active classes
        self.client.force_authenticate(user=student_user)
        active_sess_res = self.client.get('/api/classes/sessions/')
        self.assertEqual(active_sess_res.status_code, 200)
        active_data = active_sess_res.json()
        active_results = active_data.get('results', active_data) if isinstance(active_data, dict) else active_data
        self.assertEqual(len(active_results), 8)

