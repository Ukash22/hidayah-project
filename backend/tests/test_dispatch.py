# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Tests for the async task dispatcher (P2).

run_async must use Celery when Redis is configured, and degrade to the
thread pool both when Redis is absent and when Celery dispatch fails —
so deploys without a worker never lose functionality.
"""
import threading
from unittest import mock

from django.test import SimpleTestCase

from core import dispatch


class DispatchTests(SimpleTestCase):
    def test_thread_pool_runs_task_when_celery_unavailable(self):
        done = threading.Event()
        received = {}

        def task(a, b=None):
            received['args'] = (a, b)
            done.set()

        with mock.patch.object(dispatch, '_CELERY_AVAILABLE', False):
            dispatch.run_async(task, 1, b=2)

        self.assertTrue(done.wait(timeout=5), 'task never ran on the thread pool')
        self.assertEqual(received['args'], (1, 2))

    def test_celery_delay_used_when_available(self):
        task = mock.Mock()
        with mock.patch.object(dispatch, '_CELERY_AVAILABLE', True):
            dispatch.run_async(task, 5, key='v')
        task.delay.assert_called_once_with(5, key='v')
        task.assert_not_called()  # must not also run inline

    def test_falls_back_to_thread_pool_when_delay_raises(self):
        done = threading.Event()
        task = mock.Mock(side_effect=lambda *a, **k: done.set())
        task.delay.side_effect = ConnectionError('redis down')

        with mock.patch.object(dispatch, '_CELERY_AVAILABLE', True):
            dispatch.run_async(task, 9)

        self.assertTrue(done.wait(timeout=5), 'fallback to thread pool did not happen')
        task.assert_called_once_with(9)
