import React, { useEffect, useRef, useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '../../context/AuthContext';
import { getAccess } from '../../services/tokenStore';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Hand, X } from 'lucide-react';

const RemoteVideoTile = ({ id: _id, data, isStage = false, isPinned = false, isSpeaking = false, onPin, raisedHand }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const [hasActiveVideo, setHasActiveVideo] = useState(false);

    useEffect(() => {
        const stream = data?.stream;
        if (!stream) {
            setHasActiveVideo(false);
            return;
        }

        if (videoRef.current && videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Remote video play prevented:", e));
        }

        if (audioRef.current && audioRef.current.srcObject !== stream) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(e => console.warn("Remote audio play prevented:", e));
        }

        const updateStatus = () => {
            const vTracks = stream.getVideoTracks();
            const live = vTracks.some(t => t.readyState === 'live' && t.enabled && !t.muted);
            setHasActiveVideo(live);
        };

        updateStatus();

        const vTracks = stream.getVideoTracks();
        vTracks.forEach(t => {
            t.addEventListener('unmute', updateStatus);
            t.addEventListener('mute', updateStatus);
            t.addEventListener('ended', updateStatus);
        });

        return () => {
            vTracks.forEach(t => {
                t.removeEventListener('unmute', updateStatus);
                t.removeEventListener('mute', updateStatus);
                t.removeEventListener('ended', updateStatus);
            });
        };
    }, [data?.stream, data?._v]);

    const isHost = data?.isHost || data?.role === 'TUTOR' || data?.role === 'ADMIN';

    if (isStage) {
        return (
            <div className={`relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group ${
                isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-emerald-500/30' : 'border-slate-700/80'
            }`}>
                <audio ref={audioRef} autoPlay playsInline />
                <video 
                    ref={videoRef}
                    autoPlay 
                    muted
                    playsInline 
                    onPlaying={() => setHasActiveVideo(true)}
                    onLoadedData={() => setHasActiveVideo(true)}
                    className={`w-full h-full object-contain md:object-cover transition-opacity duration-300 ${hasActiveVideo ? 'opacity-100' : 'opacity-0'}`}
                />

                {!hasActiveVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 gap-3 select-none">
                        <div className="relative">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-emerald-600/20 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-emerald-400 border-4 border-emerald-500/40 shadow-2xl">
                                {data?.name?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xs">
                                🎙️
                            </span>
                        </div>
                        <span className="text-base font-bold text-white font-display">{data?.name}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                            {isHost ? '★ Host Speaker · Audio Live' : 'Participant · Audio Live'}
                        </span>
                    </div>
                )}

                {/* Speaking Live Indicator Badge */}
                {isSpeaking && (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-emerald-400 backdrop-blur-md animate-pulse z-10">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Speaking</span>
                    </div>
                )}

                {/* Host Crown / Spotlight Badge */}
                {isHost && !isSpeaking && (
                    <div className="absolute top-3 left-3 bg-amber-500/90 text-amber-950 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg border border-amber-400 backdrop-blur-md z-10">
                        <span>👑</span>
                        <span>HOST / TUTOR</span>
                    </div>
                )}

                {/* Bottom Name Pill */}
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2 shadow-xl z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{data?.name || 'Participant'}</span>
                    {isPinned && <span className="text-[9px] text-indigo-400 font-bold ml-1 bg-indigo-500/20 px-1.5 py-0.5 rounded">Pinned</span>}
                </div>

                {/* Pin / Switch Action Button */}
                {onPin && (
                    <button
                        onClick={onPin}
                        className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-lg flex items-center gap-1.5 z-10"
                        title={isPinned ? 'Unpin from stage' : 'Pin to stage'}
                    >
                        <span>📌</span>
                        <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                    </button>
                )}

                {raisedHand && (
                    <div className="absolute top-3 right-16 bg-yellow-500 p-2 rounded-full shadow-lg animate-bounce border-2 border-white z-10">
                        <Hand size={16} className="text-white" />
                    </div>
                )}
            </div>
        );
    }

    // Small Thumbnail Tile (Zoom Filmstrip Mode)
    return (
        <div 
            onClick={onPin}
            className={`relative bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 group cursor-pointer w-28 sm:w-36 h-20 sm:h-24 flex-shrink-0 ${
                isSpeaking 
                    ? 'ring-2 sm:ring-4 ring-emerald-400 border-emerald-400 shadow-md shadow-emerald-500/40' 
                    : isPinned 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40' 
                        : 'border-slate-700/80 hover:border-emerald-400'
            }`}
            title="Click to spotlight on big screen"
        >
            <audio ref={audioRef} autoPlay playsInline />
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                onPlaying={() => setHasActiveVideo(true)}
                onLoadedData={() => setHasActiveVideo(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${hasActiveVideo ? 'opacity-100' : 'opacity-0'}`}
            />

            {!hasActiveVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-1 select-none">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/40">
                        {data?.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{data?.name}</span>
                </div>
            )}

            {isHost && (
                <div className="absolute top-1 left-1 bg-amber-500 text-amber-950 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-tighter">
                    HOST
                </div>
            )}

            <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase truncate max-w-[80px] border border-white/10 flex items-center gap-1">
                <span>{data?.name || 'Participant'}</span>
            </div>

            {/* Hover Pin Indicator */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md shadow">
                    📌 Spotlight
                </span>
            </div>

            {raisedHand && (
                <div className="absolute top-1 right-1 bg-yellow-500 p-1 rounded-full shadow animate-bounce border border-white">
                    <Hand size={10} className="text-white" />
                </div>
            )}
        </div>
    );
};

const LocalVideoTile = ({
    user,
    localStream,
    isVideoOff,
    isMuted,
    isScreenSharing,
    isStage = false,
    isPinned = false,
    isSpeaking = false,
    onPin,
    raisedHand
}) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream, isVideoOff, isStage]);

    if (isStage) {
        return (
            <div className={`relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group ${
                isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-emerald-500/30' : isScreenSharing ? 'border-emerald-500' : 'border-slate-700/80'
            }`}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={`w-full h-full object-contain md:object-cover ${isVideoOff ? 'hidden' : ''} ${isScreenSharing ? '' : '-scale-x-100'}`} 
                />
                {isVideoOff && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 gap-3 select-none">
                        <div className="relative">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-800 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-slate-400 border-4 border-slate-700 shadow-2xl">
                                {user?.first_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xs">
                                {isMuted ? '🔇' : '🎙️'}
                            </span>
                        </div>
                        <span className="text-base font-bold text-white font-display">{user?.first_name || 'You'} (Me)</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            Camera Off
                        </span>
                    </div>
                )}

                {/* Speaking Live Indicator Badge */}
                {isSpeaking && (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-emerald-400 backdrop-blur-md animate-pulse z-10">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Speaking (You)</span>
                    </div>
                )}

                {isScreenSharing && (
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg z-10">
                        <span>🖥️ Sharing Screen</span>
                    </div>
                )}

                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2 shadow-xl z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{user?.first_name || 'You'} (Me)</span>
                    {isMuted && <MicOff size={12} className="text-red-400" />}
                    {isPinned && <span className="text-[9px] text-indigo-400 font-bold ml-1 bg-indigo-500/20 px-1.5 py-0.5 rounded">Pinned</span>}
                </div>

                {onPin && (
                    <button
                        onClick={onPin}
                        className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-lg flex items-center gap-1.5 z-10"
                        title={isPinned ? 'Unpin' : 'Pin to stage'}
                    >
                        <span>📌</span>
                        <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                    </button>
                )}

                {raisedHand && (
                    <div className="absolute top-3 right-16 bg-yellow-500 p-2 rounded-full shadow-lg animate-bounce border-2 border-white z-10">
                        <Hand size={16} className="text-white" />
                    </div>
                )}
            </div>
        );
    }

    // Small Thumbnail (Filmstrip mode)
    return (
        <div 
            onClick={onPin}
            className={`relative bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 group cursor-pointer w-28 sm:w-36 h-20 sm:h-24 flex-shrink-0 ${
                isSpeaking 
                    ? 'ring-2 sm:ring-4 ring-emerald-400 border-emerald-400 shadow-md shadow-emerald-500/40' 
                    : isPinned 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40' 
                        : 'border-slate-700/80 hover:border-emerald-400'
            }`}
            title="Click to spotlight self"
        >
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''} ${isScreenSharing ? '' : '-scale-x-100'}`} 
            />
            {isVideoOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-1 select-none">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs border border-slate-700">
                        {user?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">Camera Off</span>
                </div>
            )}
            <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase truncate max-w-[80px] border border-white/10 flex items-center gap-1">
                <span>You</span>
                {isMuted && <MicOff size={8} className="text-red-400" />}
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md shadow">
                    📌 Spotlight
                </span>
            </div>
            {raisedHand && (
                <div className="absolute top-1 right-1 bg-yellow-500 p-1 rounded-full shadow animate-bounce border border-white">
                    <Hand size={10} className="text-white" />
                </div>
            )}
        </div>
    );
};

