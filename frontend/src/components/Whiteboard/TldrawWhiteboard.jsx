import React, { useEffect } from 'react';
import { Tldraw, useEditor } from 'tldraw';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import 'tldraw/tldraw.css';

// Sync Component that runs inside Tldraw context
const WhiteboardSync = ({ roomId }) => {
    const editor = useEditor();
    
    // Connect to Django Channels WebSocket
    // In production, WS_URL should be wss://hidayah-backend-zgix.onrender.com
    const socketUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/board/${roomId}/`;
    
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
    });

    // 1. Listen to Local Tldraw changes and send to WebSocket
    useEffect(() => {
        if (!editor || readyState !== ReadyState.OPEN) return;

        const unsubscribe = editor.store.listen((update) => {
            if (update.source === 'remote') return;

            // Send the drawing data to the Django server
            sendMessage(JSON.stringify({
                type: 'draw',
                clientId: editor.user.getId(),
                update: update.changes
            }));
        }, { source: 'user', scope: 'document' }); // Only listen to user document changes

        return () => unsubscribe();
    }, [editor, readyState, sendMessage]);

    // 2. Receive changes from WebSocket and apply to Tldraw
    useEffect(() => {
        if (!editor || !lastMessage) return;

        try {
            const data = JSON.parse(lastMessage.data);
            
            // If it's a draw event from someone else
            if (data.type === 'send_draw' && data.data.clientId !== editor.user.getId()) {
                const changes = data.data.update;
                
                // Merge remote changes into local store safely
                editor.store.mergeRemoteChanges(() => {
                    if (changes.added) {
                        Object.values(changes.added).forEach(record => editor.store.put([record]));
                    }
                    if (changes.updated) {
                        Object.values(changes.updated).forEach(([_, record]) => editor.store.put([record]));
                    }
                    if (changes.removed) {
                        Object.values(changes.removed).forEach(record => editor.store.remove([record.id]));
                    }
                });
            }
        } catch (e) {
            console.error("Failed to parse websocket message", e);
        }
    }, [lastMessage, editor]);

    return null;
};

const TldrawWhiteboard = ({ roomId, role }) => {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw inferDarkMode>
          <WhiteboardSync roomId={roomId} />
      </Tldraw>
    </div>
  );
};

export default TldrawWhiteboard;
