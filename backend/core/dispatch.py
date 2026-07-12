# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Async task dispatcher.

Uses Celery when REDIS_URL is set (production / staging with a worker deployed).
Falls back to a thread pool otherwise (local dev, free-tier deploys without a worker).

Usage:
    from core.dispatch import run_async
    from core.tasks import some_task
    run_async(some_task, arg1, arg2)
"""
import os
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4)
_CELERY_AVAILABLE = bool(os.getenv('REDIS_URL'))


def run_async(celery_task, *args, **kwargs):
    """
    Dispatch celery_task via Celery if Redis is available, thread pool otherwise.
    All args must be JSON-serializable (use PKs, not model instances).
    Celery tasks are also plain callables, so the thread pool path runs them directly.
    """
    if _CELERY_AVAILABLE:
        try:
            celery_task.delay(*args, **kwargs)
            return
        except Exception as e:
            logger.warning("Celery dispatch failed, falling back to thread pool: %s", e)
    _executor.submit(celery_task, *args, **kwargs)
