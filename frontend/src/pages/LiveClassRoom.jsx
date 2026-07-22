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

  const handleExitRoom = () => navigate(-1);

  return (
    <div className="flex flex-col min-h-screen h-screen w-full bg-[#0f172a] overflow-hidden font-sans">

      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 z-[3000] gap-3">
          {/* Left: LIVE badge + room name */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
              </div>
              <h2 className="text-white font-bold text-xs md:text-sm truncate max-w-[100px] sm:max-w-[200px]">
                  Room: {roomId}
              </h2>
          </div>

          {/* Centre: layout toggle */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 flex-shrink-0">
              <button
                  onClick={() => { setLayoutMode('classroom'); setIsVideoOpen(true); }}
                  className={`px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[11px] font-semibold uppercase tracking-wide transition-all ${layoutMode === 'classroom' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Classroom
              </button>
              <button
                  onClick={() => { setLayoutMode('gallery'); setIsVideoOpen(true); }}
                  className={`px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[11px] font-semibold uppercase tracking-wide transition-all ${layoutMode === 'gallery' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Gallery
              </button>
          </div>

          {/* Right: user avatar + exit */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white hidden sm:flex">
                  {user?.first_name?.[0]}
              </div>
              <button
                  onClick={handleExitRoom}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-xl text-red-400 hover:text-white text-[10px] md:text-[11px] font-bold uppercase tracking-wide transition-all"
                  title="Leave room"
              >
                  <span>✕</span>
                  <span className="hidden sm:inline">Exit Room</span>
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
          {/* Whiteboard */}
          <div className={`flex-1 relative transition-all duration-500 bg-[#f8fafc] ${layoutMode === 'gallery' ? 'hidden' : 'block'}`}>
              <ExcalidrawWhiteboard roomId={roomId} role={user?.role} userName={user?.first_name} />
          </div>

          {/* Video sidebar */}
          <div
            className={`transition-all duration-500 flex flex-col bg-slate-900 z-[2000] relative ${
                layoutMode === 'gallery'
                ? 'w-full h-full'
                : isVideoOpen
                  ? 'w-full h-[220px] md:h-full md:w-[400px] border-t md:border-t-0 md:border-l border-slate-800'
                  : 'w-full h-0 md:h-full md:w-0'
            }`}
          >
              <div className="flex-1 w-full h-full bg-black overflow-hidden relative">
                  <WebRTCVideoChat
                      roomId={roomId}
                      isVideoOpen={isVideoOpen || layoutMode === 'gallery'}
                      setIsVideoOpen={setIsVideoOpen}
                      layoutMode={layoutMode}
                  />
              </div>

              {layoutMode === 'classroom' && (
                  <button
                    onClick={() => setIsVideoOpen(!isVideoOpen)}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-left-10 bg-slate-900 border-x border-t md:border-x-0 md:border-y md:border-l border-slate-800 p-2 rounded-t-xl md:rounded-t-none md:rounded-l-xl text-slate-400 hover:text-white transition-all shadow-2xl z-[3000]"
                  >
                    <span className="md:hidden">{isVideoOpen ? '▼' : '▲'}</span>
                    <span className="hidden md:inline">{isVideoOpen ? '❯' : '❮'}</span>
                  </button>
              )}
          </div>
      </div>
    </div>
  );
};

export default LiveClassRoom;
