import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tldraw, useEditor } from 'tldraw';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import 'tldraw/tldraw.css';

const CustomToolbar = ({ editor, activeTab, setActiveTab, role, onPush }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-col w-full border-b border-slate-300 bg-white">
            {/* Top Navigation Bar */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl text-slate-800">Hidayah<span className="text-emerald-500">Board</span></h1>
                    
                    {/* Tabs */}
                    <div className="flex bg-slate-200 rounded-lg p-1">
                        <button 
                            onClick={() => setActiveTab('my_board')}
                            className={`px-4 py-1 text-sm font-semibold rounded-md transition-all ${activeTab === 'my_board' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            My Whiteboard
                        </button>
                        {(role === 'TEACHER' || role === 'ADMIN') && (
                            <button 
                                onClick={() => setActiveTab('my_class')}
                                className={`px-4 py-1 text-sm font-semibold rounded-md transition-all ${activeTab === 'my_class' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                My Class
                            </button>
                        )}
                        {role === 'STUDENT' && (
                            <button 
                                onClick={() => setActiveTab('teacher_board')}
                                className={`px-4 py-1 text-sm font-semibold rounded-md transition-all ${activeTab === 'teacher_board' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Teacher Whiteboard
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {(role === 'TEACHER' || role === 'ADMIN') && activeTab === 'my_board' && (
                        <div className="relative group">
                            <button onClick={() => onPush('overwrite')} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Push
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tool Palette (Only visible on My Board) */}
            {activeTab === 'my_board' && (
                <div className="flex justify-center items-center p-2 bg-white gap-1 shadow-sm">
                    <ToolButton icon={<><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></>} onClick={() => editor.setCurrentTool('draw')} title="Pen" active={editor.getCurrentToolId() === 'draw'} />
                    <ToolButton icon={<><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></>} onClick={() => editor.setCurrentTool('eraser')} title="Eraser" active={editor.getCurrentToolId() === 'eraser'} />
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    <ToolButton icon={<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>} onClick={() => editor.setCurrentTool('text')} title="Text" active={editor.getCurrentToolId() === 'text'} />
                    <ToolButton icon={<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>} onClick={() => editor.setCurrentTool('geo')} title="Shapes" active={editor.getCurrentToolId() === 'geo'} />
                    <ToolButton icon={<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>} onClick={() => { editor.setCurrentTool('arrow'); editor.setStyleForNextShapes({ color: 'light-red' }); }} title="Physics Vector" active={editor.getCurrentToolId() === 'arrow'} />
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    <ToolButton icon={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>} onClick={() => editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })} title="Math Grid" active={editor.getInstanceState().isGridMode} />
                    <ToolButton icon={<span className="font-serif italic font-bold leading-none">fx</span>} onClick={() => alert("Math/Chemistry Equation Editor modal opens here")} title="Insert Equation" active={false} />
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    <ToolButton icon={<><path d="M3 7v6h6"/><path d="M21 17v-6h-6"/><path d="M21 10.07V10a9 9 0 0 0-16.74-4.26L3 13"/><path d="M3 13.93V14a9 9 0 0 0 16.74 4.26L21 11"/></>} onClick={() => { editor.clearPage(editor.getCurrentPageId()); }} title="Clear Board" active={false} text="Clear" />
                </div>
            )}
        </div>
    );
};

const ToolButton = ({ icon, onClick, title, active, text }) => (
    <button 
        onClick={onClick}
        title={title}
        className={`p-2 flex items-center justify-center rounded-md transition-colors ${active ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
        </svg>
        {text && <span className="ml-1 text-xs font-semibold">{text}</span>}
    </button>
);

const WhiteboardEngine = ({ roomId, role, activeTab, setStudentThumbnails }) => {
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
                        editor.store.clear();
                        Object.values(data.data.snapshot).forEach(record => editor.store.put([record]));
                    });
                }
            }

            // Handle live Thumbnail updates for Teacher's "My Class" tab
            if (data.type === 'send_thumbnail' && (role === 'TEACHER' || role === 'ADMIN')) {
                setStudentThumbnails(prev => ({
                    ...prev,
                    [data.data.clientId]: {
                        svg: data.data.svg,
                        name: data.data.name || 'Student',
                        updatedAt: Date.now()
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
                // Get SVG of current board state to send as thumbnail
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                if(shapeIds.length === 0) return;
                
                const svgString = await editor.getSvgString(shapeIds, { padding: 10 });
                if (svgString) {
                    sendMessage(JSON.stringify({
                        type: 'thumbnail',
                        clientId: editor.user.getId(),
                        name: 'Student', // In prod, use real user name
                        svg: svgString?.svg || ""
                    }));
                }
            } catch (e) {
                // Ignore empty board errors
            }
        }, 2000); // Send thumbnail every 2 seconds

        return () => clearInterval(interval);
    }, [editor, role, readyState, sendMessage]);

    // Expose Push to global for the Toolbar
    useEffect(() => {
        if (role === 'TEACHER' || role === 'ADMIN') {
            window.pushTeacherBoard = () => {
                const snapshot = editor.store.allRecords();
                sendMessage(JSON.stringify({
                    type: 'command',
                    action: 'push_board',
                    snapshot: snapshot
                }));
            };
        }
    }, [editor, role, sendMessage]);

    return null;
};


const TldrawWhiteboard = ({ roomId, role }) => {
    const [editor, setEditor] = useState(null);
    const [activeTab, setActiveTab] = useState('my_board');
    const [studentThumbnails, setStudentThumbnails] = useState({});

    const handlePush = (mode) => {
        if (window.pushTeacherBoard) {
            window.pushTeacherBoard();
            alert("Board pushed to all students!");
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#f4f5f8]">
            <CustomToolbar 
                editor={editor} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                role={role} 
                onPush={handlePush}
            />

            {/* My Board Tab (Visible when selected) */}
            <div className={`flex-1 relative ${activeTab === 'my_board' ? 'block' : 'hidden'}`}>
                <Tldraw hideUi={true} onMount={setEditor}>
                    <WhiteboardEngine 
                        roomId={roomId} 
                        role={role} 
                        activeTab={activeTab} 
                        setStudentThumbnails={setStudentThumbnails} 
                    />
                </Tldraw>
            </div>

            {/* My Class Grid View Tab (Teacher Only) */}
            {(role === 'TEACHER' || role === 'ADMIN') && activeTab === 'my_class' && (
                <div className="flex-1 p-6 overflow-y-auto bg-slate-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Student Boards (Live)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.keys(studentThumbnails).length === 0 && (
                            <p className="text-slate-500 col-span-full text-center py-10">Waiting for students to draw...</p>
                        )}
                        {Object.entries(studentThumbnails).map(([id, data]) => (
                            <div key={id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-semibold text-slate-700">{data.name}</span>
                                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                                    </span>
                                </div>
                                <div className="h-48 bg-white p-2 relative flex items-center justify-center">
                                    {data.svg ? (
                                        <div dangerouslySetInnerHTML={{ __html: data.svg }} className="w-full h-full object-contain pointer-events-none" style={{maxHeight: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}} />
                                    ) : (
                                        <span className="text-slate-300">Empty Board</span>
                                    )}
                                </div>
                                <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                                    <button className="text-xs font-bold text-emerald-600 hover:text-emerald-500">Join</button>
                                    <button className="text-xs font-bold text-slate-600 hover:text-slate-500">👍</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TldrawWhiteboard;
