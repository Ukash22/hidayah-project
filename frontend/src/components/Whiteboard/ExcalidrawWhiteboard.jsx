import React, { useEffect, useState, useRef, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Excalidraw, exportToSvg, MainMenu, Footer } from '@excalidraw/excalidraw';
import "@excalidraw/excalidraw/index.css";
import { getAccess } from '../../services/tokenStore';
import { useToast, useConfirm } from '../../context/ToastContext';
import MathToolsPanel from './MathToolsPanel';
import LibraryPanel from './LibraryPanel';
import ExamPanel from './ExamPanel';
import QuranMushaf from '../QuranMushaf';

const ExcalidrawWhiteboard = ({ roomId, role, userName }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [activeTab, setActiveTab] = useState('my_board');

    // ── Multi-page state ──────────────────────────────────────────────────
    const [pages, setPages] = useState([{ id: 'page-1', name: 'Page 1', elements: [] }]);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const pagesRef = useRef(pages);
    const currentPageIdxRef = useRef(0);
    useEffect(() => { pagesRef.current = pages; }, [pages]);
    useEffect(() => { currentPageIdxRef.current = currentPageIdx; }, [currentPageIdx]);

    const saveCurrentPageElements = useCallback(() => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const idx = currentPageIdxRef.current;
        setPages(prev => prev.map((p, i) => i === idx ? { ...p, elements } : p));
        pagesRef.current = pagesRef.current.map((p, i) => i === idx ? { ...p, elements } : p);
    }, [excalidrawAPI]);

    const goToPage = useCallback((idx) => {
        if (!excalidrawAPI) return;
        saveCurrentPageElements();
        const target = pagesRef.current[idx];
        if (!target) return;
        setCurrentPageIdx(idx);
        excalidrawAPI.updateScene({ elements: target.elements || [] });
    }, [excalidrawAPI, saveCurrentPageElements]);

    const handleAddPage = useCallback(() => {
        if (!excalidrawAPI) return;
        saveCurrentPageElements();
        const newIdx = pagesRef.current.length;
        const newPage = { id: `page-${Date.now()}`, name: `Page ${newIdx + 1}`, elements: [] };
        setPages(prev => [...prev, newPage]);
        pagesRef.current = [...pagesRef.current, newPage];
        setCurrentPageIdx(newIdx);
        excalidrawAPI.updateScene({ elements: [] });
        toast.success(`Page ${newIdx + 1} added!`);
    }, [excalidrawAPI, saveCurrentPageElements, toast]);

    const handlePrevPage = useCallback(() => {
        if (currentPageIdxRef.current > 0) goToPage(currentPageIdxRef.current - 1);
    }, [goToPage]);

    const handleNextPage = useCallback(() => {
        if (currentPageIdxRef.current < pagesRef.current.length - 1) goToPage(currentPageIdxRef.current + 1);
    }, [goToPage]);
    // ─────────────────────────────────────────────────────────────────────

    const [studentThumbnails, setStudentThumbnails] = useState({});
    const [activeStudentId, setActiveStudentId] = useState(null);
    const [teacherBoardSnapshot, setTeacherBoardSnapshot] = useState(null);

    const [isLocked, setIsLocked] = useState(false);
    const [isSlowMode, setIsSlowMode] = useState(false);
    const [studentReaction, setStudentReaction] = useState(null);
    const lastSyncTime = useRef(0);
    const [teacherViewAPI, setTeacherViewAPI] = useState(null);
    const teacherViewAPIRef = useRef(null);
    const [showMathTools, setShowMathTools] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [showExamPanel, setShowExamPanel] = useState(false);
    const [examTimer, setExamTimer] = useState(0);
    const [isExamActive, setIsExamActive] = useState(false);

    // ── Stable refs for values used inside draw hot-path ─────────────────
    // Using refs avoids re-creating handleBoardChange on every render,
    // which would cause Excalidraw to re-attach onChange and shake the canvas.
    const roleRef        = useRef(role);
    const isSlowModeRef  = useRef(false);
    const readyStateRef  = useRef(ReadyState.UNINSTANTIATED);
    const excalidrawAPIRef = useRef(null);
    const sendMessageRef = useRef(null);
    const userNameRef    = useRef(userName);

    useEffect(() => { roleRef.current = role; },        [role]);
    useEffect(() => { isSlowModeRef.current = isSlowMode; }, [isSlowMode]);
    useEffect(() => { userNameRef.current = userName; },  [userName]);

    // Thumbnail export debounce — heavy SVG work runs off the draw hot-path
    const thumbDebounceRef = useRef(null);
    const pendingElementsRef = useRef(null);

    // Trailing-edge sync & version tracking to guarantee the last stroke is always sent and avoid duplicate renders
    const syncTrailingTimerRef  = useRef(null);
    const latestElementsRef     = useRef(null);
    const lastSentVersionRef    = useRef(0);
    const lastSentLengthRef     = useRef(0);
    const lastAppliedVersionRef = useRef(0);
    const lastAppliedLengthRef  = useRef(0);

    // Cleanup pending timers on unmount
    useEffect(() => {
        return () => {
            if (syncTrailingTimerRef.current) clearTimeout(syncTrailingTimerRef.current);
            if (thumbDebounceRef.current) clearTimeout(thumbDebounceRef.current);
        };
    }, []);

    // Timer logic
    useEffect(() => {
        let interval;
        if (isExamActive && examTimer > 0) {
            interval = setInterval(() => {
                setExamTimer(prev => prev - 1);
            }, 1000);
        } else if (examTimer === 0 && isExamActive) {
             
            setIsExamActive(false);
            if (role === 'STUDENT') toast.warning('Exam time is up! Please stop writing.');
        }
        return () => clearInterval(interval);
    }, [isExamActive, examTimer, role]);

    const handleAssignExam = (elements, duration) => {
        sendMessage(JSON.stringify({ 
            type: 'command', 
            action: 'assign_exam', 
            snapshot: elements, 
            duration: duration 
        }));
        setExamTimer(duration * 60);
        setIsExamActive(true);
        if (role === 'TUTOR' || role === 'ADMIN') setActiveTab('my_class');
        toast.success(`Exam assigned for ${duration} minutes!`);
    };

    // Sync teacher board view for students
    useEffect(() => {
        teacherViewAPIRef.current = teacherViewAPI;
    }, [teacherViewAPI]);

    useEffect(() => {
        if (teacherViewAPIRef.current && teacherBoardSnapshot && role === 'STUDENT') {
            let totalVersion = 0;
            for (let i = 0; i < teacherBoardSnapshot.length; i++) {
                totalVersion += (teacherBoardSnapshot[i].version || 0) + (teacherBoardSnapshot[i].versionNonce || 0);
            }
            if (totalVersion !== lastAppliedVersionRef.current || teacherBoardSnapshot.length !== lastAppliedLengthRef.current) {
                lastAppliedVersionRef.current = totalVersion;
                lastAppliedLengthRef.current = teacherBoardSnapshot.length;
                teacherViewAPIRef.current.updateScene({ elements: teacherBoardSnapshot });
            }
        }
    }, [teacherBoardSnapshot, role]);

    // WebSocket URL Calculation — includes JWT for server-side auth
    const socketUrl = React.useMemo(() => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend1.onrender.com';
        // Detect local dev and use ws:// for localhost, wss:// for production
        let base;
        if (import.meta.env.DEV) {
            base = 'ws://localhost:8000';
        } else {
            base = apiBase.startsWith('https')
                ? apiBase.replace('https://', 'wss://')
                : apiBase.replace('http://', 'ws://');
        }
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        const token = getAccess() || '';
        return `${cleanBase}/ws/board/${roomId}/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
        onOpen: () => console.log("✅ Board WS Connected:", socketUrl),
        onError: (e) => console.error("❌ Board WS Error:", e),
    });

    // Keep refs in sync with live values so the draw callback never goes stale
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
    useEffect(() => { readyStateRef.current = readyState; },   [readyState]);

    // Handle WebSocket Messages
    // NOTE: excalidrawAPI is intentionally accessed via ref so this effect
    // does NOT re-register every time the API object is replaced by Excalidraw.
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            const api = excalidrawAPIRef.current;
            
            if (data.type === 'send_command' || data.type === 'command') {
                const action = data.action || data.data?.action;
                const payload = data.data || data;

                if (action === 'push_board' && roleRef.current === 'STUDENT' && api) {
                    api.updateScene({ elements: payload.snapshot });
                } else if (action === 'clear_boards' && roleRef.current === 'STUDENT' && api) {
                    api.updateScene({ elements: [] });
                } else if (action === 'lock_room') {
                     
                    setIsLocked(payload.locked);
                } else if (action === 'slow_mode') {
                    setIsSlowMode(payload.enabled);
                } else if (action === 'reaction' && roleRef.current === 'STUDENT') {
                    if (!payload.targetId || payload.targetId === userNameRef.current) {
                        setStudentReaction(payload.emoji);
                        setTimeout(() => setStudentReaction(null), 3000);
                    }
                } else if (action === 'assign_exam') {
                    setExamTimer(payload.duration * 60);
                    setIsExamActive(true);
                    if (roleRef.current === 'STUDENT' && api) {
                        api.updateScene({ elements: payload.snapshot });
                        toast.warning(`Exam started! You have ${payload.duration} minutes.`);
                    } else if (roleRef.current === 'TUTOR' || roleRef.current === 'ADMIN') {
                        setActiveTab('my_class');
                    }
                }
            }
            
            if (data.type === 'send_draw' || data.type === 'draw') {
                const payload = data.data || data;
                if (payload.is_thumbnail && (roleRef.current === 'TUTOR' || roleRef.current === 'ADMIN')) {
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
                
                if (payload.is_teacher_snapshot && roleRef.current === 'STUDENT') {
                    setTeacherBoardSnapshot(payload.snapshot);
                }
            }
        } catch (e) { console.error("WS Message Error:", e); }
    // Only lastMessage triggers re-run; role/api read from refs to avoid re-subscribing
    }, [lastMessage]);

    // ── Optimised board sync ──────────────────────────────────────────────
    //
    // KEY FIXES for shaking / delay:
    //   1. useCallback with EMPTY deps — function reference never changes, so
    //      Excalidraw never re-attaches onChange (which caused the shake).
    //   2. All volatile values (role, readyState, isSlowMode) are read from
    //      refs, not closures, so no stale data and no extra re-renders.
    //   3. Tutor sync at 120 ms (was 800 ms) for near-real-time feel.
    //   4. exportToSvg (heavy!) is moved to a 1 500 ms debounced idle task
    //      so it never blocks a drawing stroke.
    //
    const scheduleThumbnailExport = useCallback(() => {
        // Debounce: cancel any pending export and schedule a new one
        if (thumbDebounceRef.current) clearTimeout(thumbDebounceRef.current);
        thumbDebounceRef.current = setTimeout(async () => {
            const api = excalidrawAPIRef.current;
            const elements = pendingElementsRef.current;
            if (!api || !elements || elements.length === 0) return;
            if (readyStateRef.current !== ReadyState.OPEN) return;
            try {
                const svgElement = await exportToSvg({
                    elements,
                    appState: api.getAppState(),
                    files: api.getFiles()
                });
                if (sendMessageRef.current) {
                    sendMessageRef.current(JSON.stringify({
                        type: 'draw',
                        is_thumbnail: true,
                        clientId: userNameRef.current,
                        name: userNameRef.current || 'Student',
                        svg: svgElement.outerHTML,
                        snapshot: elements
                    }));
                }
            } catch (_e) { /* ignore */ }
        }, 1500); // 1.5 s debounce — thumbnail is low-priority
    }, []); // stable reference

    const broadcastTeacherSnapshot = useCallback((elements) => {
        if (!elements || readyStateRef.current !== ReadyState.OPEN) return;

        // Fast change detection using element versions & count to skip redundant broadcasts
        let totalVersion = 0;
        for (let i = 0; i < elements.length; i++) {
            totalVersion += (elements[i].version || 0) + (elements[i].versionNonce || 0);
        }

        if (totalVersion === lastSentVersionRef.current && elements.length === lastSentLengthRef.current) {
            return;
        }

        lastSentVersionRef.current = totalVersion;
        lastSentLengthRef.current = elements.length;
        lastSyncTime.current = Date.now();

        sendMessageRef.current?.(JSON.stringify({
            type: 'draw',
            is_teacher_snapshot: true,
            snapshot: elements
        }));
    }, []);

    const handleBoardChange = useCallback((elements) => {
        const api = excalidrawAPIRef.current;
        if (!api || readyStateRef.current !== ReadyState.OPEN) return;

        latestElementsRef.current = elements;
        const now = Date.now();
        // 400 ms throttle provides smooth live updates without multiplying WebSocket & render load
        // 5 000 ms in student slow-mode
        const throttleMs = (roleRef.current === 'STUDENT' && isSlowModeRef.current) ? 5000 : 400;
        const elapsed = now - lastSyncTime.current;

        if (roleRef.current === 'TUTOR' || roleRef.current === 'ADMIN') {
            if (elapsed >= throttleMs) {
                if (syncTrailingTimerRef.current) {
                    clearTimeout(syncTrailingTimerRef.current);
                    syncTrailingTimerRef.current = null;
                }
                broadcastTeacherSnapshot(elements);
            } else {
                // Trailing-edge guarantee: schedule send for remainder of throttle window
                // so the final stroke made inside the cooldown window is ALWAYS sent!
                if (!syncTrailingTimerRef.current) {
                    const delay = Math.max(throttleMs - elapsed, 50);
                    syncTrailingTimerRef.current = setTimeout(() => {
                        broadcastTeacherSnapshot(latestElementsRef.current);
                        syncTrailingTimerRef.current = null;
                    }, delay);
                }
            }
        } else if (roleRef.current === 'STUDENT') {
            // Store elements and kick off the debounced thumbnail export
            pendingElementsRef.current = elements;
            scheduleThumbnailExport();
        }
    }, [broadcastTeacherSnapshot, scheduleThumbnailExport]);

    const [currentTool, setCurrentTool] = useState('freedraw');
    const [penStrokeWidth, setPenStrokeWidth] = useState(2);
    const [penColor, setPenColor] = useState('#1e293b');
    const [showQuranMushaf, setShowQuranMushaf] = useState(false);

    const handleSelectTool = useCallback((tool) => {
        setCurrentTool(tool);
        excalidrawAPIRef.current?.setActiveTool({ type: tool });
    }, []);

    const handleChangePenStrokeWidth = useCallback((width) => {
        setPenStrokeWidth(width);
        setCurrentTool('freedraw');
        excalidrawAPIRef.current?.updateScene({
            appState: { currentItemStrokeWidth: width, currentItemRoughness: 0 }
        });
        excalidrawAPIRef.current?.setActiveTool({ type: 'freedraw' });
        toast.success(`Pen set to ${width === 1 ? 'Fine' : width === 2 ? 'Regular' : width === 4 ? 'Bold' : 'Heavy'}`);
    }, [toast]);

    const handleChangePenColor = useCallback((color) => {
        setPenColor(color);
        setCurrentTool('freedraw');
        excalidrawAPIRef.current?.updateScene({
            appState: { currentItemStrokeColor: color }
        });
        excalidrawAPIRef.current?.setActiveTool({ type: 'freedraw' });
    }, []);

    const handleClearOwnBoard = useCallback(async () => {
        if (await confirm('Clear your entire board?', { confirmLabel: 'Clear', danger: true })) {
            excalidrawAPIRef.current?.updateScene({ elements: [] });
            toast.info('Board cleared');
        }
    }, [confirm, toast]);

    const handleClearAllBoards = useCallback(async () => {
        if (await confirm('Clear all students boards?', { confirmLabel: 'Clear All', danger: true })) {
            sendMessageRef.current?.(JSON.stringify({ type: 'command', action: 'clear_boards' }));
            toast.success('Cleared all student boards');
        }
    }, [confirm, toast]);

    const handleToggleLock = useCallback(() => {
        setIsLocked(prev => {
            const next = !prev;
            sendMessageRef.current?.(JSON.stringify({ type: 'command', action: 'lock_room', locked: next }));
            return next;
        });
    }, []);

    const handleToggleSlowMode = useCallback(() => {
        setIsSlowMode(prev => {
            const next = !prev;
            sendMessageRef.current?.(JSON.stringify({ type: 'command', action: 'slow_mode', enabled: next }));
            return next;
        });
    }, []);

    const handleInsertQuranAyah = useCallback(({ text, surahName, verseKey }) => {
        const api = excalidrawAPIRef.current;
        if (!api) return;
        const elements = api.getSceneElements();
        const id = "ayah-" + Math.random().toString(36).substr(2, 9);
        const ayahText = `${text}\n\n— [${surahName || 'Surah'} : Ayah ${verseKey}]`;
        const newElement = {
            id,
            type: "text",
            x: 80,
            y: 100,
            width: 650,
            height: 140,
            text: ayahText,
            fontSize: 28,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#0f172a",
            backgroundColor: "transparent",
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000000),
            isDeleted: false,
            updated: Date.now(),
        };
        api.updateScene({ elements: [...elements, newElement] });
        setShowQuranMushaf(false);
        toast.success(`Ayah ${verseKey} placed on whiteboard!`);
    }, [toast]);

    // Auto-select Pen tool for tutors on mount — use ref so no extra render dep
    useEffect(() => {
        if (!excalidrawAPIRef.current) return;
        if (role !== 'TUTOR' && role !== 'ADMIN') return;
        const t = setTimeout(() => {
            excalidrawAPIRef.current?.updateScene({
                appState: { currentItemStrokeWidth: 2, currentItemRoughness: 0 }
            });
            excalidrawAPIRef.current?.setActiveTool({ type: 'freedraw' });
        }, 400);
        return () => clearTimeout(t);
    }, [role]);

    const handlePush = (mode) => {
        if (excalidrawAPI) {
            const elements = excalidrawAPI.getSceneElements();
            sendMessage(JSON.stringify({ type: 'command', action: 'push_board', snapshot: elements, mode: mode }));
            toast.success('Pushed to all students!');
        }
    };

    const handleDownload = async () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        if (elements.length === 0) { toast.warning('Board is empty!'); return; }
        
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
                <h2 className="text-3xl font-bold mb-2 uppercase tracking-tighter">Classroom Locked</h2>
                <p className="text-slate-500 font-semibold uppercase tracking-wide text-[11px]">The teacher has paused interaction.</p>
            </div>
        );
    }

    const isTutorOrAdmin = role === 'TUTOR' || role === 'ADMIN';

    return (
        <div className="w-full h-full flex flex-col bg-[#0f172a] overflow-hidden relative font-sans">
            
            {studentReaction && (
                <div className="absolute inset-0 pointer-events-none z-[9999] flex items-center justify-center">
                    <div className="text-9xl animate-bounce drop-shadow-2xl">{studentReaction}</div>
                </div>
            )}

            {/* ── Top Header: Board Switcher & Quick Controls ────────────────── */}
            <header className="flex-shrink-0 h-11 md:h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 z-30 gap-2 select-none">
                
                {/* Left: Board Switch Tabs */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {role === 'STUDENT' ? (
                        <div className="flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
                            <button
                                onClick={() => setActiveTab('my_board')}
                                className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === 'my_board' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                ✏️ My Board
                            </button>
                            <button
                                onClick={() => setActiveTab('teacher_board')}
                                className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === 'teacher_board' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                👨‍🏫 Teacher Board
                            </button>
                        </div>
                    ) : (
                        <div className="flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
                            <button
                                onClick={() => setActiveTab('my_board')}
                                className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === 'my_board' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                👨‍🏫 Teacher Board
                            </button>
                            <button
                                onClick={() => setActiveTab('my_class')}
                                className={`relative px-2.5 sm:px-3.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === 'my_class' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                👥 Students
                                {Object.keys(studentThumbnails).length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[9px] font-bold">
                                        {Object.keys(studentThumbnails).length}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {activeTab === 'student_view' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40 text-[11px] font-bold">
                            <span>👁️ Coaching: {activeStudentId ? studentThumbnails[activeStudentId]?.name : 'Student'}</span>
                            <button 
                                onClick={() => setActiveTab('my_class')}
                                className="hover:text-white font-bold ml-1 text-xs"
                                title="Return to student list"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Exam countdown / Board state indicator */}
                <div className="flex items-center gap-2">
                    {isExamActive && (
                        <div className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md border border-rose-400 animate-pulse">
                            <span>⏱️ Exam:</span>
                            <span>{Math.floor(examTimer / 60).toString().padStart(2, '0')}:{(examTimer % 60).toString().padStart(2, '0')}</span>
                        </div>
                    )}

                    {activeTab === 'teacher_board' && role === 'STUDENT' && (
                        <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg hidden sm:block">
                            👨‍🏫 Teacher's Live Board (Live Synchronized)
                        </div>
                    )}
                </div>

                {/* Right: Tutor Controls & Connection Status */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {isTutorOrAdmin && activeTab === 'my_board' && (
                        <>
                            <button
                                onClick={() => handlePush('overwrite')}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-bold shadow transition-all"
                                title="Push your board to all students"
                            >
                                <span>🚀</span>
                                <span className="hidden md:inline">Push to All</span>
                            </button>

                            <button
                                onClick={handleToggleLock}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${
                                    isLocked 
                                        ? 'bg-amber-600 text-white border-amber-500' 
                                        : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                                }`}
                                title="Lock or unlock student drawing"
                            >
                                <span>{isLocked ? '🔓' : '🔒'}</span>
                                <span className="hidden md:inline">{isLocked ? 'Unlock' : 'Lock'}</span>
                            </button>

                            <button
                                onClick={handleToggleSlowMode}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${
                                    isSlowMode 
                                        ? 'bg-indigo-600 text-white border-indigo-500' 
                                        : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                                }`}
                                title="Toggle slow sync mode for students"
                            >
                                <span>⏱️</span>
                                <span className="hidden lg:inline">{isSlowMode ? 'Slow: ON' : 'Slow'}</span>
                            </button>

                            <button
                                onClick={handleClearAllBoards}
                                className="flex items-center gap-1 px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] sm:text-xs font-bold transition-all"
                                title="Clear all students boards"
                            >
                                <span>🗑️</span>
                                <span className="hidden xl:inline">Clear All</span>
                            </button>
                        </>
                    )}

                    {/* Sync Status Indicator */}
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 px-2 py-1 bg-slate-800/70 rounded-lg border border-slate-700/60">
                        <span className={`w-2 h-2 rounded-full ${readyState === ReadyState.OPEN ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="hidden sm:inline">{readyState === ReadyState.OPEN ? 'Live' : 'Connecting'}</span>
                    </div>
                </div>
            </header>

            {/* Quran Mushaf Modal */}
            {showQuranMushaf && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl custom-scrollbar border border-amber-900/20">
                        <QuranMushaf 
                            onInsertToBoard={handleInsertQuranAyah}
                            onClose={() => setShowQuranMushaf(false)}
                        />
                    </div>
                </div>
            )}

            {/* ── Main Workspace: Vertical Left Toolbar + Clean Writing Canvas ─ */}
            <div className="flex-1 flex relative overflow-hidden">

                {/* Left-Hand Side Vertical Toolbar */}
                {(activeTab === 'my_board' || activeTab === 'student_view') && (
                    <aside className="w-13 sm:w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 px-1 gap-1.5 z-20 overflow-y-auto custom-scrollbar flex-shrink-0 text-white select-none">
                        
                        {/* 1. Pen Tool */}
                        <button
                            onClick={() => handleSelectTool('freedraw')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                                currentTool === 'freedraw' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Pen Tool (Draw Freely)"
                        >
                            ✏️
                        </button>

                        {/* Pen Thickness Selector (1, 2, 4) */}
                        <div className="flex flex-col gap-0.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 w-10 items-center">
                            {[1, 2, 4].map(w => (
                                <button
                                    key={w}
                                    onClick={() => handleChangePenStrokeWidth(w)}
                                    className={`w-8 py-0.5 text-[9px] font-bold rounded transition-all ${
                                        penStrokeWidth === w ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                    title={`Pen Thickness: ${w === 1 ? 'Fine (1px)' : w === 2 ? 'Regular (2px)' : 'Bold (4px)'}`}
                                >
                                    {w === 1 ? 'Fine' : w === 2 ? 'Reg' : 'Bold'}
                                </button>
                            ))}
                        </div>

                        {/* Pen Color Selector Dots */}
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80">
                            {[
                                { color: '#0f172a', name: 'Dark' },
                                { color: '#dc2626', name: 'Red' },
                                { color: '#2563eb', name: 'Blue' },
                                { color: '#16a34a', name: 'Green' },
                                { color: '#d97706', name: 'Amber' },
                                { color: '#9333ea', name: 'Purple' }
                            ].map(c => (
                                <button
                                    key={c.color}
                                    onClick={() => handleChangePenColor(c.color)}
                                    style={{ backgroundColor: c.color }}
                                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                                        penColor === c.color ? 'ring-2 ring-emerald-400 scale-125' : 'hover:scale-110 opacity-80 hover:opacity-100 border border-slate-600'
                                    }`}
                                    title={`Color: ${c.name}`}
                                />
                            ))}
                        </div>

                        <div className="w-8 h-px bg-slate-800 my-0.5" />

                        {/* 2. Eraser */}
                        <button
                            onClick={() => handleSelectTool('eraser')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                                currentTool === 'eraser' ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Eraser Tool"
                        >
                            🧹
                        </button>

                        {/* 3. Text */}
                        <button
                            onClick={() => handleSelectTool('text')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                                currentTool === 'text' ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Text Tool"
                        >
                            🔤
                        </button>

                        {/* 4. Shapes */}
                        <button
                            onClick={() => handleSelectTool('rectangle')}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                currentTool === 'rectangle' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Rectangle Shape"
                        >
                            ▢
                        </button>
                        <button
                            onClick={() => handleSelectTool('ellipse')}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                currentTool === 'ellipse' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Circle / Ellipse Shape"
                        >
                            ○
                        </button>
                        <button
                            onClick={() => handleSelectTool('arrow')}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                currentTool === 'arrow' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Arrow Tool"
                        >
                            ↗
                        </button>
                        <button
                            onClick={() => handleSelectTool('line')}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                currentTool === 'line' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Line Tool"
                        >
                            —
                        </button>

                        {/* 5. Laser Pointer */}
                        <button
                            onClick={() => handleSelectTool('laser')}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                currentTool === 'laser' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Laser Pointer"
                        >
                            🔦
                        </button>

                        <div className="w-8 h-px bg-slate-800 my-0.5" />

                        {/* 6. Quran Mushaf Ayah */}
                        <button
                            onClick={() => setShowQuranMushaf(true)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 transition-all"
                            title="Insert Quran Ayah"
                        >
                            📖
                        </button>

                        {/* 7. Math Tools */}
                        <button
                            onClick={() => setShowMathTools(true)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all"
                            title="Math & Geometry Tools"
                        >
                            📐
                        </button>

                        {/* 8. Exam Panel (Tutor / Admin) */}
                        {isTutorOrAdmin && (
                            <button
                                onClick={() => setShowExamPanel(true)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 transition-all"
                                title="Assign Live Exam"
                            >
                                📝
                            </button>
                        )}

                        <div className="w-8 h-px bg-slate-800 my-0.5" />

                        {/* 9. Clear Board */}
                        <button
                            onClick={handleClearOwnBoard}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                            title="Clear My Board"
                        >
                            🗑️
                        </button>

                        {/* 10. Download SVG */}
                        <button
                            onClick={handleDownload}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                            title="Download Whiteboard (SVG)"
                        >
                            💾
                        </button>

                        <div className="w-8 h-px bg-slate-800 my-0.5" />

                        {/* 11. Multi-Page Navigation */}
                        <div className="flex flex-col items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 w-11">
                            <span className="text-[8px] font-bold text-slate-400">PAGE</span>
                            <div className="text-[10px] font-bold text-emerald-400">
                                {currentPageIdx + 1}/{pages.length}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPageIdx === 0}
                                    className="w-4 h-5 rounded bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 text-[9px] flex items-center justify-center font-bold"
                                    title="Previous Page"
                                >
                                    ◀
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPageIdx >= pages.length - 1}
                                    className="w-4 h-5 rounded bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 text-[9px] flex items-center justify-center font-bold"
                                    title="Next Page"
                                >
                                    ▶
                                </button>
                            </div>
                            <button
                                onClick={handleAddPage}
                                className="w-8 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-all mt-0.5"
                                title="Add New Blank Page"
                            >
                                +
                            </button>
                        </div>

                    </aside>
                )}

                {/* Main Drawing Area - Clean Full Canvas */}
                <div className={`flex-1 relative ${(activeTab === 'my_board' || activeTab === 'student_view') ? 'block' : 'hidden'}`}>
                    <Excalidraw 
                        name="hidayah_live_board"
                        excalidrawAPI={(api) => {
                            // Write to both state (for JSX deps) and ref (for hot-path callbacks)
                            setExcalidrawAPI(api);
                            excalidrawAPIRef.current = api;
                        }} 
                        onChange={handleBoardChange}
                        viewModeEnabled={false}
                        initialData={{
                            appState: {
                                currentItemStrokeWidth: 1,
                                currentItemStrokeStyle: "solid",
                                currentItemRoughness: 0,
                                currentItemBackgroundColor: "transparent",
                                currentItemFillStyle: "hachure",
                                currentItemOpacity: 100,
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
                        <Excalidraw 
                            excalidrawAPI={(api) => setTeacherViewAPI(api)}
                            initialData={{ 
                                elements: teacherBoardSnapshot || [],
                                appState: { 
                                    theme: 'light', 
                                    zenModeEnabled: false,
                                    viewBackgroundColor: '#ffffff'
                                }
                            }} 
                            viewModeEnabled={true} 
                            UIOptions={{
                                canvasActions: {
                                    changeViewBackgroundColor: true,
                                    clearCanvas: false,
                                    export: false,
                                    loadScene: false,
                                    saveAsImage: false,
                                    theme: true,
                                }
                            }}
                        />
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50">
                            Teacher's Live Board (Read-Only)
                        </div>
                    </div>
                )}

                {/* Student Grid View */}
                {(role === 'TUTOR' || role === 'ADMIN') && activeTab === 'my_class' && (
                    <div className="flex-1 p-4 sm:p-10 overflow-y-auto bg-slate-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                                {Object.keys(studentThumbnails).length === 0 ? (
                                    <div className="col-span-full py-32 text-center bg-white rounded-card sm:rounded-card-lg border-2 border-dashed border-slate-200">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-3xl md:text-5xl mx-auto mb-6 shadow-inner">🏫</div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">The Classroom is Empty</h3>
                                        <p className="text-slate-500 font-bold max-w-xs mx-auto">Waiting for students to join and start drawing on their individual boards.</p>
                                    </div>
                                ) : (
                                    Object.entries(studentThumbnails).map(([id, data]) => (
                                        <div key={id} className="bg-white rounded-card sm:rounded-card-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-2xl transition-all group border-b-4 border-b-emerald-500/50">
                                            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1e293b] rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                                                        {data.name?.[0]}
                                                    </div>
                                                    <span className="font-bold text-slate-800 truncate max-w-[100px]">{data.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-emerald-100 px-2 sm:px-3 py-1 rounded-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-[11px] sm:text-[11px] font-semibold uppercase text-emerald-600 tracking-wide">Active</span>
                                                </div>
                                            </div>
                                            <div className="h-48 bg-white p-2 relative flex items-center justify-center border-b border-slate-100">
                                                {data.svg && data.svg.startsWith('<svg') ? (
                                                    <div dangerouslySetInnerHTML={{ __html: data.svg }} className="w-full h-full object-contain pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity [&>svg]:w-full [&>svg]:h-full" />
                                                ) : (
                                                    <div className="text-slate-200 font-bold text-4xl opacity-20 select-none">
                                                        {data.svg ? 'INVALID DATA' : 'EMPTY'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 bg-slate-50 flex gap-2">
                                                <button 
                                                    onClick={() => handleJoinStudent(id)}
                                                    className="flex-1 py-2 bg-[#1e293b] text-white text-[11px] font-semibold uppercase tracking-wide rounded-xl hover:bg-slate-700 transition-all shadow-xl shadow-slate-900/20"
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

                {showMathTools && (
                    <MathToolsPanel 
                        excalidrawAPI={excalidrawAPI} 
                        onClose={() => setShowMathTools(false)} 
                    />
                )}
                {showLibrary && (
                    <LibraryPanel 
                        excalidrawAPI={excalidrawAPI} 
                        onClose={() => setShowLibrary(false)} 
                    />
                )}
                {showExamPanel && (
                    <ExamPanel 
                        role={role}
                        onAssignExam={handleAssignExam}
                        onClose={() => setShowExamPanel(false)} 
                    />
                )}

                </div>{/* end inner flex */}
            </div>
    );
};

export default ExcalidrawWhiteboard;
