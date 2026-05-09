import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { JitsiMeeting } from '@jitsi/react-sdk';
import TldrawWhiteboard from '../components/Whiteboard/TldrawWhiteboard';

const LiveClassRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#f4f5f8] overflow-hidden font-sans">
      
      {/* Whiteboard Section (Takes full width) */}
      <div className="flex-1 relative transition-all duration-300">
        <TldrawWhiteboard roomId={roomId} role={user?.role} userName={user?.first_name} />
      </div>

      {/* Collapsible Jitsi Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-slate-700 shadow-2xl transition-transform duration-300 z-[2000] flex flex-col ${isVideoOpen ? 'translate-x-0 w-80 md:w-96' : 'translate-x-full w-80 md:w-96'}`}
      >
          {/* Toggle Button attached to sidebar */}
          <button 
              onClick={() => setIsVideoOpen(!isVideoOpen)}
              className="absolute -left-12 top-20 bg-slate-900 border-y border-l border-slate-700 p-3 rounded-l-xl shadow-lg text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
              title={isVideoOpen ? "Hide Video" : "Show Video"}
          >
              {/* Video Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isVideoOpen ? 'text-red-400' : 'text-emerald-400'}`}>
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
          </button>

          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Class Video
              </h3>
              <button onClick={() => setIsVideoOpen(false)} className="text-slate-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
              </button>
          </div>

          <div className="flex-1 w-full bg-black">
              {isVideoOpen && (
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={`HidayahClass_${roomId}`}
                    configOverwrite={{
                        startWithAudioMuted: true,
                        disableModeratorIndicator: true,
                    }}
                    interfaceConfigOverwrite={{
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
                    }}
                    userInfo={{
                        displayName: user?.name || 'Student'
                    }}
                    getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
                />
              )}
          </div>
      </div>
    </div>
  );
};

export default LiveClassRoom;
