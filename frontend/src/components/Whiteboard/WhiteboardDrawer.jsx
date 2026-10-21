import React from 'react';
import { 
    Edit3, Eraser, Trash2, BookOpen, FileCheck2, Type, 
    Crosshair, Calculator, ChevronLeft, ChevronRight, Plus, 
    Users, Send, Lock, Unlock, Zap, Download, X, Layers,
    Maximize2
} from 'lucide-react';

const STROKE_WIDTH_OPTIONS = [
    { label: 'Fine', value: 1, desc: 'Thin', iconWidth: 'h-[2px]' },
    { label: 'Regular', value: 2, desc: 'Medium', iconWidth: 'h-[3px]' },
    { label: 'Bold', value: 4, desc: 'Bold', iconWidth: 'h-[5px]' },
    { label: 'Heavy', value: 8, desc: 'Extra Bold', iconWidth: 'h-[8px]' },
];

const PEN_COLORS = [
    { name: 'Dark Slate', value: '#1e293b' },
    { name: 'Emerald Green', value: '#059669' },
    { name: 'Sapphire Blue', value: '#2563eb' },
    { name: 'Ruby Red', value: '#dc2626' },
    { name: 'Amber Gold', value: '#d97706' },
    { name: 'Purple', value: '#7c3aed' },
];

