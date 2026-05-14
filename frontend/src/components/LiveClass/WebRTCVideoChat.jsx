import React, { useEffect, useRef, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '../../context/AuthContext';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Hand, X } from 'lucide-react';

const WebRTCVideoChat = ({ roomId, isVideoOpen, setIsVideoOpen }) => {
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
                    console.log(`📤 Adding local track: ${track.kind}`);
                    pc.addTrack(track, localStream);
                });
                
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        sendMessage(JSON.stringify({ type: 'ice_candidate', peerId: user.id, targetId: id, candidate: event.candidate }));
                    }
                };
                
                pc.ontrack = (event) => {
                    console.log(`📥 Received remote track from ${peerName}`);
                    setRemoteStreams(prev => ({
                        ...prev,
                        [id]: { stream: event.streams[0], name: peerName }
                    }));
                };
                
                pc.oniceconnectionstatechange = () => {
                    console.log(`🧊 ICE State for ${peerName}: ${pc.iceConnectionState}`);
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
                console.log(`📩 Signaling: ${type} from ${name || peerId}`);
                
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
                        console.log(`✅ Connection established with ${peerId}`);
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

    return (
        <div className="flex flex-col h-full bg-[#111827] text-white">
            
            {/* Main Video Area */}
            <div className="flex-1 p-4 overflow-y-auto relative">
                <div className="grid grid-cols-1 gap-4 h-full">
                    
                    {/* Local User */}
                    <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex items-center justify-center h-48 md:h-64">
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''} ${isScreenSharing ? '' : '-scale-x-100'}`} />
                        {isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-900"><div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold">{user?.first_name?.[0] || 'U'}</div></div>}
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
                            {user?.first_name || 'You'} {isMuted && <MicOff size={14} className="text-red-400" />}
                        </div>
                        {raisedHands[user.id] && <div className="absolute top-2 right-2 bg-blue-500 p-2 rounded-full shadow-lg animate-bounce"><Hand size={18} className="text-white" /></div>}
                    </div>

                    {/* Remote Users */}
                    {Object.entries(remoteStreams).map(([id, data]) => (
                        <div key={id} className="relative bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex items-center justify-center h-48 md:h-64">
                            <video 
                                autoPlay playsInline 
                                ref={el => { if (el && el.srcObject !== data.stream) el.srcObject = data.stream; }} 
                                className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">
                                {data.name}
                            </div>
                            {raisedHands[id] && <div className="absolute top-2 right-2 bg-blue-500 p-2 rounded-full shadow-lg animate-bounce"><Hand size={18} className="text-white" /></div>}
                        </div>
                    ))}

                    {Object.keys(remoteStreams).length === 0 && (
                        <div className="h-48 md:h-64 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                            <p className="font-bold">Waiting for others to join...</p>
                            <p className="text-xs mt-2 text-slate-600">Connection Status: {readyState === ReadyState.OPEN ? 'Connected' : 'Connecting...'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Overlay */}
            {showChat && (
                <div className="absolute bottom-24 right-4 left-4 h-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-[100]">
                    <div className="flex justify-between items-center p-3 border-b border-slate-800">
                        <h4 className="font-bold text-sm">Class Chat</h4>
                        <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.name === 'You' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-slate-400 font-bold mb-1">{msg.name} • {msg.time}</span>
                                <div className={`px-3 py-2 rounded-xl text-sm ${msg.name === 'You' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-2 border-t border-slate-800 flex gap-2">
                        <input name="chatInput" type="text" placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold text-sm transition-colors">Send</button>
                    </form>
                </div>
            )}

            {/* Controls */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
                <button onClick={toggleMute} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={toggleVideo} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
                <button onClick={toggleScreenShare} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isScreenSharing ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    <MonitorUp size={20} />
                </button>
                <button onClick={handleRaiseHand} className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
                    <Hand size={20} />
                </button>
                <button onClick={() => setShowChat(!showChat)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showChat ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    <MessageSquare size={20} />
                </button>
                <div className="w-px h-8 bg-slate-700 mx-1"></div>
                <button onClick={() => setIsVideoOpen(false)} className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all">
                    <PhoneOff size={20} />
                </button>
            </div>
        </div>
    );
};

export default WebRTCVideoChat;
