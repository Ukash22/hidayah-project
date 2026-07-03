import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'board_{self.room_id}'
        logger.debug("WebSocket attempt: room=%s user=%s", self.room_id, self.scope['user'])

        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.debug("WebSocket accepted: room=%s", self.room_id)
        except Exception as e:
            logger.error("WebSocket connection error: room=%s error=%s", self.room_id, e)
            await self.close()

    async def disconnect(self, close_code):
        logger.debug("WebSocket disconnected: room=%s code=%s", self.room_id, close_code)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
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
        elif event_type == 'command':
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
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'signaling_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.debug("WebRTC signaling connected: room=%s", self.room_id)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.debug("WebRTC signaling disconnected: room=%s", self.room_id)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
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
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['data']))