const WhiteboardDrawer = ({
    isOpen,
    onClose,
    role,
    activeTab,
    setActiveTab,
    currentTool,
    onSelectTool,
    penStrokeWidth,
    onChangePenStrokeWidth,
    penColor,
    onChangePenColor,
    onClearOwnBoard,
    onClearBoards,
    onOpenExam,
    onOpenQuran,
    onOpenMathTools,
    onPush,
    onDownload,
    pages,
    currentPageIdx,
    onPrevPage,
    onNextPage,
    onAddPage,
    onGoToPage,
    isLocked,
    onToggleLock,
    isSlowMode,
    onToggleSlowMode,
    studentCount,
}) => {
    const isTutorOrAdmin = role === 'TUTOR' || role === 'ADMIN';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex pointer-events-auto">
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
            />

            {/* Vertical Drawer Panel */}
            <aside 
                className="relative w-80 max-w-[85vw] h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/80 shadow-2xl flex flex-col text-slate-100 z-10 animate-in slide-in-from-left duration-200 select-none overflow-hidden"
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/40">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            🛠️
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Whiteboard Tools</h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {role === 'STUDENT' ? 'Student Workspace' : 'Tutor Classroom Drawer'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                        title="Close Drawer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Tools List (Vertical) */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">

                    {/* SECTION 1: PEN & WRITING STYLES */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drawing Pen</span>
                            {currentTool === 'freedraw' && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    ACTIVE
                                </span>
                            )}
                        </div>

                        {/* Pen Select Button */}
                        <button
                            onClick={() => { onSelectTool('freedraw'); }}
                            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-2.5 text-xs font-bold transition-all shadow-sm ${
                                currentTool === 'freedraw'
                                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                        >
                            <Edit3 size={16} />
                            <span>Select Pen Tool</span>
                        </button>

                        {/* Boldness / Stroke Width Picker */}
                        <div className="pt-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
                                Pen Thickness / Boldness
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {STROKE_WIDTH_OPTIONS.map((opt) => {
                                    const isSelected = penStrokeWidth === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => onChangePenStrokeWidth(opt.value)}
                                            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                                isSelected 
                                                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                                                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700 text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-[11px] font-bold">
                                                <span>{opt.label}</span>
                                                <span className="text-[9px] text-slate-400 font-normal">{opt.desc}</span>
                                            </div>
                                            <div className="w-full bg-slate-700/60 rounded-full my-1.5 h-2 flex items-center px-1">
                                                <div 
                                                    className={`w-full rounded-full transition-all ${opt.iconWidth} ${isSelected ? 'bg-emerald-400' : 'bg-slate-300'}`} 
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pen Colors */}
                        <div className="pt-1">
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wide">
                                Pen Color
                            </label>
                            <div className="flex items-center gap-2 justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                                {PEN_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => onChangePenColor(c.value)}
                                        title={c.name}
                                        style={{ backgroundColor: c.value }}
                                        className={`w-7 h-7 rounded-full border-2 transition-all transform hover:scale-110 ${
                                            penColor === c.value ? 'border-white scale-110 shadow-lg ring-2 ring-emerald-400' : 'border-transparent'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: CLEANER / ERASER & CLEAR */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Cleaner & Eraser</span>

                        {/* Eraser Tool */}
                        <button
                            onClick={() => { onSelectTool('eraser'); }}
                            className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
                                currentTool === 'eraser'
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <Eraser size={16} />
                                <span>Eraser Tool (Rub out strokes)</span>
                            </div>
                            {currentTool === 'eraser' && (
                                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold">ON</span>
                            )}
                        </button>

                        {/* Clear My Board */}
                        <button
                            onClick={onClearOwnBoard}
                            className="w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/20 transition-all"
                        >
                            <Trash2 size={15} />
                            <span>Clear My Board</span>
                        </button>

                        {/* Clear All Boards (Tutor/Admin only) */}
                        {isTutorOrAdmin && (
                            <button
                                onClick={onClearBoards}
                                className="w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-bold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-700 border border-red-800/50 transition-all"
                            >
                                <Trash2 size={15} />
                                <span>Clear All Students' Boards</span>
                            </button>
                        )}
                    </div>

                    {/* SECTION 3: TEACHING CONTENT (QURAN MUSHAF & SET EXAM) */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Content & Assessments</span>

                        {/* Quran Mushaf */}
                        <button
                            onClick={() => { onOpenQuran(); onClose(); }}
                            className="w-full py-2.5 px-3 rounded-lg flex items-center justify-between text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm group"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="text-base group-hover:scale-110 transition-transform">📖</span>
                                <div>
                                    <span className="block text-left">Quran Mushaf</span>
                                    <span className="block text-[9px] text-amber-400/70 font-normal">Surahs, Reciters & Ayah to Board</span>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-400">Open &rsaquo;</span>
                        </button>

                        {/* Set Exam / Exam Panel */}
                        <button
                            onClick={() => { onOpenExam(); onClose(); }}
                            className="w-full py-2.5 px-3 rounded-lg flex items-center justify-between text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm group"
                        >
                            <div className="flex items-center gap-2.5">
                                <FileCheck2 size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <span className="block text-left">{isTutorOrAdmin ? 'Set Live Exam' : 'Exam Workspace'}</span>
                                    <span className="block text-[9px] text-indigo-400/70 font-normal">
                                        {isTutorOrAdmin ? 'Assign Pop Quiz with Timer' : 'View Exam & Timer'}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400">Open &rsaquo;</span>
                        </button>
                    </div>

                    {/* SECTION 4: TEXT, LASER & MATH TOOLS */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Annotation & Math</span>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Text Tool */}
                            <button
                                onClick={() => { onSelectTool('text'); }}
                                className={`py-2 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${
                                    currentTool === 'text'
                                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/50'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                            >
                                <Type size={15} />
                                <span>Text Note</span>
                            </button>

                            {/* Laser Tool */}
                            <button
                                onClick={() => { onSelectTool('laser'); }}
                                className={`py-2 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${
                                    currentTool === 'laser'
                                        ? 'bg-red-600 text-white ring-2 ring-red-400/50'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                            >
                                <Crosshair size={15} />
                                <span>Laser Point</span>
                            </button>
                        </div>

                        {/* Math Tools */}
                        <button
                            onClick={() => { onOpenMathTools(); onClose(); }}
                            className="w-full py-2 px-3 rounded-lg flex items-center justify-between text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Calculator size={15} />
                                <span>Math & Geometric Tools</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400">&rsaquo;</span>
                        </button>
                    </div>

                    {/* SECTION 5: PAGES NAVIGATION */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Board Pages</span>
                            <span className="text-[10px] text-slate-400 font-bold">
                                {currentPageIdx + 1} / {pages.length}
                            </span>
                        </div>

                        {/* Page controls */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={onPrevPage}
                                disabled={currentPageIdx === 0}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all"
                                title="Previous Page"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex-1 flex gap-1 overflow-x-auto py-1 scrollbar-none">
                                {pages.map((p, idx) => (
                                    <button
                                        key={p.id}
                                        onClick={() => onGoToPage(idx)}
                                        className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            idx === currentPageIdx
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={onNextPage}
                                disabled={currentPageIdx === pages.length - 1}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all"
                                title="Next Page"
                            >
                                <ChevronRight size={16} />
                            </button>

                            <button
                                onClick={onAddPage}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                title="Add New Page"
                            >
                                <Plus size={14} />
                                <span>Page</span>
                            </button>
                        </div>
                    </div>

                    {/* SECTION 6: CLASSROOM VIEW & SYNC MODES */}
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Classroom Views</span>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setActiveTab('my_board'); onClose(); }}
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'my_board'
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                {role === 'STUDENT' ? 'My Board' : 'Main Board'}
                            </button>

                            {role === 'STUDENT' && (
                                <button
                                    onClick={() => { setActiveTab('teacher_board'); onClose(); }}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === 'teacher_board'
                                            ? 'bg-white text-slate-900 shadow-md'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                >
                                    Teacher's Board
                                </button>
                            )}

                            {isTutorOrAdmin && (
                                <button
                                    onClick={() => { setActiveTab('my_class'); onClose(); }}
                                    className={`relative py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === 'my_class'
                                            ? 'bg-white text-slate-900 shadow-md'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                >
                                    <span>Students Grid</span>
                                    {studentCount > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[9px] font-bold">
                                            {studentCount}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Push to students (Tutor/Admin only) */}
                        {isTutorOrAdmin && (
                            <button
                                onClick={() => { onPush('overwrite'); }}
                                className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                            >
                                <Send size={14} />
                                <span>Push Board to Students</span>
                            </button>
                        )}

                        {/* Lock Room & Slow Mode (Tutor/Admin only) */}
                        {isTutorOrAdmin && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    onClick={onToggleLock}
                                    className={`py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        isLocked ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                >
                                    {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                    <span>{isLocked ? 'Room Locked' : 'Lock Room'}</span>
                                </button>

                                <button
                                    onClick={onToggleSlowMode}
                                    className={`py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        isSlowMode ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                >
                                    <Zap size={13} />
                                    <span>{isSlowMode ? 'Slow On' : 'Slow Mode'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* SECTION 7: DOWNLOAD BOARD */}
                    <div className="pt-1">
                        <button
                            onClick={() => { onDownload(); onClose(); }}
                            className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
                        >
                            <Download size={15} />
                            <span>Download Board Snapshot</span>
                        </button>
                    </div>

                </div>

                {/* Footer with user info & quick close */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold truncate max-w-[150px]">{role} Mode</span>
                    <button 
                        onClick={onClose}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-bold uppercase tracking-wider"
                    >
                        Done
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default WhiteboardDrawer;
