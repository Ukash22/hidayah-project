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
# Celery worker is only used if USE_CELERY is explicitly True and REDIS_URL is provided.
# On free-tier Render or when no separate celery worker is running, tasks execute in the thread pool.
_CELERY_AVAILABLE = bool(os.getenv('REDIS_URL')) and (os.getenv('USE_CELERY', 'False').lower() in ('true', '1'))


def _run_in_thread(task, *args, **kwargs):
    try:
        if hasattr(task, 'apply'):
            task.apply(args=args, kwargs=kwargs)
        else:
            task(*args, **kwargs)
    except Exception as e:
        logger.exception("Background task execution failed: %s", e)


def run_async(celery_task, *args, **kwargs):
    """
    Dispatch celery_task via Celery if Celery worker is enabled, thread pool otherwise.
    All args must be JSON-serializable (use PKs, not model instances).
    """
    if _CELERY_AVAILABLE:
        try:
            celery_task.delay(*args, **kwargs)
            return
        except Exception as e:
            logger.warning("Celery dispatch failed, falling back to thread pool: %s", e)
    _executor.submit(_run_in_thread, celery_task, *args, **kwargs)
