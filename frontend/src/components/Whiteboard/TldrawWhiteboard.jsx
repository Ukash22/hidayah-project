import React, { useEffect, useState, useCallback } from 'react';
import { Tldraw, useEditor, createTLStore, defaultShapeUtils } from 'tldraw';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import 'tldraw/tldraw.css';

// Custom Sync Component for Tldraw
const WhiteboardSync = ({ roomId, role, targetClientId = null }) => {
    const editor = useEditor();
    
    const socketUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/board/${roomId}/`;
    
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
    });

    // 1. Send Local Changes
    useEffect(() => {
        if (!editor || readyState !== ReadyState.OPEN) return;

        const unsubscribe = editor.store.listen((update) => {
            if (update.source === 'remote') return;

            sendMessage(JSON.stringify({
                type: 'draw',
                clientId: editor.user.getId(),
                role: role,
                update: update.changes
            }));
        }, { source: 'user', scope: 'document' });

        return () => unsubscribe();
    }, [editor, readyState, sendMessage, role]);

    // 2. Receive Changes based on Role
    useEffect(() => {
        if (!editor || !lastMessage) return;

        try {
            const data = JSON.parse(lastMessage.data);
            
            if (data.type === 'send_draw' && data.data.clientId !== editor.user.getId()) {
                const senderRole = data.data.role;
                const senderId = data.data.clientId;
                const changes = data.data.update;

                let shouldApply = false;

                if (role === 'STUDENT') {
                    // Students ONLY accept drawings from the TEACHER
                    if (senderRole === 'TEACHER' || senderRole === 'ADMIN') {
                        shouldApply = true;
                    }
                } else if (role === 'TEACHER' || role === 'ADMIN') {
                    // If this is the main teacher board, ignore student drawings.
                    // If this is a mini-board for a specific student (targetClientId), accept only theirs.
                    if (targetClientId === senderId) {
                        shouldApply = true;
                    } else if (!targetClientId && (senderRole === 'TEACHER' || senderRole === 'ADMIN')) {
                         // Co-teachers syncing main boards
                        shouldApply = true;
                    }
                }

                if (shouldApply) {
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
            } else if (data.type === 'send_command' && data.data.action === 'push_board') {
                 // Teacher pushed their entire board to overwrite students
                 if (role === 'STUDENT') {
                     editor.store.mergeRemoteChanges(() => {
                         editor.store.clear();
                         Object.values(data.data.snapshot).forEach(record => editor.store.put([record]));
                     });
                 }
            }
        } catch (e) {
            console.error("Failed to parse websocket message", e);
        }
    }, [lastMessage, editor, role, targetClientId]);

    // Expose a global function for the teacher to trigger a push
    useEffect(() => {
        if (role === 'TEACHER' || role === 'ADMIN') {
            window.pushTeacherBoard = () => {
                const snapshot = editor.store.allRecords();
                sendMessage(JSON.stringify({
                    type: 'command',
                    action: 'push_board',
                    snapshot: snapshot
                }));
                alert("Board pushed to all students!");
            };
        }
    }, [editor, role, sendMessage]);

    return null;
};

const TldrawWhiteboard = ({ roomId, role }) => {
  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Teacher Toolbar */}
      {(role === 'TEACHER' || role === 'ADMIN') && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 flex gap-2">
              <button 
                  onClick={() => window.pushTeacherBoard && window.pushTeacherBoard()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Push to Students
              </button>
              <button 
                  onClick={() => alert("Student Grid View will open here in a modal.")}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Monitor Students
              </button>
          </div>
      )}

      <div className="flex-1 relative">
        <Tldraw inferDarkMode>
            <WhiteboardSync roomId={roomId} role={role} />
        </Tldraw>
      </div>
    </div>
  );
};

export default TldrawWhiteboard;
