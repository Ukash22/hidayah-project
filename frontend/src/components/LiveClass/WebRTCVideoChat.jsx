import React, { useEffect, useRef, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '../../context/AuthContext';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Hand, X } from 'lucide-react';

const WebRTCVideoChat = ({ roomId, isVideoOpen, setIsVideoOpen, layoutMode = 'classroom' }) => {
    const { user } = useAuth();
    
    // Media State
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [raisedHands, setRaisedHands] = useState({});
    
    const localVideoRef = useRef(null);
    const peerConnections = useRef({});
    const chatEndRef = useRef(null);
    
    // WebSocket URL for signaling
    const socketUrl = React.useMemo(() => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
        let base = apiBase.replace(/^http/, 'ws');
        if (!base.startsWith('ws')) base = `wss://${base}`;
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}/signaling/${roomId}/`;
    }, [roomId]);

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
        heartbeat: {
            message: JSON.stringify({ type: 'ping' }),
            interval: 20000,
            timeout: 60000,
        },
        onOpen: () => {
            console.log("✅ Signaling Connected");
            sendMessage(JSON.stringify({ type: 'peer_join', peerId: user.id, name: user.first_name || 'User' }));
        }
    });

    // Initialize Local Media
    useEffect(() => {
        if (!isVideoOpen) return;
        
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Failed to get local media", err);
                alert("Please allow camera and microphone access.");
            }
        };
        initMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            setRemoteStreams({});
        };
    }, [isVideoOpen]);

    // Heartbeat to keep connection alive
    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            const interval = setInterval(() => {
                sendMessage(JSON.stringify({ type: 'ping' }));
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [readyState, sendMessage]);

    // Handle Signaling Messages
    useEffect(() => {
        if (!lastMessage || !isVideoOpen || !localStream) return;
        
        try {
            const data = JSON.parse(lastMessage.data);
            const { type, peerId, name, sdp, candidate, message, emoji } = data;
            
            // Ignore our own messages
            if (String(peerId) === String(user.id)) return;

            const getPeerConnection = async (id, peerName) => {
                if (peerConnections.current[id]) return peerConnections.current[id];
                
                console.log(`📡 Creating PeerConnection for ${peerName} (${id})`);
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });
                
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
                
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        sendMessage(JSON.stringify({ type: 'ice_candidate', peerId: user.id, targetId: id, candidate: event.candidate }));
                    }
                };
                
                pc.ontrack = (event) => {
                    setRemoteStreams(prev => ({
                        ...prev,
                        [id]: { stream: event.streams[0], name: peerName }
                    }));
                };
                
                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        setRemoteStreams(prev => {
                            const newStreams = { ...prev };
                            delete newStreams[id];
                            return newStreams;
                        });
                        pc.close();
                        delete peerConnections.current[id];
                    }
                };

                peerConnections.current[id] = pc;
                return pc;
            };

            const handleSignal = async () => {
                if (type === 'peer_join') {
                    const pc = await getPeerConnection(peerId, name);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendMessage(JSON.stringify({ type: 'offer', peerId: user.id, targetId: peerId, name: user.first_name, sdp: pc.localDescription }));
                } 
                else if (type === 'offer' && String(data.targetId) === String(user.id)) {
                    const pc = await getPeerConnection(peerId, name);
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage(JSON.stringify({ type: 'answer', peerId: user.id, targetId: peerId, sdp: pc.localDescription }));
                } 
                else if (type === 'answer' && String(data.targetId) === String(user.id)) {
                    const pc = peerConnections.current[peerId];
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    }
                } 
                else if (type === 'ice_candidate' && String(data.targetId) === String(user.id)) {
                    const pc = peerConnections.current[peerId];
                    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                else if (type === 'chat') {
                    setMessages(prev => [...prev, { name, text: message, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
                    setShowChat(true);
                }
                else if (type === 'raise_hand') {
                    setRaisedHands(prev => ({ ...prev, [peerId]: true }));
                    setTimeout(() => {
                        setRaisedHands(prev => { const next = {...prev}; delete next[peerId]; return next; });
                    }, 5000);
                }
            };
            handleSignal();
        } catch (e) {
            console.error("Signaling Error", e);
        }
    }, [lastMessage, isVideoOpen, localStream, user.id, user.first_name, sendMessage]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    // Media Controls
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!localStream.getAudioTracks()[0].enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!localStream.getVideoTracks()[0].enabled);
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                
                screenTrack.onended = () => {
                    stopScreenShare();
                };

                // Replace video track for all peers
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });
                
                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
                setIsScreenSharing(true);
            } catch (err) {
                console.error("Screen sharing failed", err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        const videoTrack = localStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        setIsScreenSharing(false);
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        const val = e.target.chatInput.value.trim();
        if (!val) return;
        sendMessage(JSON.stringify({ type: 'chat', peerId: user.id, name: user.first_name || 'User', message: val }));
        setMessages(prev => [...prev, { name: 'You', text: val, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
        e.target.reset();
    };

    const handleRaiseHand = () => {
        sendMessage(JSON.stringify({ type: 'raise_hand', peerId: user.id }));
        setRaisedHands(prev => ({ ...prev, [user.id]: true }));
        setTimeout(() => {
            setRaisedHands(prev => { const next = {...prev}; delete next[user.id]; return next; });
        }, 5000);
    };

    if (!isVideoOpen) return null;

    const gridClasses = layoutMode === 'gallery' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
        : "flex flex-col gap-4";

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white">
            
            {/* Main Video Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className={gridClasses}>
                    
                    {/* Local User */}
                    <div className={`relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${layoutMode === 'gallery' ? 'aspect-video h-auto' : 'h-48 md:h-56'} ${isScreenSharing ? 'border-emerald-500' : 'border-slate-700'}`}>
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''} ${isScreenSharing ? '' : '-scale-x-100'}`} />
                        {isVideoOff && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-3xl font-black text-slate-500 border-4 border-slate-700">
                                    {user?.first_name?.[0] || 'U'}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Camera Off</span>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-white/10">
                            {user?.first_name || 'You'} (Me) {isMuted && <MicOff size={12} className="text-red-400" />}
                        </div>
                        {raisedHands[user.id] && <div className="absolute top-3 right-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-bounce border-2 border-white"><Hand size={16} className="text-white" /></div>}
                        {isScreenSharing && <div className="absolute top-3 left-3 bg-emerald-500 px-2 py-1 rounded text-[8px] font-black uppercase">Sharing Screen</div>}
                    </div>

                    {/* Remote Users */}
                    {Object.entries(remoteStreams).map(([id, data]) => (
                        <div key={id} className={`relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 transition-all duration-300 ${layoutMode === 'gallery' ? 'aspect-video h-auto' : 'h-48 md:h-56'}`}>
                            <video 
                                autoPlay playsInline 
                                ref={el => { if (el && el.srcObject !== data.stream) el.srcObject = data.stream; }} 
                                className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/10">
                                {data.name}
                            </div>
                            {raisedHands[id] && <div className="absolute top-3 right-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-bounce border-2 border-white"><Hand size={16} className="text-white" /></div>}
                        </div>
                    ))}

                    {Object.keys(remoteStreams).length === 0 && layoutMode === 'gallery' && (
                        <div className="aspect-video rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <Video size={32} className="text-slate-700" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-xs">Waiting for participants...</p>
                            <p className="text-[10px] mt-2 text-slate-600 font-bold uppercase tracking-tighter">Status: {readyState === ReadyState.OPEN ? 'Connected' : 'Connecting...'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Drawer Overlay */}
            {showChat && (
                <div className="absolute bottom-24 right-6 left-6 md:left-auto md:w-96 h-[500px] max-h-[70vh] bg-slate-900 border border-slate-700 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col z-[100] animate-in slide-in-from-bottom-10">
                    <div className="flex justify-between items-center p-5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-emerald-500" />
                            <h4 className="font-black text-xs uppercase tracking-widest">Class Chat</h4>
                        </div>
                        <button onClick={() => setShowChat(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X size={16} /></button>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.name === 'You' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">{msg.name} • {msg.time}</span>
                                <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${msg.name === 'You' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-900/50 rounded-b-[2rem]">
                        <input name="chatInput" type="text" placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Premium Controls Bar */}
            <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center gap-4">
                <button 
                    onClick={toggleMute} 
                    className={`group w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    <span className="text-[7px] font-black mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Mute</span>
                </button>

                <button 
                    onClick={toggleVideo} 
                    className={`group w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title={isVideoOff ? 'Start Video' : 'Stop Video'}
                >
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    <span className="text-[7px] font-black mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Video</span>
                </button>

                <button 
                    onClick={toggleScreenShare} 
                    className={`group w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${isScreenSharing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title="Share Screen"
                >
                    <MonitorUp size={20} />
                    <span className="text-[7px] font-black mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Share</span>
                </button>

                <div className="w-px h-10 bg-slate-800 mx-2"></div>

                <button 
                    onClick={handleRaiseHand} 
                    className="group w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-90"
                    title="Raise Hand"
                >
                    <Hand size={20} />
                    <span className="text-[7px] font-black mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Hand</span>
                </button>

                <button 
                    onClick={() => setShowChat(!showChat)} 
                    className={`group w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${showChat ? 'bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title="Chat"
                >
                    <MessageSquare size={20} />
                    <span className="text-[7px] font-black mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Chat</span>
                </button>

                <div className="w-px h-10 bg-slate-800 mx-2"></div>

                <button 
                    onClick={() => setIsVideoOpen(false)} 
                    className="group w-24 h-14 rounded-2xl flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all active:scale-90 border border-red-500/20"
                    title="Leave Call"
                >
                    <PhoneOff size={20} />
                    <span className="text-[7px] font-black mt-1 uppercase tracking-widest">LEAVE</span>
                </button>
            </div>
        </div>
    );
};

export default WebRTCVideoChat;
