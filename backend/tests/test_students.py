# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the students API.

Performance: P1 index on StudentProfile.payment_status.
Security: student profile endpoints require authentication.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from students.models import StudentProfile


class StudentProfileIndexTests(TestCase):
    """P1: payment_status is a hot filter column and must stay indexed."""

    def test_payment_status_field_is_indexed(self):
        self.assertTrue(StudentProfile._meta.get_field('payment_status').db_index)


class StudentEndpointSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_endpoint_rejects_anonymous(self):
        res = self.client.get('/api/students/me/')
        self.assertIn(res.status_code, (401, 403))
