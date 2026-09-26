import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WebRTCVideoChat from '../components/LiveClass/WebRTCVideoChat';
import ExcalidrawWhiteboard from '../components/Whiteboard/ExcalidrawWhiteboard';

const LiveClassRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState('classroom');
  // On mobile, user can toggle between whiteboard and video
  const [mobileView, setMobileView] = useState('whiteboard'); // 'whiteboard' | 'video'

  const handleExitRoom = () => navigate(-1);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0f172a] overflow-hidden font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 md:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-6 z-[3000] gap-2">

        {/* Left: LIVE badge + room name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
          <h2 className="text-white font-bold text-[11px] md:text-sm truncate max-w-[80px] sm:max-w-[180px]">
            Room: {roomId}
          </h2>
        </div>

        {/* Centre: layout/mode toggles */}
        <div className="flex items-center gap-2">

          {/* Desktop layout toggle */}
          <div className="hidden md:flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => { setLayoutMode('classroom'); setIsVideoOpen(true); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all ${layoutMode === 'classroom' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Classroom
            </button>
            <button
              onClick={() => { setLayoutMode('gallery'); setIsVideoOpen(true); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all ${layoutMode === 'gallery' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Gallery
            </button>
          </div>

          {/* Mobile view toggle */}
          <div className="flex md:hidden bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setMobileView('whiteboard')}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${mobileView === 'whiteboard' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}
            >
              ✏️ Board
            </button>
            <button
              onClick={() => setMobileView('video')}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${mobileView === 'video' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}
            >
              📹 Video
            </button>
          </div>
        </div>

        {/* Right: user avatar + exit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white hidden sm:flex">
            {user?.first_name?.[0]}
          </div>
          <button
            onClick={handleExitRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-xl text-red-400 hover:text-white text-[9px] md:text-[10px] font-bold uppercase tracking-wide transition-all"
            title="Leave room"
          >
            <span>✕</span>
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── Main content area ───────────────────────────────────────────── */}

      {/* DESKTOP layout: side-by-side */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* Whiteboard */}
        <div className={`relative transition-all duration-500 bg-[#f8fafc] ${
          layoutMode === 'gallery' ? 'hidden' : 'flex-1'
        }`}>
          <ExcalidrawWhiteboard roomId={roomId} role={user?.role} userName={user?.first_name} />
        </div>

        {/* Video sidebar */}
        <div className={`flex flex-col bg-slate-900 transition-all duration-500 relative ${
          layoutMode === 'gallery'
            ? 'flex-1'
            : isVideoOpen
              ? 'w-[380px] xl:w-[420px] border-l border-slate-800'
              : 'w-0'
        }`}>
          <WebRTCVideoChat
            roomId={roomId}
            isVideoOpen={isVideoOpen || layoutMode === 'gallery'}
            setIsVideoOpen={setIsVideoOpen}
            layoutMode={layoutMode}
          />

          {/* Collapse/expand handle */}
          {layoutMode === 'classroom' && (
            <button
              onClick={() => setIsVideoOpen(v => !v)}
              className="absolute top-1/2 -translate-y-1/2 -left-4 w-4 h-12 bg-slate-800 border border-slate-700 rounded-l-xl text-slate-400 hover:text-white transition-all z-[3000] flex items-center justify-center text-xs"
              title={isVideoOpen ? 'Hide video' : 'Show video'}
            >
              {isVideoOpen ? '❯' : '❮'}
            </button>
          )}
        </div>
      </div>

      {/* MOBILE layout: tab-based full-screen */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        {mobileView === 'whiteboard' ? (
          <div className="flex-1 bg-[#f8fafc] overflow-hidden">
            <ExcalidrawWhiteboard roomId={roomId} role={user?.role} userName={user?.first_name} />
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 overflow-hidden">
            <WebRTCVideoChat
              roomId={roomId}
              isVideoOpen={true}
              setIsVideoOpen={() => setMobileView('whiteboard')}
              layoutMode="classroom"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassRoom;