const WebRTCVideoChat = ({ roomId, isVideoOpen: _isVideoOpen, setIsVideoOpen, layoutMode: _layoutMode = 'classroom' }) => {
    // isCallEnded = user explicitly clicked Leave; distinct from panel being hidden
    const [isCallEnded, setIsCallEnded] = useState(false);
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
    const [mediaNotice, setMediaNotice] = useState(null);

    // Active Speaker & Zoom Video states
    const [speakingLevels, setSpeakingLevels] = useState({});
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [pinnedPeerId, setPinnedPeerId] = useState(null);
    const [zoomViewMode, setZoomViewMode] = useState('speaker'); // 'speaker' | 'gallery'

    const audioContextRef = useRef(null);
    const audioNodesRef = useRef({});
    const lastSpeakerSwitchRef = useRef(0);
    
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({});
    const iceCandidateQueue = useRef({});
    const chatEndRef = useRef(null);
    const chatPanelRef = useRef(null);
    // Ref to hold sendMessage so it can be called from stable callbacks without stale closures
    const sendMessageRef = useRef(null);
    // Queue for signals that arrive before localStream is ready
    const pendingSignals = useRef([]);
    // Ref so peer-discovery interval can read latest myId/myName without re-creating
    const myIdRef = useRef(null);
    const myNameRef = useRef(null);
    // Per-peer video element refs so we can imperatively re-attach streams
    const remoteVideoRefs = useRef({});
    
    // Stable user id and name — use a per-tab session instanceId so testing with the same account across 2 tabs connects seamlessly
    const [instanceId] = useState(() => Math.random().toString(36).substring(2, 9));
    const myId = user?.id ? `${user.id}_${instanceId}` : `anon_${roomId}_${instanceId}`;
    const myName = user?.first_name || (user?.email ? user.email.split('@')[0] : 'Participant');
    // Keep refs in sync
    myIdRef.current = myId;
    myNameRef.current = myName;

    // WebSocket URL for signaling — include JWT token for auth
    const socketUrl = React.useMemo(() => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend1.onrender.com';
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
        const finalUrl = `${cleanBase}/ws/signaling/${roomId}/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        console.log("📡 Connecting to Signaling:", finalUrl);
        return finalUrl;
    }, [roomId]);

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 30,
        reconnectInterval: 2500,
        heartbeat: {
            message: JSON.stringify({ type: 'ping' }),
            interval: 15000,
            timeout: 60000,
        },
        onOpen: () => {
            console.log("✅ Signaling WebSocket Connected to:", socketUrl);
        },
        onClose: () => console.log("❌ Signaling WebSocket Disconnected"),
        onError: (err) => console.error("⚠️ Signaling WebSocket Error:", err),
    });

    // Keep sendMessage accessible from stable refs / callbacks
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // Auto-unlock audio on first user interaction in case browser autoplay blocks sound
    useEffect(() => {
        const unlockAudio = () => {
            document.querySelectorAll('audio').forEach(el => {
                el.play().catch(() => {});
            });
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    // Keep local video element synced whenever localStream changes
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Initialize Local Media once on mount — NOT gated by isVideoOpen.
    // The component is always mounted so audio/video must start immediately.
    useEffect(() => {
        let isMounted = true;
        
        const initMedia = async () => {
            let stream = null;

            // Direct dual media request: ensures browser prompts for both Camera and Mic
            try {
                console.log("🎥 Initializing Local Media (Audio + Video)...");
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
            } catch (idealErr) {
                console.warn("⚠️ Ideal media request unavailable (" + idealErr.name + "), trying unconstrained dual media...");
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch (dualErr) {
                    console.warn("⚠️ Dual media request failed (" + dualErr.name + "), falling back to individual devices...");
                    
                    // Fallback 1: Audio only
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        if (isMounted) {
                            setIsVideoOff(true);
                            setMediaNotice(
                                dualErr.name === 'NotFoundError'
                                    ? "No camera detected on this device. Joined with microphone only."
                                    : "Camera access unavailable (" + dualErr.name + "). Joined with microphone only."
                            );
                        }
                    } catch (audioErr) {
                        console.warn("⚠️ Audio-only request failed:", audioErr.name);
                        
                        // Fallback 2: Video only
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                            if (isMounted) {
                                setIsMuted(true);
                                setMediaNotice("No microphone detected. Joined with camera only.");
                            }
                        } catch (videoErr) {
                            console.warn("⚠️ Video-only request failed:", videoErr.name);
                        }
                    }
                }
            }

            // Fallback 3: Neither available -> listen/chat mode
            if (!stream) {
                console.warn("⚠️ No camera/mic accessible. Joined in listen/chat mode.");
                stream = new MediaStream();
                if (isMounted) {
                    setIsVideoOff(true);
                    setIsMuted(true);
                    setMediaNotice("No camera or microphone detected. You can still watch, listen, and participate in chat.");
                }
            }

            if (isMounted && stream) {
                localStreamRef.current = stream;
                setLocalStream(stream);
            }
        };

        initMedia();

        return () => {
            isMounted = false;
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            iceCandidateQueue.current = {};
            setRemoteStreams({});
        };
    }, []); // Run once on mount — component is always mounted

    // Real-Time Audio Activity Monitor for Active Speaker Detection (Zoom behaviour)
    useEffect(() => {
        let timerId;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const allSources = {
            ...remoteStreams,
            ...(localStream ? { local: { stream: localStream } } : {})
        };

        // Disconnect nodes that are no longer active
        Object.keys(audioNodesRef.current).forEach(id => {
            if (!allSources[id]?.stream) {
                try {
                    audioNodesRef.current[id].source?.disconnect();
                } catch (_e) {
                    /* ignore disconnect error */
                }
                delete audioNodesRef.current[id];
            }
        });

        // Add new nodes
        Object.entries(allSources).forEach(([id, data]) => {
            const stream = data?.stream;
            if (stream && stream.getAudioTracks().length > 0 && !audioNodesRef.current[id]) {
                try {
                    const source = ctx.createMediaStreamSource(stream);
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 128;
                    analyser.smoothingTimeConstant = 0.4;
                    source.connect(analyser);
                    audioNodesRef.current[id] = { source, analyser };
                } catch (e) {
                    console.warn("Audio analyser connect failed for", id, e);
                }
            }
        });

        const sampleAudio = () => {
            const levels = {};
            let maxVol = 0;
            let loudestId = null;
            const buffer = new Uint8Array(64);

            Object.entries(audioNodesRef.current).forEach(([id, node]) => {
                try {
                    node.analyser.getByteFrequencyData(buffer);
                    let sum = 0;
                    for (let i = 0; i < buffer.length; i++) sum += buffer[i];
                    const avg = sum / buffer.length;
                    levels[id] = avg;

                    // Speech threshold
                    if (avg > 14 && avg > maxVol) {
                        maxVol = avg;
                        loudestId = id;
                    }
                } catch (_e) {
                    /* ignore sample error */
                }
            });

            setSpeakingLevels(levels);

            const now = Date.now();
            if (loudestId && loudestId !== activeSpeakerId) {
                // Minimum dwell time of 750ms so switching is smooth and natural
                if (now - lastSpeakerSwitchRef.current > 750) {
                    setActiveSpeakerId(loudestId);
                    lastSpeakerSwitchRef.current = now;
                }
            }

            timerId = setTimeout(sampleAudio, 150);
        };

        sampleAudio();

        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [remoteStreams, localStream, activeSpeakerId]);

    // Heartbeat & Peer discovery: announce presence when stream is ready, and retry until remote peer is found
    useEffect(() => {
        if (readyState !== ReadyState.OPEN || !localStream) return;

        // Send initial join — use ref so interval closure is always stable
        const joinMsg = () => JSON.stringify({ type: 'peer_join', peerId: myIdRef.current, name: myNameRef.current });
        sendMessageRef.current?.(joinMsg());

        // Flush any signals that arrived before localStream was ready
        if (pendingSignals.current.length > 0) {
            console.log(`🔁 Replaying ${pendingSignals.current.length} queued signal(s)`);
            // We trigger a synthetic lastMessage re-process by dispatching queued signals
            // The cleanest approach: process them via the same handler path
            const queued = [...pendingSignals.current];
            pendingSignals.current = [];
            queued.forEach(signal => processSignal(signal));
        }

        // Repeat presence every 10 seconds if no peers connected yet so late arrivals connect automatically
        const interval = setInterval(() => {
            if (Object.keys(peerConnections.current).length === 0) {
                sendMessageRef.current?.(joinMsg());
            }
        }, 10000);

        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readyState, localStream]);

    // ── Core signaling logic (extracted so it can be called from the pending-queue replayer)
    const processSignal = useCallback(async (data) => {
        const { type, peerId, name, sdp, candidate, message } = data;

        // Ignore our own messages
        if (String(peerId) === String(myIdRef.current)) return;
        if (type === 'pong' || type === 'ping') return;

        // If local media is not yet ready, queue the signal and replay later
        if (!localStreamRef.current) {
            if (type === 'peer_join' || type === 'offer') {
                console.warn(`⏳ Queuing ${type} from ${name || peerId} — localStream not ready yet`);
                pendingSignals.current.push(data);
            }
            return;
        }

        const _myId = myIdRef.current;
        const _myName = myNameRef.current;

        console.log(`📡 Received Signal: ${type} from ${name || peerId}`);

        const addOrQueueIceCandidate = async (id, candidateData) => {
            const pc = peerConnections.current[id];
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidateData));
                } catch (err) {
                    console.warn(`⚠️ Error adding ICE candidate for ${id}:`, err);
                }
            } else {
                if (!iceCandidateQueue.current[id]) iceCandidateQueue.current[id] = [];
                iceCandidateQueue.current[id].push(candidateData);
            }
        };

        const flushIceCandidateQueue = async (id, pc) => {
            const queued = iceCandidateQueue.current[id];
            if (queued && queued.length > 0) {
                console.log(`🧊 Flushing ${queued.length} queued ICE candidates for ${id}`);
                for (const cand of queued) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                    } catch (err) {
                        console.warn(`⚠️ Error adding queued ICE candidate for ${id}:`, err);
                    }
                }
                delete iceCandidateQueue.current[id];
            }
        };

        const getPeerConnection = async (id, peerName) => {
            if (peerConnections.current[id]) return peerConnections.current[id];
            
            console.log(`🧊 Creating PeerConnection for ${peerName} (${id})`);
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelay',
                        credential: 'openrelay'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelay',
                        credential: 'openrelay'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelay',
                        credential: 'openrelay'
                    }
                ]
            });
            
            const activeStream = localStreamRef.current;
            const hasAudio = activeStream && activeStream.getAudioTracks().length > 0;
            const hasVideo = activeStream && activeStream.getVideoTracks().length > 0;

            if (activeStream && activeStream.getTracks().length > 0) {
                activeStream.getTracks().forEach(track => {
                    pc.addTrack(track, activeStream);
                });
            }

            // If user has no camera or microphone, add recvonly transceivers
            // so SDP offer/answer includes media lines to receive remote audio and video
            if (!hasAudio) {
                try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch (_e) { /* no-op */ }
            }
            if (!hasVideo) {
                try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch (_e) { /* no-op */ }
            }
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendMessageRef.current?.(JSON.stringify({ type: 'ice_candidate', peerId: _myId, targetId: id, candidate: event.candidate }));
                }
            };
            
            pc.ontrack = (event) => {
                console.log(`🎬 Received Track from ${peerName}:`, event.track.kind, 'readyState:', event.track.readyState);
                
                const triggerUpdate = () => {
                    setRemoteStreams(prev => {
                        if (!prev[id]) return prev;
                        return {
                            ...prev,
                            [id]: {
                                ...prev[id],
                                _v: (prev[id]._v || 0) + 1
                            }
                        };
                    });
                };

                event.track.onmute   = triggerUpdate;
                event.track.onunmute = triggerUpdate;
                event.track.onended  = triggerUpdate;

                setRemoteStreams(prev => {
                    const prevEntry = prev[id];
                    let stream = prevEntry?.stream;

                    if (!stream) {
                        stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream();
                    }

                    if (!stream.getTracks().some(t => t.id === event.track.id)) {
                        stream.addTrack(event.track);
                    }

                    return {
                        ...prev,
                        [id]: {
                            stream,
                            name: peerName || prevEntry?.name || 'Participant',
                            _v: (prevEntry?._v || 0) + 1
                        }
                    };
                });
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`📡 Peer connection state for ${peerName}: ${pc.connectionState}`);
                if (pc.connectionState === 'connected') {
                    console.log(`🎉 Peer connection ESTABLISHED with ${peerName}`);
                } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                    setRemoteStreams(prev => { const s = { ...prev }; delete s[id]; return s; });
                    pc.close();
                    delete peerConnections.current[id];
                    delete iceCandidateQueue.current[id];
                    delete remoteVideoRefs.current[id];
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`🧊 ICE State for ${peerName}: ${pc.iceConnectionState}`);
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                    setRemoteStreams(prev => { const s = { ...prev }; delete s[id]; return s; });
                    pc.close();
                    delete peerConnections.current[id];
                    delete iceCandidateQueue.current[id];
                    delete remoteVideoRefs.current[id];
                }
            };

            peerConnections.current[id] = pc;
            return pc;
        };

        const isPolite = String(_myId) > String(peerId);

        if (type === 'peer_join') {
            const pc = await getPeerConnection(peerId, name);
            // Only create an offer if the connection is in a state that allows it
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'closed') {
                console.warn(`⚠️ Skipping offer — signalingState is ${pc.signalingState}`);
                return;
            }
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMessageRef.current?.(JSON.stringify({ 
                type: 'offer', 
                peerId: _myId, 
                targetId: peerId, 
                name: _myName, 
                sdp: pc.localDescription 
            }));
        } 
        else if (type === 'offer' && String(data.targetId) === String(_myId)) {
            const pc = await getPeerConnection(peerId, name);
            
            // Perfect-negotiation: polite peer rolls back on collision
            if (pc.signalingState !== 'stable') {
                if (!isPolite) {
                    console.warn(`⚠️ Impolite peer ignoring offer from ${name}`);
                    return;
                }
                console.log(`🤝 Polite peer rolling back to accept offer from ${name}`);
                await pc.setLocalDescription({ type: 'rollback' });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushIceCandidateQueue(peerId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendMessageRef.current?.(JSON.stringify({ 
                type: 'answer', 
                peerId: _myId, 
                targetId: peerId, 
                name: _myName,
                sdp: pc.localDescription 
            }));
        } 
        else if (type === 'answer' && String(data.targetId) === String(_myId)) {
            const pc = peerConnections.current[peerId];
            if (pc) {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    await flushIceCandidateQueue(peerId, pc);
                } else {
                    console.warn(`⚠️ Ignoring answer from ${peerId} — signalingState is ${pc.signalingState}`);
                }
            }
        } 
        else if (type === 'ice_candidate' && String(data.targetId) === String(_myId)) {
            await addOrQueueIceCandidate(peerId, candidate);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle Signaling Messages
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data);
            processSignal(data);
        } catch (e) {
            console.error("Signaling parse error", e);
        }
    }, [lastMessage, processSignal]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    // Close chat on outside click
    useEffect(() => {
        if (!showChat) return;
        const handleClickOutside = (e) => {
            if (chatPanelRef.current && !chatPanelRef.current.contains(e.target)) {
                setShowChat(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showChat]);

    // Media Controls with on-demand hardware activation
    const toggleMute = async () => {
        const stream = localStreamRef.current || localStream;
        const audioTracks = stream ? stream.getAudioTracks() : [];

        if (audioTracks.length > 0) {
            const nextState = !audioTracks[0].enabled;
            audioTracks.forEach(track => { track.enabled = nextState; });
            setIsMuted(!nextState);
        } else {
            // No audio track initially — try activating microphone now
            try {
                console.log("🎙️ Activating microphone on user request...");
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newTrack = micStream.getAudioTracks()[0];
                if (!newTrack) return;

                const activeStream = localStreamRef.current || new MediaStream();
                activeStream.addTrack(newTrack);
                localStreamRef.current = activeStream;
                setLocalStream(activeStream);
                setIsMuted(false);
                setMediaNotice(null);

                Object.entries(peerConnections.current).forEach(([pId, pc]) => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (sender) {
                        sender.replaceTrack(newTrack);
                    } else {
                        pc.addTrack(newTrack, activeStream);
                        pc.createOffer().then(offer => {
                            pc.setLocalDescription(offer);
                            sendMessageRef.current?.(JSON.stringify({
                                type: 'offer',
                                peerId: myIdRef.current,
                                targetId: pId,
                                name: myNameRef.current,
                                sdp: pc.localDescription
                            }));
                        }).catch(e => console.warn("Renegotiation failed:", e));
                    }
                });
            } catch (err) {
                console.warn("⚠️ Could not activate microphone:", err);
                setMediaNotice(err.name === 'NotFoundError'
                    ? "No microphone found. Please connect an audio input device."
                    : "Microphone access failed (" + err.name + ")."
                );
            }
        }
    };

    const toggleVideo = async () => {
        const stream = localStreamRef.current || localStream;
        const videoTracks = stream ? stream.getVideoTracks() : [];

        if (videoTracks.length > 0) {
            const nextState = !videoTracks[0].enabled;
            videoTracks.forEach(track => { track.enabled = nextState; });
            setIsVideoOff(!nextState);
        } else {
            // No video track initially — try activating camera now
            try {
                console.log("🎥 Activating camera on user request...");
                const camStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
                }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));

                const newTrack = camStream.getVideoTracks()[0];
                if (!newTrack) return;

                const activeStream = localStreamRef.current || new MediaStream();
                activeStream.addTrack(newTrack);
                localStreamRef.current = activeStream;
                setLocalStream(activeStream);
                setIsVideoOff(false);
                setMediaNotice(null);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = activeStream;
                }

                // Add or replace video track in all active peer connections
                Object.entries(peerConnections.current).forEach(([pId, pc]) => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(newTrack);
                    } else {
                        pc.addTrack(newTrack, activeStream);
                        pc.createOffer().then(offer => {
                            pc.setLocalDescription(offer);
                            sendMessageRef.current?.(JSON.stringify({
                                type: 'offer',
                                peerId: myIdRef.current,
                                targetId: pId,
                                name: myNameRef.current,
                                sdp: pc.localDescription
                            }));
                        }).catch(e => console.warn("Renegotiation failed:", e));
                    }
                });
            } catch (err) {
                console.warn("⚠️ Could not activate camera:", err);
                setMediaNotice(err.name === 'NotFoundError' 
                    ? "No camera found on this device. Connect a webcam and try again." 
                    : "Camera access failed (" + err.name + "). Check permissions or close other apps using the camera."
                );
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                if (!screenTrack) return;
                
                screenTrack.onended = () => {
                    stopScreenShare();
                };

                // Replace video track for all peers
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });
                
                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
                setIsScreenSharing(true);
            } catch (err) {
                // User cancelling the screen-share prompt triggers NotAllowedError
                if (err.name !== 'NotAllowedError') {
                    console.error("Screen sharing error:", err);
                }
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        const stream = localStreamRef.current || localStream;
        const videoTrack = stream ? stream.getVideoTracks()[0] : null;
        Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack || null);
        });
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(false);
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        const val = e.target.chatInput.value.trim();
        if (!val) return;
        sendMessage(JSON.stringify({ type: 'chat', peerId: myId, name: myName, message: val }));
        setMessages(prev => [...prev, { name: 'You', text: val, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
        e.target.reset();
    };

    const handleRaiseHand = () => {
        sendMessage(JSON.stringify({ type: 'raise_hand', peerId: myId }));
        setRaisedHands(prev => ({ ...prev, [myId]: true }));
        setTimeout(() => {
            setRaisedHands(prev => { const next = {...prev}; delete next[myId]; return next; });
        }, 5000);
    };

    // Call-ended screen — shown when user clicks "Leave"
    const handleLeaveCall = () => {
        // Stop all local media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        // Close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        setRemoteStreams({});
        setLocalStream(null);
        setIsCallEnded(true);
        // Notify parent (e.g. switch mobile view back to whiteboard)
        setIsVideoOpen(false);
    };

    if (isCallEnded) {
        return (
            <div className="flex flex-col h-full bg-[#0f172a] items-center justify-center gap-6 text-white">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/30">
                    <PhoneOff size={32} className="text-red-400" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold uppercase tracking-widest mb-1">You left the call</h3>
                    <p className="text-slate-500 text-xs uppercase tracking-wide">The whiteboard session is still active</p>
                </div>
                <button
                    onClick={() => { setIsCallEnded(false); setIsVideoOpen(true); }}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                    Rejoin Call
                </button>
            </div>
        );
    }

    // NOTE: We no longer do `if (!isVideoOpen) return null` — the component
    // stays mounted at all times so the WebRTC connection & audio stay live
    // when the user switches to the whiteboard (like WhatsApp / Zoom).

    const remoteKeys = Object.keys(remoteStreams);
    const totalParticipants = 1 + remoteKeys.length;

    // Zoom Active Speaker determination:
    // Pinned user takes precedence, then active speaker, then first remote user, then local user
    const effectiveStageId = pinnedPeerId 
        || (activeSpeakerId && (activeSpeakerId === 'local' || remoteStreams[activeSpeakerId]) ? activeSpeakerId : null)
        || (remoteKeys.length > 0 ? remoteKeys[0] : 'local');

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white overflow-hidden">
            
            {/* Top Toolbar: View switcher (Speaker / Gallery) & Participant info */}
            <div className="flex-shrink-0 h-10 px-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 z-20">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>👥</span>
                        <span>{totalParticipants}</span>
                    </span>

                    {pinnedPeerId && (
                        <div className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-lg text-[9px] font-bold truncate">
                            <span>📌 Pinned</span>
                            <button 
                                onClick={() => setPinnedPeerId(null)}
                                className="text-white hover:text-red-400 ml-1 font-bold text-xs"
                                title="Unpin (Return to active speaker)"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* View Mode Toggle: Speaker View vs Gallery View */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoomViewMode(m => m === 'speaker' ? 'gallery' : 'speaker')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            zoomViewMode === 'speaker'
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                        }`}
                        title="Toggle Zoom Speaker / Gallery View"
                    >
                        {zoomViewMode === 'speaker' ? '👤 Speaker View' : '🔲 Gallery View'}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col relative min-h-0">
                {mediaNotice && (
                    <div className="mb-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2 shadow-sm flex-shrink-0">
                        <span className="flex-1 text-[11px]">{mediaNotice}</span>
                        <button 
                            type="button"
                            onClick={() => setMediaNotice(null)} 
                            className="text-amber-400 hover:text-white text-xs px-1 font-bold"
                            title="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── ZOOM SPEAKER VIEW: Active Speaker is full screen, the rest are in a small filmstrip ── */}
                {zoomViewMode === 'speaker' ? (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-2">
                        {/* Filmstrip: Small screen thumbnails for all other participants */}
                        {totalParticipants > 1 && (
                            <div className="flex-shrink-0 h-22 sm:h-26 flex items-center gap-2 overflow-x-auto custom-scrollbar px-1 py-1 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                                {/* Local user thumbnail if not on stage */}
                                {effectiveStageId !== 'local' && (
                                    <LocalVideoTile
                                        user={user}
                                        localStream={localStream}
                                        isVideoOff={isVideoOff}
                                        isMuted={isMuted}
                                        isScreenSharing={isScreenSharing}
                                        isStage={false}
                                        isPinned={pinnedPeerId === 'local'}
                                        isSpeaking={speakingLevels['local'] > 14}
                                        onPin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                                        raisedHand={user?.id && raisedHands[user.id]}
                                    />
                                )}

                                {/* Remote users thumbnails if not on stage */}
                                {Object.entries(remoteStreams).map(([id, data]) => {
                                    if (id === effectiveStageId) return null;
                                    return (
                                        <RemoteVideoTile
                                            key={id}
                                            id={id}
                                            data={data}
                                            isStage={false}
                                            isPinned={pinnedPeerId === id}
                                            isSpeaking={speakingLevels[id] > 14}
                                            onPin={() => setPinnedPeerId(pinnedPeerId === id ? null : id)}
                                            raisedHand={raisedHands[id]}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Full Screen Stage for Active Speaker */}
                        <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800">
                            {effectiveStageId === 'local' ? (
                                <LocalVideoTile
                                    user={user}
                                    localStream={localStream}
                                    isVideoOff={isVideoOff}
                                    isMuted={isMuted}
                                    isScreenSharing={isScreenSharing}
                                    isStage={true}
                                    isPinned={pinnedPeerId === 'local'}
                                    isSpeaking={speakingLevels['local'] > 14}
                                    onPin={() => setPinnedPeerId(null)}
                                    raisedHand={user?.id && raisedHands[user.id]}
                                />
                            ) : (
                                <RemoteVideoTile
                                    key={effectiveStageId}
                                    id={effectiveStageId}
                                    data={remoteStreams[effectiveStageId]}
                                    isStage={true}
                                    isPinned={pinnedPeerId === effectiveStageId}
                                    isSpeaking={speakingLevels[effectiveStageId] > 14}
                                    onPin={() => setPinnedPeerId(null)}
                                    raisedHand={raisedHands[effectiveStageId]}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── GALLERY GRID VIEW: Equal size grid ── */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            <LocalVideoTile
                                user={user}
                                localStream={localStream}
                                isVideoOff={isVideoOff}
                                isMuted={isMuted}
                                isScreenSharing={isScreenSharing}
                                isStage={false}
                                isPinned={pinnedPeerId === 'local'}
                                isSpeaking={speakingLevels['local'] > 14}
                                onPin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                                raisedHand={user?.id && raisedHands[user.id]}
                            />
                            {Object.entries(remoteStreams).map(([id, data]) => (
                                <RemoteVideoTile
                                    key={id}
                                    id={id}
                                    data={data}
                                    isStage={false}
                                    isPinned={pinnedPeerId === id}
                                    isSpeaking={speakingLevels[id] > 14}
                                    onPin={() => setPinnedPeerId(pinnedPeerId === id ? null : id)}
                                    raisedHand={raisedHands[id]}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Drawer Overlay */}
            {showChat && (
                <div ref={chatPanelRef} className="absolute bottom-24 right-6 left-6 md:left-auto md:w-96 h-[500px] max-h-[70vh] bg-slate-900 border border-slate-700 rounded-card shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col z-[100] animate-in slide-in-from-bottom-10">
                    <div className="flex justify-between items-center p-5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-emerald-500" />
                            <h4 className="font-bold text-xs uppercase tracking-widest">Class Chat</h4>
                        </div>
                        <button onClick={() => setShowChat(false)} aria-label="Close chat" className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X size={16} /></button>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.name === 'You' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-tighter mb-1">{msg.name} • {msg.time}</span>
                                <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${msg.name === 'You' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-900/50 rounded-b-[2rem]">
                        <input name="chatInput" type="text" placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                        <button type="submit" aria-label="Send message" className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Premium Controls Bar */}
            <div className="p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <button 
                    onClick={toggleMute} 
                    className={`group w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    <span className="text-[7px] font-bold mt-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Mute</span>
                </button>

                <button 
                    onClick={toggleVideo} 
                    className={`group w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title={isVideoOff ? 'Start Video' : 'Stop Video'}
                >
                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                    <span className="text-[7px] font-bold mt-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Video</span>
                </button>

                <button 
                    onClick={toggleScreenShare} 
                    className={`group w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${isScreenSharing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title="Share Screen"
                >
                    <MonitorUp size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Share</span>
                </button>

                <div className="w-px h-8 bg-slate-800" />

                <button 
                    onClick={handleRaiseHand} 
                    className="group w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-90"
                    title="Raise Hand"
                >
                    <Hand size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Hand</span>
                </button>

                <button 
                    onClick={() => setShowChat(!showChat)} 
                    className={`group w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${showChat ? 'bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    title="Chat"
                >
                    <MessageSquare size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-tighter">Chat</span>
                </button>

                <div className="w-px h-8 bg-slate-800" />

                <button 
                    onClick={handleLeaveCall} 
                    className="group w-16 sm:w-24 h-11 sm:h-14 rounded-xl flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all active:scale-90 border border-red-500/20"
                    title="Leave Call"
                >
                    <PhoneOff size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase tracking-widest">LEAVE</span>
                </button>
            </div>
        </div>
    );
};

export default WebRTCVideoChat;
