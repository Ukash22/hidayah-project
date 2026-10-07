# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import django
from concurrent.futures import ThreadPoolExecutor

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Initialize Django BEFORE importing any app modules (e.g. consumers, routing)
# that touch Django models. Skipping this causes AppRegistryNotReady.
django.setup()

# Wire the thread pool executor that asgiref's SyncToAsync uses for
# non-thread-sensitive sync callables (ORM queries, admin views, DRF views).
# This must happen AFTER django.setup() but BEFORE the ASGI app is created.
# Simply declaring an ASGI_THREADS Django setting does nothing — the executor
# must be set directly on the class before any sync views are served.
from asgiref.sync import SyncToAsync  # noqa: E402
_asgi_threads = int(os.getenv('ASGI_THREADS', '10'))
SyncToAsync._executor = ThreadPoolExecutor(
    max_workers=_asgi_threads,
    thread_name_prefix='hidayah-sync',
)

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Safe to import routing now that Django is fully initialized
from whiteboard import routing as whiteboard_routing

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                whiteboard_routing.websocket_urlpatterns
            )
        )
    ),
})
