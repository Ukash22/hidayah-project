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
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Initialize Django BEFORE importing any app modules (e.g. consumers, routing)
# that touch Django models. Skipping this causes AppRegistryNotReady.
django.setup()

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
