import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { JitsiMeeting } from '@jitsi/react-sdk';
import TldrawWhiteboard from '../components/Whiteboard/TldrawWhiteboard';

const LiveClassRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  
  // Responsive layout state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-screen w-full bg-[#0a0c10] overflow-hidden`}>
      {/* Jitsi Video Section */}
      <div className={`${isMobile ? 'h-[40vh] w-full' : 'h-full w-1/3'} border-r border-slate-800 bg-black`}>
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
      </div>

      {/* Whiteboard Section */}
      <div className={`${isMobile ? 'h-[60vh] w-full' : 'h-full w-2/3'} relative bg-white`}>
        <TldrawWhiteboard roomId={roomId} role={user?.role} />
      </div>
    </div>
  );
};

export default LiveClassRoom;
