# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from .celery import app as celery_app

__all__ = ('celery_app',)
