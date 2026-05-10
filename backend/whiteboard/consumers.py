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
            return # Just keep alive
            
        if event_type == 'draw':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_draw',
                    'data': text_data_json
                }
            )
        elif event_type == 'command':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_command',
                    'data': text_data_json
                }
            )

    # Receive draw event from room group
    async def send_draw(self, event):
        data = event['data']
        # Send message to WebSocket
        await self.send(text_data=json.dumps(data))

    # Receive command event from room group (e.g. lock, clear)
    async def send_command(self, event):
        data = event['data']
        await self.send(text_data=json.dumps(data))
