from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/board/(?P<room_id>\w+)/$', consumers.BoardConsumer.as_asgi()),
]
