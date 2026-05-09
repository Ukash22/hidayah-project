import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tldraw, useEditor } from 'tldraw';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import 'tldraw/tldraw.css';

const CustomToolbar = ({ editor, activeTab, setActiveTab, role, onPush, onDownload, activeStudentName }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-col w-full border-b border-slate-300 bg-white shadow-sm z-[1000]">
            {/* Top Navigation Bar */}
            <div className="flex justify-between items-center px-6 py-3 bg-[#1e293b] text-white">
                <div className="flex items-center gap-6">
                    <h1 className="font-black text-xl tracking-tighter flex items-center gap-2">
                        <span className="bg-emerald-500 p-1 rounded-lg">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                        </span>
                        Hidayah Board
                    </h1>
                    
                    {/* Tabs */}
                    <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                        <button 
                            onClick={() => setActiveTab('my_board')}
                            className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'my_board' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                        >
                            My Whiteboard
                        </button>
                        {(role === 'TEACHER' || role === 'ADMIN') && (
                            <button 
                                onClick={() => setActiveTab('my_class')}
                                className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'my_class' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                            >
                                My Class
                            </button>
                        )}
                        {activeTab === 'student_view' && (
                            <div className="flex items-center gap-2 px-4 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                                <span className="text-[10px] font-black uppercase animate-pulse">Viewing: {activeStudentName}</span>
                                <button onClick={() => setActiveTab('my_class')} className="hover:text-white">✕</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <button onClick={onDownload} className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-300" title="Download as Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    
                    {(role === 'TEACHER' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <div className="flex gap-2">
                             <button 
                                onClick={() => onPush('bg')} 
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                            >
                                Push as Background
                            </button>
                            <button 
                                onClick={() => onPush('overwrite')} 
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Push to Students
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tool Palette (Only visible on Board views) */}
            {(activeTab === 'my_board' || activeTab === 'student_view') && (
                <div className="flex justify-center items-center p-3 bg-white gap-2 shadow-sm">
                    <ToolButton icon={<path d="M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586 M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>} onClick={() => editor.setCurrentTool('draw')} title="Pen" active={editor.getCurrentToolId() === 'draw'} />
                    <ToolButton icon={<path d="M21 6a1 1 0 0 0-4-4L3 16a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z M15 5l4 4"/>} onClick={() => editor.setCurrentTool('eraser')} title="Eraser" active={editor.getCurrentToolId() === 'eraser'} />
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <ToolButton icon={<path d="M4 7V4h16v3 M9 20h6 M12 4v16"/>} onClick={() => editor.setCurrentTool('text')} title="Text" active={editor.getCurrentToolId() === 'text'} />
                    <ToolButton icon={<rect x="3" y="3" width="18" height="18" rx="2"/>} onClick={() => editor.setCurrentTool('geo')} title="Shapes" active={editor.getCurrentToolId() === 'geo'} />
                    <ToolButton icon={<path d="M5 12h14 M12 5l7 7-7 7"/>} onClick={() => editor.setCurrentTool('arrow')} title="Arrow" active={editor.getCurrentToolId() === 'arrow'} />
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <ToolButton icon={<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>} onClick={() => editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })} title="Grid" active={editor.getInstanceState().isGridMode} />
                    <ToolButton icon={<span className="font-serif italic font-black text-sm">fx</span>} onClick={() => alert("Equation editor coming soon!")} title="Math" active={false} />
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                         {['#000000', '#ef4444', '#2563eb', '#10b981', '#f59e0b'].map(color => (
                             <button 
                                key={color}
                                onClick={() => editor.setStyleForNextShapes({ color: color === '#000000' ? 'black' : color === '#ef4444' ? 'light-red' : color === '#2563eb' ? 'light-blue' : color === '#10b981' ? 'light-green' : 'light-violet' })}
                                className="w-6 h-6 rounded-md border border-white shadow-sm"
                                style={{ backgroundColor: color }}
                             />
                         ))}
                    </div>
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <button 
                        onClick={() => { if(window.confirm("Clear entire board?")) editor.clearPage(editor.getCurrentPageId()); }}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                        Clear Board
                    </button>
                </div>
            )}
        </div>
    );
};

const ToolButton = ({ icon, onClick, title, active, text }) => (
    <button 
        onClick={onClick}
        title={title}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-[#1e293b] text-white shadow-lg scale-110' : 'text-slate-500 hover:bg-slate-100'}`}
    >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {icon}
        </svg>
        {text && <span className="ml-1 text-[10px] font-black uppercase">{text}</span>}
    </button>
);

const WhiteboardEngine = ({ roomId, role, userName, activeTab, setStudentThumbnails }) => {
    const editor = useEditor();
    const socketUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/board/${roomId}/`;
    
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
    });

    // Handle incoming messages
    useEffect(() => {
        if (!editor || !lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            
            // Handle Teacher Push
            if (data.type === 'send_command' && data.data.action === 'push_board') {
                if (role === 'STUDENT') {
                    editor.store.mergeRemoteChanges(() => {
                        if (data.data.mode === 'overwrite') {
                            editor.store.clear();
                        }
                        Object.values(data.data.snapshot).forEach(record => {
                            if (data.data.mode === 'bg') {
                                // Lock background shapes
                                if (record.typeName === 'shape') {
                                    record.isLocked = true;
                                }
                            }
                            editor.store.put([record]);
                        });
                    });
                }
            }

            // Handle live Thumbnail updates
            if (data.type === 'send_thumbnail' && (role === 'TEACHER' || role === 'ADMIN')) {
                setStudentThumbnails(prev => ({
                    ...prev,
                    [data.data.clientId]: {
                        svg: data.data.svg,
                        name: data.data.name || 'Student',
                        updatedAt: Date.now(),
                        snapshot: data.data.snapshot // Save full snapshot for "Joining"
                    }
                }));
            }

        } catch (e) {
            console.error(e);
        }
    }, [lastMessage, editor, role, setStudentThumbnails]);

    // Send Live Thumbnails if Student
    useEffect(() => {
        if (!editor || role !== 'STUDENT' || readyState !== ReadyState.OPEN) return;

        const interval = setInterval(async () => {
            try {
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                const svgString = await editor.getSvgString(shapeIds, { padding: 10 });
                
                if (svgString) {
                    sendMessage(JSON.stringify({
                        type: 'thumbnail',
                        clientId: editor.user.getId(),
                        name: userName || 'Student',
                        svg: svgString?.svg || "",
                        snapshot: editor.store.allRecords()
                    }));
                }
            } catch (e) {}
        }, 3000); 

        return () => clearInterval(interval);
    }, [editor, role, userName, readyState, sendMessage]);

    // Expose Push to global
    useEffect(() => {
        if (role === 'TEACHER' || role === 'ADMIN') {
            window.pushTeacherBoard = (mode = 'overwrite') => {
                const snapshot = editor.store.allRecords();
                sendMessage(JSON.stringify({
                    type: 'command',
                    action: 'push_board',
                    snapshot: snapshot,
                    mode: mode
                }));
            };
        }
    }, [editor, role, sendMessage]);

    return null;
};

const TldrawWhiteboard = ({ roomId, role, userName }) => {
    const [editor, setEditor] = useState(null);
    const [activeTab, setActiveTab] = useState('my_board');
    const [studentThumbnails, setStudentThumbnails] = useState({});
    const [activeStudentId, setActiveStudentId] = useState(null);

    const handlePush = (mode) => {
        if (window.pushTeacherBoard) {
            window.pushTeacherBoard(mode);
            alert(`Board pushed to all students as ${mode === 'bg' ? 'background' : 'template'}!`);
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
        
        // Load student board into editor
        if (editor && studentData.snapshot) {
            editor.store.mergeRemoteChanges(() => {
                editor.store.clear();
                Object.values(studentData.snapshot).forEach(record => editor.store.put([record]));
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#f8fafc]">
            <CustomToolbar 
                editor={editor} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                role={role} 
                onPush={handlePush}
                onDownload={handleDownload}
                activeStudentName={activeStudentId ? studentThumbnails[activeStudentId]?.name : ''}
            />

            {/* Main Board View */}
            <div className={`flex-1 relative ${activeTab !== 'my_class' ? 'block' : 'hidden'}`}>
                <Tldraw hideUi={true} onMount={setEditor}>
                    <WhiteboardEngine 
                        roomId={roomId} 
                        role={role} 
                        userName={userName}
                        activeTab={activeTab} 
                        setStudentThumbnails={setStudentThumbnails} 
                    />
                </Tldraw>
            </div>

            {/* My Class Grid View */}
            {(role === 'TEACHER' || role === 'ADMIN') && activeTab === 'my_class' && (
                <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Student Boards <span className="text-emerald-500 font-medium text-sm">● Live View</span></h2>
                            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-xs font-bold text-slate-500">
                                {Object.keys(studentThumbnails).length} Students Connected
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {Object.keys(studentThumbnails).length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">⌛</div>
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Waiting for students to join...</p>
                                </div>
                            )}
                            {Object.entries(studentThumbnails).map(([id, data]) => (
                                <div key={id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all group">
                                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-xs">
                                                {data.name?.[0]}
                                            </div>
                                            <span className="font-black text-slate-700 text-sm">{data.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[9px] font-black uppercase text-emerald-500">Live</span>
                                        </div>
                                    </div>
                                    <div className="h-56 bg-white p-4 relative flex items-center justify-center">
                                        {data.svg ? (
                                            <div dangerouslySetInnerHTML={{ __html: data.svg }} className="w-full h-full object-contain pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Empty Board</span>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                                        <button 
                                            onClick={() => handleJoinStudent(id)}
                                            className="flex-1 py-2.5 bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-md"
                                        >
                                            Join Board
                                        </button>
                                        <button className="px-4 py-2.5 bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-emerald-50 transition-colors">
                                            👍
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TldrawWhiteboard;
