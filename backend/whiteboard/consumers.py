import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'board_{self.room_id}'
        print(f"🔌 WebSocket Attempt: Room {self.room_id} | User: {self.scope.get('user', 'Anonymous')}")

        try:
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            print(f"✅ WebSocket Accepted: Room {self.room_id}")
        except Exception as e:
            print(f"❌ WebSocket Connection Error: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        print(f"❌ WebSocket Disconnected: Room {self.room_id} | Code: {close_code}")
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        event_type = text_data_json.get('type')

        # Broadcast the message to room group
        if event_type == 'ping':
            await self.send(text_data=json.dumps({"type": "pong"}))
            return # Just keep alive
            
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

    # Receive draw event from room group
    async def send_draw(self, event):
        if self.channel_name != event.get('sender_channel_name'):
            await self.send(text_data=json.dumps(event['data']))

    # Receive command event from room group
    async def send_command(self, event):
        if self.channel_name != event.get('sender_channel_name'):
            await self.send(text_data=json.dumps(event['data']))

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'signaling_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"✅ WebRTC Signaling Connected: Room {self.room_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"❌ WebRTC Signaling Disconnected: Room {self.room_id}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        event_type = text_data_json.get('type')

        if event_type == 'ping':
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        # Broadcast signaling messages to the room group, except the sender
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signaling_message',
                'data': text_data_json,
                'sender_channel_name': self.channel_name
            }
        )

    async def signaling_message(self, event):
        data = event['data']
        sender_channel_name = event['sender_channel_name']

        # Do not echo the message back to the sender
        if self.channel_name != sender_channel_name:
            await self.send(text_data=json.dumps(data))

