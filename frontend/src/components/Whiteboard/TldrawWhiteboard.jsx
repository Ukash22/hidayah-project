import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../services/api';
import { Tldraw, useEditor } from 'tldraw';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as pdfjsLib from 'pdfjs-dist';
import 'tldraw/tldraw.css';

// CSS to hide all possible Tldraw license watermarks and menus in production
const watermarkStyle = `
  .tl-watermark, 
  .tl-ui-watermark,
  [data-testid="tl-ui-watermark"],
  .tl-canvas__watermark,
  [data-testid="tl-ui-menu-item-license"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
 
const ToolButton = ({ icon, onClick, title, active }) => (
    <button 
        onClick={onClick}
        title={title}
        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-[#1e293b] text-white shadow-xl scale-110' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
    >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {icon}
        </svg>
    </button>
);

const SidebarToolbar = ({ editor, activeTab }) => {
    if (!editor || (activeTab !== 'my_board' && activeTab !== 'student_view')) return null;
 
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
 
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const typedarray = new Uint8Array(reader.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const shapes = [];
                let yOffset = 100;
 
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const dataUrl = canvas.toDataURL('image/png');
                    shapes.push({
                        type: 'image',
                        x: 100, y: yOffset,
                        props: { src: dataUrl, w: viewport.width, h: viewport.height }
                    });
                    yOffset += viewport.height + 50;
                }
                editor.createShapes(shapes);
            } catch (err) { console.error("PDF Load Error:", err); alert("Failed to load PDF."); }
        };
        reader.readAsArrayBuffer(file);
    };
 
    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-white p-3 rounded-[2rem] shadow-2xl border border-slate-200 z-[1000]">
            <ToolButton 
                icon={<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>} 
                onClick={() => document.getElementById('image-upload').click()} 
                title="Image" 
            />
            <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        editor.createShapes([{ type: 'image', x: 100, y: 100, props: { src: reader.result, w: 300, h: 300 } }]);
                    };
                    reader.readAsDataURL(file);
                }
            }} />
 
            <ToolButton 
                icon={<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/>} 
                onClick={() => document.getElementById('pdf-upload').click()} 
                title="PDF" 
            />
            <input type="file" id="pdf-upload" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
            
            <div className="h-px w-8 bg-slate-100 mx-auto"></div>
            
            <ToolButton 
                icon={<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>} 
                onClick={() => window.openWhiteboardLibrary && window.openWhiteboardLibrary()} 
                title="Library" 
            />
        </div>
    );
};

const LibraryModal = ({ editor, onClose }) => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [titleInput, setTitleInput] = useState('');

    useEffect(() => {
        api.get('/api/whiteboard/library/')
            .then(res => setBoards(res.data))
            .catch(err => console.error('Failed to load library', err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!editor) return;
        const title = titleInput.trim() || `Board ${new Date().toLocaleDateString()}`;
        const snapshot = editor.store.allRecords();
        setSaving(true);
        try {
            const res = await api.post('/api/whiteboard/library/', { title, snapshot });
            setBoards(prev => [{ id: res.data.id, title, created_at: new Date().toISOString() }, ...prev]);
            setTitleInput('');
            alert('Board saved to library!');
        } catch (err) {
            alert('Failed to save board.');
        } finally {
            setSaving(false);
        }
    };

    const handleLoad = (board) => {
        if (!editor) return;
        if (!window.confirm(`Load "${board.title}"? Your current board will be overwritten.`)) return;
        editor.store.mergeRemoteChanges(() => {
            editor.store.clear();
            Object.values(board.snapshot).forEach(record => editor.store.put([record]));
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900">📚 My Board Library</h2>
                    <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-600 transition-all">✕</button>
                </div>

                <div className="p-6 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-500 mb-3">Save current board</p>
                    <div className="flex gap-2">
                        <input
                            value={titleInput}
                            onChange={e => setTitleInput(e.target.value)}
                            placeholder="Board title (optional)"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400 font-bold">Loading library...</div>
                    ) : boards.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold">No saved boards yet.</div>
                    ) : boards.map(board => (
                        <div key={board.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                            <div>
                                <p className="font-black text-slate-800">{board.title}</p>
                                <p className="text-xs text-slate-400 font-bold">{new Date(board.created_at).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => handleLoad(board)}
                                className="px-4 py-2 bg-[#1e293b] text-white text-xs font-black rounded-xl hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                            >
                                Load
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CustomHeader = ({ editor, activeTab, setActiveTab, role, onPush, onDownload, activeStudentName, studentCount, isLocked, isSlowMode, onToggleLock, onToggleSlowMode, onClearBoards, onSaveLibrary, onOpenLibrary }) => {
    const [showControls, setShowControls] = useState(false);

    return (
        <div className="w-full bg-[#1e293b] text-white flex items-center justify-between px-6 py-4 shadow-xl z-[1001]">
            <div className="flex items-center gap-8">
                <div className="flex flex-col">
                    <h1 className="text-lg font-black tracking-tighter flex items-center gap-2">
                        <span className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                        </span>
                        Hidayah Whiteboard
                    </h1>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 ml-1">Live Classroom</span>
                </div>

                <nav className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
                    <button 
                        onClick={() => setActiveTab('my_board')}
                        className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'my_board' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                    >
                        {role === 'STUDENT' ? 'My Board' : 'Tutor Board'}
                    </button>
                    {role === 'STUDENT' && (
                        <button 
                            onClick={() => setActiveTab('teacher_board')}
                            className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'teacher_board' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                        >
                            Teacher's Screen
                        </button>
                    )}
                    {(role === 'TUTOR' || role === 'ADMIN') && (
                        <button 
                            onClick={() => setActiveTab('my_class')}
                            className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all relative ${activeTab === 'my_class' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                        >
                            Student Boards
                            {studentCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] border-2 border-[#1e293b]">{studentCount}</span>}
                        </button>
                    )}
                </nav>
            </div>

            <div className="flex items-center gap-4 relative">
                {activeTab === 'student_view' && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 mr-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Coaching: {activeStudentName}</span>
                        <button onClick={() => setActiveTab('my_class')} className="ml-2 hover:text-white text-sm font-bold">✕</button>
                    </div>
                )}

                <div className="flex gap-2 items-center">
                    <button onClick={onOpenLibrary} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700" title="My Board Library">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </button>
                    <button onClick={onDownload} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700" title="Download">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>

                    {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <>
                            <button 
                                onClick={() => onPush('bg')} 
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-700 transition-all"
                            >
                                Push Background
                            </button>
                            <button 
                                onClick={() => onPush('overwrite')} 
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Push to All
                            </button>
                            
                            {/* Classroom Controls */}
                            <div className="relative">
                                <button onClick={() => setShowControls(!showControls)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 ml-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                </button>
                                {showControls && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 z-[1002]">
                                        <button onClick={() => { onToggleLock(); setShowControls(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-sm font-bold">
                                            {isLocked ? 'Unlock Room' : 'Lock Room'}
                                            {isLocked && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                        </button>
                                        <button onClick={() => { onToggleSlowMode(); setShowControls(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-sm font-bold">
                                            {isSlowMode ? 'Disable Slow Mode' : 'Enable Slow Mode'}
                                            {isSlowMode && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                        </button>
                                        <div className="border-t border-slate-100"></div>
                                        <button onClick={() => { onClearBoards(); setShowControls(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm font-bold">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            Clear All Boards
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
 
const WhiteboardEngine = ({ roomId, role, userName, activeTab, setStudentThumbnails, setTeacherBoardSnapshot, isSlowMode, setRoomLocked, setSlowMode, setReaction }) => {
    const editor = useEditor();
    
    // Robust WebSocket URL calculation
    const getWsUrl = () => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
        // Ensure it starts with ws:// or wss://
        let base = apiBase.replace(/^http/, 'ws');
        if (!base.startsWith('ws')) {
            base = `wss://${base}`;
        }
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        const finalUrl = `${cleanBase}/ws/board/${roomId}/`;
        console.log("🔌 Attempting WebSocket Connection to:", finalUrl);
        return finalUrl;
    };

    const socketUrl = getWsUrl();
    
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 20,
        reconnectInterval: 5000,
        retryOnError: true,
        onOpen: () => console.log("✅ Board Connection Established"),
        onClose: () => console.log("❌ Board Connection Lost"),
        onError: (e) => console.log("⚠️ Board Connection Error", e),
    });
    
    // Handle incoming messages
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            
            // Handle command messages
            if (data.type === 'command') {
                const action = data.action;
                if (action === 'push_board' && role === 'STUDENT' && editor) {
                    editor.store.mergeRemoteChanges(() => {
                        if (data.mode === 'overwrite') editor.store.clear();
                        Object.values(data.snapshot).forEach(record => {
                            if (data.mode === 'bg' && record.typeName === 'shape') record.isLocked = true;
                            editor.store.put([record]);
                        });
                    });
                } else if (action === 'clear_boards' && role === 'STUDENT' && editor) {
                    editor.store.clear();
                } else if (action === 'lock_room') {
                    setRoomLocked(data.locked);
                } else if (action === 'slow_mode') {
                    setSlowMode(data.enabled);
                } else if (action === 'reaction' && role === 'STUDENT') {
                    if (data.targetId === editor?.getInstanceState().userId) {
                        setReaction(data.emoji);
                        setTimeout(() => setReaction(null), 3000);
                    }
                }
            }
            
            // Handle draw messages (thumbnails & teacher snapshots)
            if (data.type === 'draw') {
                if (data.is_thumbnail && (role === 'TUTOR' || role === 'ADMIN')) {
                    setStudentThumbnails(prev => ({
                        ...prev,
                        [data.clientId]: {
                            svg: data.svg,
                            name: data.name || 'Student',
                            updatedAt: Date.now(),
                            snapshot: data.snapshot
                        }
                    }));
                }
                
                if (data.is_teacher_snapshot && role === 'STUDENT') {
                    setTeacherBoardSnapshot(data.snapshot);
                }
            }

        } catch (e) { console.error("WS Message Error:", e); }
    }, [lastMessage, editor, role, setStudentThumbnails, setTeacherBoardSnapshot, setRoomLocked, setSlowMode, setReaction]);

    // Send Live Thumbnails if Student (Optimized: single interval)
    useEffect(() => {
        if (!editor || role !== 'STUDENT' || readyState !== ReadyState.OPEN) return;
        
        const interval = setInterval(async () => {
            if (isSlowMode) return; 
            try {
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                if (shapeIds.length === 0) return; // Don't send empty boards
                
                const svgString = await editor.getSvgString(shapeIds, { padding: 10 });
                if (svgString?.svg) {
                    sendMessage(JSON.stringify({
                        type: 'draw',
                        is_thumbnail: true,
                        clientId: editor.getInstanceState().userId,
                        name: userName || 'Student',
                        svg: svgString.svg,
                        snapshot: editor.store.allRecords()
                    }));
                }
            } catch (e) {}
        }, 4000); // 4 seconds is plenty
        return () => clearInterval(interval);
    }, [editor, role, userName, readyState, sendMessage, isSlowMode]);
    
    // Teacher Broadcast
    useEffect(() => {
        if (!editor || (role !== 'TUTOR' && role !== 'ADMIN') || readyState !== ReadyState.OPEN) return;
        const interval = setInterval(async () => {
            try {
                const records = editor.store.allRecords();
                if (records.length < 5) return; // Don't broadcast basically empty boards

                sendMessage(JSON.stringify({
                    type: 'draw',
                    is_teacher_snapshot: true,
                    snapshot: records
                }));
            } catch (e) {}
        }, 4000); 
        return () => clearInterval(interval);
    }, [editor, role, readyState, sendMessage]);

    // Expose Push & Classroom Controls
    useEffect(() => {
        if (role === 'TUTOR' || role === 'ADMIN') {
            window.pushTeacherBoard = (mode = 'overwrite') => {
                sendMessage(JSON.stringify({ type: 'command', action: 'push_board', snapshot: editor.store.allRecords(), mode: mode }));
            };
            window.broadcastClassroomCommand = (action, payload = {}) => {
                sendMessage(JSON.stringify({ type: 'command', action, ...payload }));
            };
        }
        if (role === 'STUDENT') {
            window.submitStudentBoard = async () => {
                if(!editor) return;
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                const svgString = await editor.getSvgString(shapeIds, { padding: 10 });
                sendMessage(JSON.stringify({
                    type: 'draw', is_thumbnail: true, clientId: editor.getInstanceState().userId, name: userName || 'Student',
                    svg: svgString?.svg || "", snapshot: editor.store.allRecords()
                }));
            };
        }
    }, [editor, role, sendMessage, userName]);

    // Update student thumbnails state from `draw` event (since we moved thumbnail to `draw` to work with backend)
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            if (data.type === 'send_draw') {
                if (data.data.is_thumbnail && (role === 'TUTOR' || role === 'ADMIN')) {
                    setStudentThumbnails(prev => ({
                        ...prev,
                        [data.data.clientId]: {
                            svg: data.data.svg,
                            name: data.data.name || 'Student',
                            updatedAt: Date.now(),
                            snapshot: data.data.snapshot
                        }
                    }));
                }
                if (data.data.is_teacher_snapshot && role === 'STUDENT') {
                    setTeacherBoardSnapshot(data.data.snapshot);
                }
            }
        } catch (e) { console.error(e); }
    }, [lastMessage, role, setStudentThumbnails, setTeacherBoardSnapshot]);

    return null;
};

