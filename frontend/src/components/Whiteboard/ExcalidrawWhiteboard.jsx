import React, { useEffect, useState, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Excalidraw, exportToSvg, MainMenu, WelcomeScreen, Sidebar, Footer } from '@excalidraw/excalidraw';
import api from '../../services/api';

const CustomHeader = ({ activeTab, setActiveTab, role, onPush, onDownload, activeStudentName, studentCount, isLocked, isSlowMode, onToggleLock, onToggleSlowMode, onClearBoards, onClearOwnBoard, onSelectPen, onSelectLaser }) => {
    const [showControls, setShowControls] = useState(false);

    return (
        <div className="w-full bg-[#1e293b] text-white flex items-center justify-between px-6 py-4 shadow-xl z-[1001]">
            <div className="flex items-center gap-8">
                <div className="flex flex-col">
                    <h1 className="text-lg font-black tracking-tighter flex items-center gap-2">
                        <span className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center text-xl">
                            ✍️
                        </span>
                        Hidayah Whiteboard
                    </h1>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 ml-1">Powered by Excalidraw</span>
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
                    {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <button 
                            onClick={onSelectPen}
                            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-600"
                        >
                            ✏️ Pen
                        </button>
                    )}

                    {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <button 
                            onClick={onSelectLaser}
                            className="px-4 py-2.5 bg-red-900/50 hover:bg-red-800/50 text-red-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-red-500/30"
                        >
                            🔦 Laser
                        </button>
                    )}

                    {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <button 
                            onClick={onClearOwnBoard}
                            className="p-3 bg-red-900/20 hover:bg-red-800/30 text-red-500 rounded-xl transition-all border border-red-500/20"
                            title="Clear My Board"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    )}

                    <button onClick={onDownload} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700" title="Download">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>

                    {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <>
                            <button 
                                onClick={() => onPush('overwrite')} 
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Push Board
                            </button>
                            
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

const ExcalidrawWhiteboard = ({ roomId, role, userName }) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [activeTab, setActiveTab] = useState('my_board');
    
    const [studentThumbnails, setStudentThumbnails] = useState({});
    const [activeStudentId, setActiveStudentId] = useState(null);
    const [teacherBoardSnapshot, setTeacherBoardSnapshot] = useState(null);
    
    const [isLocked, setIsLocked] = useState(false);
    const [isSlowMode, setIsSlowMode] = useState(false);
    const [studentReaction, setStudentReaction] = useState(null);
    const lastSyncTime = useRef(0);

    // WebSocket URL Calculation
    const socketUrl = React.useMemo(() => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
        let base = apiBase.replace(/^http/, 'ws');
        if (!base.startsWith('ws')) base = `wss://${base}`;
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}/board/${roomId}/`;
    }, [roomId]);
    
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 50,
        reconnectInterval: 3000,
        heartbeat: {
            message: JSON.stringify({ type: 'ping' }),
            interval: 20000,
            timeout: 60000,
        },
        onOpen: () => console.log("✅ Board Connection Established"),
    });

    // Handle WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            
            if (data.type === 'send_command' || data.type === 'command') {
                const action = data.action || data.data?.action;
                const payload = data.data || data;

                if (action === 'push_board' && role === 'STUDENT' && excalidrawAPI) {
                    excalidrawAPI.updateScene({ elements: payload.snapshot });
                } else if (action === 'clear_boards' && role === 'STUDENT' && excalidrawAPI) {
                    excalidrawAPI.updateScene({ elements: [] });
                } else if (action === 'lock_room') {
                    setIsLocked(payload.locked);
                } else if (action === 'slow_mode') {
                    setIsSlowMode(payload.enabled);
                } else if (action === 'reaction' && role === 'STUDENT') {
                    // Only show if targeted to me or general
                    if (!payload.targetId || payload.targetId === userName) {
                        setStudentReaction(payload.emoji);
                        setTimeout(() => setStudentReaction(null), 3000);
                    }
                }
            }
            
            if (data.type === 'send_draw' || data.type === 'draw') {
                const payload = data.data || data;
                if (payload.is_thumbnail && (role === 'TUTOR' || role === 'ADMIN')) {
                    setStudentThumbnails(prev => ({
                        ...prev,
                        [payload.clientId]: {
                            svg: payload.svg,
                            name: payload.name || 'Student',
                            updatedAt: Date.now(),
                            snapshot: payload.snapshot
                        }
                    }));
                }
                
                if (payload.is_teacher_snapshot && role === 'STUDENT') {
                    setTeacherBoardSnapshot(payload.snapshot);
                }
            }
        } catch (e) { console.error("WS Message Error:", e); }
    }, [lastMessage, excalidrawAPI, role, userName]);

    // Throttled sync handler
    const handleBoardChange = async (elements) => {
        if (!excalidrawAPI || readyState !== ReadyState.OPEN) return;
        
        const now = Date.now();
        const throttleTime = (role === 'STUDENT' && isSlowMode) ? 5000 : 800; // Faster sync for tutor/non-slow students
        
        if (now - lastSyncTime.current < throttleTime) return;
        lastSyncTime.current = now;

        if (role === 'TUTOR' || role === 'ADMIN') {
            // Broadcast full state for teacher board
            sendMessage(JSON.stringify({
                type: 'draw',
                is_teacher_snapshot: true,
                snapshot: elements
            }));
        } else if (role === 'STUDENT') {
            // Send thumbnail/snapshot to teacher
            try {
                const svgElement = await exportToSvg({
                    elements,
                    appState: excalidrawAPI.getAppState(),
                    files: excalidrawAPI.getFiles()
                });
                sendMessage(JSON.stringify({
                    type: 'draw',
                    is_thumbnail: true,
                    clientId: userName,
                    name: userName || 'Student',
                    svg: svgElement.outerHTML,
                    snapshot: elements
                }));
            } catch (e) {}
        }
    };

    const handleSelectPen = () => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ appState: { activeTool: { type: 'freedraw' } } });
        }
    };

    const handleSelectLaser = () => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ appState: { activeTool: { type: 'laser' } } });
        }
    };

    // Auto-select Pen tool for tutors on mount
    useEffect(() => {
        if (excalidrawAPI && (role === 'TUTOR' || role === 'ADMIN')) {
            setTimeout(() => {
                excalidrawAPI.updateScene({ 
                    appState: { 
                        activeTool: { type: 'freedraw' },
                        currentItemStrokeWidth: 1,
                        currentItemRoughness: 0
                    } 
                });
            }, 800);
        }
    }, [excalidrawAPI, role]);

    const handlePush = (mode) => {
        if (excalidrawAPI) {
            const elements = excalidrawAPI.getSceneElements();
            sendMessage(JSON.stringify({ type: 'command', action: 'push_board', snapshot: elements, mode: mode }));
            alert(`Pushed to all students!`);
        }
    };

    const handleDownload = async () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        if (elements.length === 0) return alert("Board is empty!");
        
        const svgElement = await exportToSvg({
            elements,
            appState: excalidrawAPI.getAppState(),
            files: excalidrawAPI.getFiles()
        });
        
        const blob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml' });
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
        if (excalidrawAPI && studentData.snapshot) {
            excalidrawAPI.updateScene({ elements: studentData.snapshot });
        }
    };

    const sendReaction = (clientId, emoji) => {
        sendMessage(JSON.stringify({ type: 'command', action: 'reaction', targetId: clientId, emoji }));
    };

    if (role === 'STUDENT' && isLocked) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f172a] text-white">
                <div className="text-8xl mb-6 drop-shadow-2xl">🔒</div>
                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Classroom Locked</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">The teacher has paused interaction.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#f8fafc] overflow-hidden relative">
            
            {studentReaction && (
                <div className="absolute inset-0 pointer-events-none z-[9999] flex items-center justify-center">
                    <div className="text-9xl animate-bounce drop-shadow-2xl">{studentReaction}</div>
                </div>
            )}

            <CustomHeader 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                role={role} 
                onPush={handlePush}
                onDownload={handleDownload}
                activeStudentName={activeStudentId ? studentThumbnails[activeStudentId]?.name : ''}
                studentCount={Object.keys(studentThumbnails).length}
                isLocked={isLocked}
                isSlowMode={isSlowMode}
                onSelectPen={handleSelectPen}
                onSelectLaser={handleSelectLaser}
                onToggleLock={() => {
                    const next = !isLocked;
                    setIsLocked(next);
                    sendMessage(JSON.stringify({ type: 'command', action: 'lock_room', locked: next }));
                }}
                onToggleSlowMode={() => {
                    const next = !isSlowMode;
                    setIsSlowMode(next);
                    sendMessage(JSON.stringify({ type: 'command', action: 'slow_mode', enabled: next }));
                }}
                onClearBoards={() => {
                    sendMessage(JSON.stringify({ type: 'command', action: 'clear_boards' }));
                    alert("Cleared all student boards");
                }}
                onClearOwnBoard={() => {
                    if (window.confirm("Clear your entire board?")) {
                        excalidrawAPI?.updateScene({ elements: [] });
                    }
                }}
            />

            <div className="flex-1 flex relative overflow-hidden">
                {/* Left Floating Toolbar (Jamboard Style) */}
                {(activeTab === 'my_board' || activeTab === 'student_view') && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-[1000] bg-white/90 backdrop-blur-xl p-3 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 group transition-all hover:scale-105">
                        {[
                            { id: 'selection', icon: '🖱️', label: 'Select' },
                            { id: 'freedraw', icon: '✏️', label: 'Pen' },
                            { id: 'eraser', icon: '🧹', label: 'Eraser' },
                            { id: 'text', icon: '🔤', label: 'Text' },
                            { id: 'rectangle', icon: '🟦', label: 'Square' },
                            { id: 'ellipse', icon: '⭕', label: 'Circle' },
                            { id: 'arrow', icon: '➡️', label: 'Arrow' },
                            { id: 'laser', icon: '🔦', label: 'Laser' },
                        ].map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => excalidrawAPI?.updateScene({ appState: { activeTool: { type: tool.id } } })}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all text-xl grayscale hover:grayscale-0 active:scale-90 relative group/tool"
                                title={tool.label}
                            >
                                {tool.icon}
                                <span className="absolute left-full ml-4 px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[1001]">
                                    {tool.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Drawing Area */}
                <div className={`flex-1 relative ${(activeTab === 'my_board' || activeTab === 'student_view') ? 'block' : 'hidden'}`}>
                    <Excalidraw 
                        name="hidayah_live_board"
                        excalidrawAPI={(api) => setExcalidrawAPI(api)} 
                        onChange={handleBoardChange}
                        viewModeEnabled={false}
                        initialData={{
                            appState: {
                                currentItemStrokeWidth: 1,
                                currentItemStrokeStyle: "solid",
                                currentItemRoughness: 0,
                                viewBackgroundColor: "#ffffff",
                                theme: "light",
                                zenModeEnabled: false,
                                gridModeEnabled: false,
                                openSidebar: null
                            }
                        }}
                        UIOptions={{
                            canvasActions: {
                                changeViewBackgroundColor: true,
                                clearCanvas: true,
                                export: false,
                                loadScene: false,
                                saveAsImage: false,
                                theme: true,
                            },
                        }}
                    >
                        <MainMenu>
                            <MainMenu.DefaultItems.ClearCanvas />
                            <MainMenu.DefaultItems.SaveAsImage />
                            <MainMenu.DefaultItems.ChangeCanvasBackground />
                            <MainMenu.DefaultItems.ToggleSidebar />
                            <MainMenu.DefaultItems.GridMode />
                            <MainMenu.DefaultItems.ZenMode />
                            <MainMenu.DefaultItems.Help />
                        </MainMenu>
                        <Footer>
                            <div style={{ padding: '0 10px', fontSize: '10px', color: '#666', fontWeight: 'bold' }}>
                                ROOM: {roomId} | {role} MODE
                            </div>
                        </Footer>
                    </Excalidraw>
                </div>

                {/* Teacher Board Viewer for Students */}
                {role === 'STUDENT' && activeTab === 'teacher_board' && (
                    <div className="flex-1 relative">
                        {teacherBoardSnapshot ? (
                            <Excalidraw 
                                initialData={{ elements: teacherBoardSnapshot }} 
                                viewModeEnabled={true} 
                                UIOptions={{
                                    canvasActions: {
                                        changeViewBackgroundColor: false,
                                        clearCanvas: false,
                                        export: false,
                                        loadScene: false,
                                        saveAsImage: false,
                                        theme: false,
                                    }
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-slate-400 font-bold">
                                Waiting for Teacher...
                            </div>
                        )}
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg z-50">
                            Teacher's Live Board (Read-Only)
                        </div>
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
                                                {data.svg && data.svg.startsWith('<svg') ? (
                                                    <div dangerouslySetInnerHTML={{ __html: data.svg }} className="w-full h-full object-contain pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity [&>svg]:w-full [&>svg]:h-full" />
                                                ) : (
                                                    <div className="text-slate-200 font-black text-4xl opacity-20 select-none">
                                                        {data.svg ? 'INVALID DATA' : 'EMPTY'}
                                                    </div>
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

export default ExcalidrawWhiteboard;
