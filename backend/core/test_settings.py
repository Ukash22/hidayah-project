# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Test-only settings: identical to core.settings but with fast password
hashing — user creation dominates suite runtime otherwise.

Usage: python manage.py test tests --settings=core.test_settings
"""
from .settings import *  # noqa: F401,F403

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
