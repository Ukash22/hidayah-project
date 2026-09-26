import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_key):
    if not token_key:
        return AnonymousUser()
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(token_key)
        user_id = token.get('user_id')
        User = get_user_model()
        return User.objects.get(id=user_id)
    except Exception as e:
        logger.debug("WebSocket JWT auth error: %s", e)
        return AnonymousUser()


class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]
            if token:
                user = await get_user_from_token(token)
                self.scope['user'] = user

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'board_{self.room_id}'
        logger.debug("WebSocket board attempt: room=%s user=%s", self.room_id, self.scope.get('user'))

        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.debug("WebSocket board accepted: room=%s", self.room_id)
        except Exception as e:
            logger.error("WebSocket connection error: room=%s error=%s", self.room_id, e)
            await self.close()

    async def disconnect(self, close_code):
        logger.debug("WebSocket disconnected: room=%s code=%s", self.room_id, close_code)
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception:
            pass

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except Exception:
            return

        event_type = text_data_json.get('type')

        if event_type == 'ping':
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if event_type == 'draw':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_draw',
                    'data': text_data_json,
                    'sender_channel_name': self.channel_name
                }
            )
        else:
            # Handle 'command', 'page_sync', and any custom whiteboard signals
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_command',
                    'data': text_data_json,
                    'sender_channel_name': self.channel_name
                }
            )

    async def send_draw(self, event):
        if self.channel_name != event.get('sender_channel_name'):
            await self.send(text_data=json.dumps(event['data']))

    async def send_command(self, event):
        if self.channel_name != event.get('sender_channel_name'):
            await self.send(text_data=json.dumps(event['data']))


class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]
            if token:
                user = await get_user_from_token(token)
                self.scope['user'] = user

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'signaling_{self.room_id}'

        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.debug("WebRTC signaling connected: room=%s", self.room_id)
        except Exception as e:
            logger.error("WebRTC signaling connection error: room=%s error=%s", self.room_id, e)
            await self.close()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception:
            pass
        logger.debug("WebRTC signaling disconnected: room=%s", self.room_id)

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except Exception:
            return

        event_type = text_data_json.get('type')

        if event_type == 'ping':
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signaling_message',
                'data': text_data_json,
                'sender_channel_name': self.channel_name
            }
        )

    async def signaling_message(self, event):
        if self.channel_name != event.get('sender_channel_name'):
            await self.send(text_data=json.dumps(event['data']))

