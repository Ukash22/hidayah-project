import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WebRTCVideoChat from '../components/LiveClass/WebRTCVideoChat';
import ExcalidrawWhiteboard from '../components/Whiteboard/ExcalidrawWhiteboard';

const LiveClassRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState('classroom'); // 'classroom' or 'gallery'

  return (
    <div className="flex flex-col min-h-screen h-screen w-full bg-[#0f172a] overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 z-[3000]">
          <div className="flex items-center gap-2 md:gap-4">
              <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  LIVE
              </div>
              <h2 className="text-white font-bold text-xs md:text-sm truncate max-w-[120px] sm:max-w-[200px]">Room: {roomId}</h2>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button 
                  onClick={() => { setLayoutMode('classroom'); setIsVideoOpen(true); }}
                  className={`px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${layoutMode === 'classroom' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Classroom
              </button>
              <button 
                  onClick={() => { setLayoutMode('gallery'); setIsVideoOpen(true); }}
                  className={`px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${layoutMode === 'gallery' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Gallery
              </button>
          </div>

          <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                      {user?.first_name?.[0]}
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
          {/* Main Content Area */}
          <div className={`flex-1 relative transition-all duration-500 bg-[#f8fafc] ${layoutMode === 'gallery' ? 'hidden' : 'block'}`}>
              <ExcalidrawWhiteboard roomId={roomId} role={user?.role} userName={user?.first_name} />
          </div>

          {/* Video Area */}
          <div 
            className={`transition-all duration-500 flex flex-col bg-slate-900 z-[2000] relative ${
                layoutMode === 'gallery' 
                ? 'w-full h-full' 
                : isVideoOpen 
                  ? 'w-full h-[220px] md:h-full md:w-[450px] border-t md:border-t-0 md:border-l border-slate-800' 
                  : 'w-full h-0 md:h-full md:w-0'
            }`}
          >
              <div className="flex-1 w-full h-full bg-black overflow-hidden relative">
                  <WebRTCVideoChat roomId={roomId} isVideoOpen={isVideoOpen || layoutMode === 'gallery'} setIsVideoOpen={setIsVideoOpen} layoutMode={layoutMode} />
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