// A read-only Tldraw component for students to view the teacher's board
const TeacherBoardViewer = ({ snapshot }) => {
    const [editor, setEditor] = useState(null);
    useEffect(() => {
        if (editor && snapshot) {
            editor.updateInstanceState({ isReadonly: true });
            editor.store.mergeRemoteChanges(() => {
                editor.store.clear();
                Object.values(snapshot).forEach(record => editor.store.put([record]));
            });
        }
    }, [editor, snapshot]);

    return (
        <div className="w-full h-full relative">
            <Tldraw hideUi={true} onMount={setEditor} />
            <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">
                Teacher's Live Board (Read-Only)
            </div>
        </div>
    );
};

const TldrawWhiteboard = ({ roomId, role, userName }) => {
    const [editor, setEditor] = useState(null);
    const [activeTab, setActiveTab] = useState('my_board');
    
    // Inject watermark hiding style
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = watermarkStyle;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const [studentThumbnails, setStudentThumbnails] = useState({});
    const [activeStudentId, setActiveStudentId] = useState(null);
    const [teacherBoardSnapshot, setTeacherBoardSnapshot] = useState(null);
    
    // Classroom State
    const [isLocked, setIsLocked] = useState(false);
    const [isSlowMode, setIsSlowMode] = useState(false);
    const [studentReaction, setStudentReaction] = useState(null);
    const [showLibrary, setShowLibrary] = useState(false);

    const handlePush = (mode) => {
        if (window.pushTeacherBoard) {
            window.pushTeacherBoard(mode);
            alert(`Pushed to all students!`);
        }
    };

    const handleDownload = async () => {
        if (!editor) return;
        const shapeIds = Array.from(editor.getCurrentPageShapeIds());
        if (shapeIds.length === 0) return alert("Board is empty!");
        const svg = await editor.getSvgString(shapeIds);
        const blob = new Blob([svg.svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `whiteboard_${Date.now()}.svg`;
        link.click();
    };

    const handleJoinStudent = (id) => {
        const studentData = studentThumbnails[id];
        if (!studentData) return;
        setActiveStudentId(id);
        setActiveTab('student_view');
        if (editor && studentData.snapshot) {
            editor.store.mergeRemoteChanges(() => {
                editor.store.clear();
                Object.values(studentData.snapshot).forEach(record => editor.store.put([record]));
            });
        }
    };

    const sendReaction = (clientId, emoji) => {
        if (window.broadcastClassroomCommand) {
            window.broadcastClassroomCommand('reaction', { targetId: clientId, emoji });
        }
    };

    if (role === 'STUDENT' && isLocked) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-black mb-2">Room Locked</h2>
                <p className="text-slate-400">The teacher has locked this classroom.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#f8fafc] overflow-hidden relative">
            {showLibrary && (role === 'TUTOR' || role === 'ADMIN') && (
                <LibraryModal editor={editor} onClose={() => setShowLibrary(false)} />
            )}
            
            {studentReaction && (
                <div className="absolute inset-0 pointer-events-none z-[9999] flex items-center justify-center">
                    <div className="text-9xl animate-bounce drop-shadow-2xl">{studentReaction}</div>
                </div>
            )}

            <CustomHeader 
                editor={editor} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                role={role} 
                onPush={handlePush}
                onDownload={handleDownload}
                activeStudentName={activeStudentId ? studentThumbnails[activeStudentId]?.name : ''}
                studentCount={Object.keys(studentThumbnails).length}
                isLocked={isLocked}
                isSlowMode={isSlowMode}
                onToggleLock={() => {
                    const next = !isLocked;
                    setIsLocked(next);
                    if(window.broadcastClassroomCommand) window.broadcastClassroomCommand('lock_room', { locked: next });
                }}
                onToggleSlowMode={() => {
                    const next = !isSlowMode;
                    setIsSlowMode(next);
                    if(window.broadcastClassroomCommand) window.broadcastClassroomCommand('slow_mode', { enabled: next });
                }}
                onClearBoards={() => {
                    if(window.broadcastClassroomCommand) window.broadcastClassroomCommand('clear_boards');
                    alert("Cleared all student boards");
                }}
                onOpenLibrary={() => setShowLibrary(true)}
            />

            <div className="flex-1 flex relative overflow-hidden">
                {/* Main Drawing Area */}
                <div className={`flex-1 relative ${(activeTab === 'my_board' || activeTab === 'student_view') ? 'block' : 'hidden'}`}>
                    <Tldraw onMount={setEditor}>
                        <WhiteboardEngine 
                            roomId={roomId} role={role} userName={userName} activeTab={activeTab} 
                            setStudentThumbnails={setStudentThumbnails} 
                            setTeacherBoardSnapshot={setTeacherBoardSnapshot}
                            isSlowMode={isSlowMode}
                            setRoomLocked={setIsLocked} setSlowMode={setIsSlowMode} setReaction={setStudentReaction}
                        />
                    </Tldraw>
                    <SidebarToolbar editor={editor} activeTab={activeTab} />

                    {role === 'STUDENT' && isSlowMode && (
                        <div className="absolute bottom-6 right-6 z-[1000]">
                            <button 
                                onClick={() => window.submitStudentBoard && window.submitStudentBoard()}
                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black tracking-widest uppercase rounded-xl shadow-xl shadow-emerald-500/20"
                            >
                                Submit Work to Teacher
                            </button>
                        </div>
                    )}
                </div>

                {/* Teacher Board Viewer for Students */}
                {role === 'STUDENT' && activeTab === 'teacher_board' && (
                    <div className="flex-1">
                        <TeacherBoardViewer snapshot={teacherBoardSnapshot} />
                    </div>
                )}

                {/* Student Grid View */}
                {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_class' && (
                    <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {Object.keys(studentThumbnails).length === 0 ? (
                                    <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">🏫</div>
                                        <h3 className="text-xl font-black text-slate-900 mb-2">The Classroom is Empty</h3>
                                        <p className="text-slate-400 font-bold max-w-xs mx-auto">Waiting for students to join and start drawing on their individual boards.</p>
                                    </div>
                                ) : (
                                    Object.entries(studentThumbnails).map(([id, data]) => (
                                        <div key={id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-2xl transition-all group border-b-4 border-b-emerald-500/50">
                                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-[#1e293b] rounded-2xl flex items-center justify-center text-white font-black shadow-lg">
                                                        {data.name?.[0]}
                                                    </div>
                                                    <span className="font-black text-slate-800 truncate max-w-[100px]">{data.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Active</span>
                                                </div>
                                            </div>
                                            <div className="h-48 bg-white p-2 relative flex items-center justify-center border-b border-slate-100">
                                                {data.svg ? (
                                                    <div dangerouslySetInnerHTML={{ __html: data.svg }} className="w-full h-full object-contain pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="text-slate-200 font-black text-4xl opacity-20 select-none">EMPTY</div>
                                                )}
                                            </div>
                                            <div className="p-4 bg-slate-50 flex gap-2">
                                                <button 
                                                    onClick={() => handleJoinStudent(id)}
                                                    className="flex-1 py-2 bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-xl shadow-slate-900/20"
                                                >
                                                    Coach Student
                                                </button>
                                                <button onClick={() => sendReaction(id, '👍')} className="w-10 h-10 bg-white text-xl rounded-xl border border-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:scale-110 transition-all">👍</button>
                                                <button onClick={() => sendReaction(id, '⭐')} className="w-10 h-10 bg-white text-xl rounded-xl border border-slate-200 hover:bg-yellow-50 hover:text-yellow-500 hover:scale-110 transition-all">⭐</button>
                                                <button onClick={() => sendReaction(id, '❌')} className="w-10 h-10 bg-white text-xl rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:scale-110 transition-all">❌</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TldrawWhiteboard;
