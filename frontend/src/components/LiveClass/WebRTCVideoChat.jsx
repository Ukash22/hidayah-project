import React, { useEffect, useRef, useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '../../context/AuthContext';
import { getAccess } from '../../services/tokenStore';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Hand, X } from 'lucide-react';

// Persistent background audio for each remote peer — immune to stage/tab/thumbnail switches.
// Playing audio through dedicated persistent elements prevents mobile autoplay blockers and audio cuts.
const PersistentPeerAudio = React.memo(({ id, stream }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !stream) return;

        if (audioEl.srcObject !== stream) {
            audioEl.srcObject = stream;
        }

        // Ensure full volume and unmuted playback
        audioEl.volume = 1.0;
        audioEl.muted = false;

        const tryPlay = () => {
            if (audioEl.paused) {
                audioEl.play().catch(e => console.warn(`Remote audio play prevented for ${id}:`, e));
            }
        };

        tryPlay();

        const handleVisibility = () => {
            if (!document.hidden) tryPlay();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        const handleInteraction = () => tryPlay();
        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [stream, id]);

    return <audio ref={audioRef} autoPlay playsInline />;
});

// Zoom-Grade Remote Video Tile: supports 'stage', 'grid' (Gallery View), and 'filmstrip' (Thumbnail carousel)
const RemoteVideoTile = React.memo(({ id: _id, data, mode = 'stage', isStage = false, isPinned = false, isSpeaking = false, isScreenShare = false, onPin, raisedHand }) => {
    const videoRef = useRef(null);
    const [hasActiveVideo, setHasActiveVideo] = useState(false);

    const effectiveMode = mode === 'grid' ? 'grid' : (isStage || mode === 'stage' ? 'stage' : 'filmstrip');

    useEffect(() => {
        const stream = data?.stream;
        const videoEl = videoRef.current;
        if (!stream || !videoEl) {
            setHasActiveVideo(false);
            return;
        }

        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
        }

        const vTracks = stream.getVideoTracks();
        const hasLive = vTracks.some(t => t.readyState === 'live' && t.enabled);
        setHasActiveVideo(hasLive);

        if (hasLive && videoEl.paused) {
            videoEl.play().catch(() => {});
        }

        const handleEnded = () => {
            const live = stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
            setHasActiveVideo(live);
        };

        vTracks.forEach(t => {
            t.addEventListener('ended', handleEnded);
        });

        const handleVisibility = () => {
            if (!document.hidden && videoEl && videoEl.paused) {
                videoEl.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            vTracks.forEach(t => {
                t.removeEventListener('ended', handleEnded);
            });
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [data?.stream]);

    const isHost = data?.isHost || data?.role === 'TUTOR' || data?.role === 'ADMIN';

    // 1. ZOOM SPEAKER STAGE (Full-Screen Hero)
    if (effectiveMode === 'stage') {
        return (
            <div className={`relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group flex items-center justify-center ${
                isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]' : 'border-slate-800'
            }`}>
                <video 
                    ref={videoRef}
                    autoPlay 
                    muted
                    playsInline 
                    disablePictureInPicture
                    style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                    onPlaying={() => setHasActiveVideo(true)}
                    onLoadedData={() => setHasActiveVideo(true)}
                    className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-contain md:object-cover'} transition-opacity duration-300 ${hasActiveVideo ? 'opacity-100' : 'opacity-0'}`}
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
                            {isScreenShare ? '🖥️ Connecting to Screen Share...' : (isHost ? '★ Host Speaker · Audio Live' : 'Participant · Audio Live')}
                        </span>
                    </div>
                )}

                {/* Top-left Badges (Screen Share, Speaking, Host) */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
                    {isScreenShare && (
                        <div className="bg-purple-600/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-purple-400 backdrop-blur-md animate-pulse">
                            <span>🖥️</span>
                            <span>Screen: {data?.name || 'Participant'}</span>
                        </div>
                    )}

                    {isSpeaking && (
                        <div className="bg-emerald-500/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-emerald-400 backdrop-blur-md animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>Speaking</span>
                        </div>
                    )}

                    {isHost && !isSpeaking && !isScreenShare && (
                        <div className="bg-amber-500/90 text-amber-950 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg border border-amber-400 backdrop-blur-md">
                            <span>👑</span>
                            <span>HOST / TUTOR</span>
                        </div>
                    )}
                </div>

                {/* Bottom Name Pill */}
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2 shadow-xl z-10">
                    <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
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

    // 2. ZOOM GALLERY GRID CARD (True side-by-side or multi-participant Zoom layout)
    if (effectiveMode === 'grid') {
        return (
            <div 
                className={`relative w-full h-full min-h-[170px] sm:min-h-[220px] max-h-[480px] aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group flex items-center justify-center ${
                    isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]' : 'border-slate-800 hover:border-slate-700'
                }`}
            >
                <video 
                    ref={videoRef}
                    autoPlay 
                    muted
                    playsInline 
                    disablePictureInPicture
                    style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                    onPlaying={() => setHasActiveVideo(true)}
                    onLoadedData={() => setHasActiveVideo(true)}
                    className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${hasActiveVideo ? 'opacity-100' : 'opacity-0'}`}
                />

                {!hasActiveVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 gap-2 select-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-emerald-400 border-2 border-emerald-500/40 shadow-xl">
                            {data?.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <span className="text-sm font-bold text-white font-display truncate max-w-[160px]">{data?.name}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            {isHost ? '★ Host' : 'Audio Connected'}
                        </span>
                    </div>
                )}

                {/* Top-left Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                    {isScreenShare && (
                        <div className="bg-purple-600/90 text-white px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md border border-purple-400">
                            <span>🖥️ Screen</span>
                        </div>
                    )}
                    {isHost && !isSpeaking && !isScreenShare && (
                        <div className="bg-amber-500/90 text-amber-950 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                            <span>👑 Host</span>
                        </div>
                    )}
                    {isSpeaking && (
                        <div className="bg-emerald-500/90 text-white px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>Speaking</span>
                        </div>
                    )}
                </div>

                {/* Bottom-left Zoom Name Tag with Mic indicator */}
                <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white border border-white/10 flex items-center gap-1.5 shadow-lg z-10">
                    <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">{data?.name || 'Participant'}</span>
                    {isPinned && <span className="text-[8px] text-indigo-400 font-bold ml-1 bg-indigo-500/20 px-1 py-0.2 rounded">Pinned</span>}
                </div>

                {/* Spotlight / Pin hover action */}
                {onPin && (
                    <button
                        onClick={onPin}
                        className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-md flex items-center gap-1 z-10"
                        title={isPinned ? 'Unpin from stage' : 'Spotlight on stage'}
                    >
                        <span>📌</span>
                        <span>{isPinned ? 'Unpin' : 'Spotlight'}</span>
                    </button>
                )}

                {raisedHand && (
                    <div className="absolute top-2.5 right-12 bg-yellow-500 p-1.5 rounded-full shadow-lg animate-bounce border border-white z-10">
                        <Hand size={14} className="text-white" />
                    </div>
                )}
            </div>
        );
    }

    // 3. ZOOM FILMSTRIP THUMBNAIL (Speaker View Carousel)
    return (
        <div 
            onClick={onPin}
            className={`relative bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 group cursor-pointer w-24 sm:w-32 h-16 sm:h-20 flex-shrink-0 ${
                isSpeaking 
                    ? 'ring-2 sm:ring-4 ring-emerald-400 border-emerald-400 shadow-md shadow-emerald-500/40' 
                    : isPinned 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40' 
                        : 'border-slate-700/80 hover:border-emerald-400'
            }`}
            title="Click to spotlight on big screen"
        >
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
});

// Zoom-Grade Local Video Tile: supports 'stage', 'grid' (Gallery View), and 'filmstrip' (Thumbnail carousel)
const LocalVideoTile = React.memo(({
    user,
    localStream,
    isVideoOff,
    isMuted,
    isScreenSharing,
    mode = 'stage',
    isStage = false,
    isPinned = false,
    isSpeaking = false,
    onPin,
    raisedHand
}) => {
    const videoRef = useRef(null);

    const effectiveMode = mode === 'grid' ? 'grid' : (isStage || mode === 'stage' ? 'stage' : 'filmstrip');

    useEffect(() => {
        if (videoRef.current && localStream && videoRef.current.srcObject !== localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // 1. ZOOM SPEAKER STAGE (Self as full hero)
    if (effectiveMode === 'stage') {
        return (
            <div className={`relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group ${
                isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]' : isScreenSharing ? 'border-emerald-500' : 'border-slate-800'
            }`}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    disablePictureInPicture
                    style={{ transform: isScreenSharing ? 'translateZ(0)' : 'translateZ(0) scaleX(-1)', willChange: 'transform' }}
                    className={`w-full h-full object-contain md:object-cover ${isVideoOff ? 'hidden' : ''}`} 
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
                    <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
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

    // 2. ZOOM GALLERY GRID CARD (True side-by-side or multi-participant Zoom layout)
    if (effectiveMode === 'grid') {
        return (
            <div 
                className={`relative w-full h-full min-h-[170px] sm:min-h-[220px] max-h-[480px] aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 group flex items-center justify-center ${
                    isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]' : isScreenSharing ? 'border-emerald-500' : 'border-slate-800 hover:border-slate-700'
                }`}
            >
                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    disablePictureInPicture
                    style={{ transform: isScreenSharing ? 'translateZ(0)' : 'translateZ(0) scaleX(-1)', willChange: 'transform' }}
                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} 
                />
                {isVideoOff && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 gap-2 select-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-slate-400 border-2 border-slate-700 shadow-xl">
                            {user?.first_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-bold text-white font-display">{user?.first_name || 'You'} (Me)</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            Camera Off
                        </span>
                    </div>
                )}

                {/* Top-left screen share badge */}
                {isScreenSharing && (
                    <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
                        <span>🖥️ Sharing Screen</span>
                    </div>
                )}

                {/* Bottom-left Zoom Name Tag with Mic indicator */}
                <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white border border-white/10 flex items-center gap-1.5 shadow-lg z-10">
                    {isSpeaking ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ) : isMuted ? (
                        <MicOff size={11} className="text-red-400" />
                    ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    )}
                    <span>{user?.first_name || 'You'} (Me)</span>
                    {isPinned && <span className="text-[8px] text-indigo-400 font-bold ml-1 bg-indigo-500/20 px-1 py-0.2 rounded">Pinned</span>}
                </div>

                {/* Spotlight / Pin hover action */}
                {onPin && (
                    <button
                        onClick={onPin}
                        className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-md flex items-center gap-1 z-10"
                        title={isPinned ? 'Unpin' : 'Spotlight on stage'}
                    >
                        <span>📌</span>
                        <span>{isPinned ? 'Unpin' : 'Spotlight'}</span>
                    </button>
                )}

                {raisedHand && (
                    <div className="absolute top-2.5 right-12 bg-yellow-500 p-1.5 rounded-full shadow-lg animate-bounce border border-white z-10">
                        <Hand size={14} className="text-white" />
                    </div>
                )}
            </div>
        );
    }

    // 3. ZOOM FILMSTRIP THUMBNAIL (Speaker View Carousel)
    return (
        <div 
            onClick={onPin}
            className={`relative bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 group cursor-pointer w-24 sm:w-32 h-16 sm:h-20 flex-shrink-0 ${
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
});

// ── Zoom WebRTC Engine Optimizers ──
// 1. Opus SDP Munging:
//    - Enables Opus Forward Error Correction (FEC) so dropped packets don't scratch/crack
//    - Enables Discontinuous Transmission (DTX) so silence doesn't waste bandwidth
//    - Sets 32kbps pristine wideband voice bitrate (Zoom default, prevents packet contention with video)
//    - Enforces mono (stereo=0) to halve audio bandwidth and maximize echo cancellation
// 2. Video Bandwidth Bounding: caps camera video to 900 kbps to guarantee 30fps without network bufferbloat
const optimizeSdp = (sdp) => {
    if (!sdp) return sdp;
    let modified = sdp;

    const opusParams = 'minptime=10;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxaveragebitrate=32000;cbr=0';
    const opusRegex = /a=rtpmap:(\d+)\s+opus\/48000/i;
    const match = modified.match(opusRegex);
    if (match) {
        const pt = match[1];
        const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`, 'i');
        if (fmtpRegex.test(modified)) {
            modified = modified.replace(fmtpRegex, (m, existing) => {
                if (existing.includes('useinbandfec=')) return m;
                return `a=fmtp:${pt} ${existing};${opusParams}`;
            });
        } else {
            modified = modified.replace(
                new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000[^\r\n]*[\r\n]+)`, 'i'),
                `$1a=fmtp:${pt} ${opusParams}\r\n`
            );
        }
    }

    if (modified.includes('m=video') && !modified.includes('b=AS:')) {
        modified = modified.replace(/(m=video[^\r\n]*[\r\n]+)/, '$1b=AS:900\r\nb=TIAS:900000\r\n');
    }

    return modified;
};

// Apply Zoom-grade sender parameters (voice priority on network stack, framerate priority for camera, resolution priority for screen)
const applyVideoSenderParams = (sender, isScreen = false) => {
    try {
        if (!sender || typeof sender.getParameters !== 'function') return;
        const params = sender.getParameters();
        if (!params) return;
        if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
        }
        if (sender.track?.kind === 'audio') {
            // Audio gets highest priority on network stack (Zoom standard: voice never stutters)
            params.encodings[0].networkPriority = 'high';
            params.encodings[0].priority = 'high';
            params.encodings[0].maxBitrate = 32000;
        } else if (sender.track?.kind === 'video') {
            if (isScreen) {
                params.encodings[0].networkPriority = 'high';
                params.encodings[0].priority = 'high';
                params.encodings[0].maxBitrate = 1800000;
                params.encodings[0].maxFramerate = 24;
                params.degradationPreference = 'maintain-resolution';
            } else {
                params.encodings[0].networkPriority = 'medium';
                params.encodings[0].priority = 'medium';
                params.encodings[0].maxBitrate = 850000; // 850 kbps (Zoom standard for 720p 30fps)
                params.encodings[0].maxFramerate = 30;
                params.degradationPreference = 'maintain-framerate'; // Never drop framerate, silky smooth 30fps
            }
        }
        sender.setParameters(params).catch(() => {});
    } catch (_e) {}
};

const WebRTCVideoChat = ({ 
    roomId, 
    isVideoOpen: _isVideoOpen, 
    setIsVideoOpen, 
    layoutMode: _layoutMode = 'classroom',
    onScreenShareStateChange,
    externalToggleScreenShareRef
}) => {
    // isCallEnded = user explicitly clicked Leave; distinct from panel being hidden
    const [isCallEnded, setIsCallEnded] = useState(false);
    const { user } = useAuth();
    
    // Media State
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const remoteStreamsRef = useRef({});
    useEffect(() => { remoteStreamsRef.current = remoteStreams; }, [remoteStreams]);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [remoteScreenSharer, setRemoteScreenSharer] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [raisedHands, setRaisedHands] = useState({});
    const [mediaNotice, setMediaNotice] = useState(null);

    // Active Speaker & Zoom Video states
    const [speakingPeers, setSpeakingPeers] = useState({});
    const speakingPeersRef = useRef({});
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const activeSpeakerIdRef = useRef(null);
    const lastSpokeTimeRef = useRef({});
    const [pinnedPeerId, setPinnedPeerId] = useState(null);
    const [zoomViewMode, setZoomViewMode] = useState('speaker'); // 'speaker' | 'gallery'
    const [canShareScreen, setCanShareScreen] = useState(false);

    useEffect(() => {
        const supported = typeof navigator !== 'undefined' &&
            !!navigator.mediaDevices &&
            typeof navigator.mediaDevices.getDisplayMedia === 'function';
        setCanShareScreen(supported);
    }, []);

    const audioContextRef = useRef(null);
    const audioNodesRef = useRef({});
    const lastSpeakerSwitchRef = useRef(0);
    
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const retryMediaRef = useRef(null); // callback set by initMedia effect for "Retry Camera" button
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

        // Helper: sleep for ms milliseconds
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const initMedia = async (isRetry = false) => {
            let stream = null;

            // Adaptive constraints based on device type to prevent thermal throttling,
            // excessive CPU encoding load, and dropped frames on mobile phones.
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);

            // Use permissive constraints to avoid AbortError on devices/browsers
            // that reject over-specified camera constraints at startup.
            const videoConstraints = isMobileDevice
                ? {
                    width: { ideal: 480, max: 640 },
                    height: { ideal: 360, max: 480 },
                    frameRate: { ideal: 20, max: 24 },
                    facingMode: 'user'
                  }
                : {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 24, max: 30 }
                  };

            // Attempt 1: Dual media with adaptive constraints & 48kHz mono audio (native Opus rate, 0 resampling jitter)
            try {
                console.log("🎥 Initializing Local Media (Audio + Video)...", isMobileDevice ? "(Mobile Profile)" : "(Desktop Profile)", isRetry ? "[RETRY]" : "");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: { 
                        echoCancellation: { ideal: true }, 
                        noiseSuppression: { ideal: true }, 
                        autoGainControl: { ideal: true },
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 1 },
                        googEchoCancellation: { ideal: true },
                        googAutoGainControl: { ideal: true },
                        googNoiseSuppression: { ideal: true },
                        googHighpassFilter: { ideal: true },
                        googTypingNoiseDetection: { ideal: true }
                    }
                });
            } catch (idealErr) {
                console.warn("⚠️ Ideal media request unavailable (" + idealErr.name + ")");

                // For AbortError / NotReadableError the camera may be momentarily busy.
                // Wait 1500ms and retry once before falling back to simpler constraints.
                if ((idealErr.name === 'AbortError' || idealErr.name === 'NotReadableError') && !isRetry) {
                    console.log("🔄 Camera busy — waiting 1500ms then retrying...");
                    if (isMounted) {
                        setMediaNotice("📷 Camera busy — retrying in a moment…");
                    }
                    await sleep(1500);
                    if (!isMounted) return;
                    if (isMounted) setMediaNotice(null);
                    return initMedia(true); // retry once
                }

                // Attempt 2: Completely unconstrained (let browser pick anything)
                console.warn("⚠️ Trying unconstrained dual media...");
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch (dualErr) {
                    console.warn("⚠️ Dual media request failed (" + dualErr.name + "), falling back to individual devices...");

                    // Show specific message for NotReadableError (camera in use by another app)
                    if (dualErr.name === 'NotReadableError' && isMounted) {
                        setMediaNotice("⚠️ Camera is in use by another app (e.g. Teams, Zoom, Skype). Please close that app, then tap Retry Camera below.");
                    }

                    // Fallback 1: Audio only
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        if (isMounted) {
                            setIsVideoOff(true);
                            if (dualErr.name !== 'NotReadableError') {
                                setMediaNotice(
                                    dualErr.name === 'NotFoundError'
                                        ? "No camera detected. Joined with microphone only."
                                        : "Camera unavailable (" + dualErr.name + "). Joined with microphone only. Tap Retry Camera if your camera is free."
                                );
                            }
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

            // Last resort: listen/chat-only mode
            if (!stream) {
                console.warn("⚠️ No camera/mic accessible. Joined in listen/chat mode.");
                stream = new MediaStream();
                if (isMounted) {
                    setIsVideoOff(true);
                    setIsMuted(true);
                    setMediaNotice("No camera or microphone accessible. You can still watch, listen, and chat. Tap Retry Camera to try again.");
                }
            }

            if (isMounted && stream) {
                localStreamRef.current = stream;
                setLocalStream(stream);
            }
        };

        initMedia();

        // Expose retry so the UI "Retry Camera" button can call it
        retryMediaRef.current = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            setLocalStream(null);
            setMediaNotice(null);
            setIsVideoOff(false);
            setIsMuted(false);
            setTimeout(() => initMedia(), 300);
        };

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

    // Real-Time Active Speaker Detection (Zoom-Grade with Hysteresis & Hangover):
    // 1. Remote peers: reads RFC 6464 RTP audio levels directly from RTCRtpReceiver (0 CPU, 0 audio distortion).
    // 2. Local user: uses a persistent single AudioContext and AnalyserNode (never re-creates on speaker switch).
    // 3. Speech Hangover (1.2s): prevents border flickering and re-render churn during natural speech pauses.
    // 4. Stable AudioContext lifecycle: NEVER destroyed or re-created on speaker changes!
    useEffect(() => {
        let timerId;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        const setupLocalAnalyser = () => {
            if (!AudioCtx || !localStreamRef.current) return null;
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            if (!aTrack || aTrack.readyState !== 'live') return null;

            try {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new AudioCtx();
                }
                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }
                if (!audioNodesRef.current.source || audioNodesRef.current.stream !== localStreamRef.current) {
                    if (audioNodesRef.current.source) {
                        try { audioNodesRef.current.source.disconnect(); } catch (_e) {}
                    }
                    const source = ctx.createMediaStreamSource(localStreamRef.current);
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 64;
                    analyser.smoothingTimeConstant = 0.4;
                    source.connect(analyser);
                    audioNodesRef.current = { source, analyser, stream: localStreamRef.current };
                }
                return audioNodesRef.current.analyser;
            } catch (_e) {
                return null;
            }
        };

        const buffer = new Uint8Array(32);

        const sampleAudio = () => {
            const now = Date.now();
            let maxVol = 0;
            let currentLoudest = null;

            // 1. Check local microphone volume if not muted
            if (!isMuted) {
                const analyser = setupLocalAnalyser();
                if (analyser) {
                    try {
                        analyser.getByteFrequencyData(buffer);
                        let sum = 0;
                        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
                        const avg = sum / buffer.length;
                        if (avg > 14) {
                            lastSpokeTimeRef.current['local'] = now;
                            maxVol = avg;
                            currentLoudest = 'local';
                        }
                    } catch (_e) {}
                }
            }

            // 2. Check remote peers via native WebRTC RFC 6464 audio levels (hardware accelerated, 0 CPU, 0 distortion)
            Object.entries(peerConnections.current).forEach(([id, pc]) => {
                try {
                    pc.getReceivers().forEach(receiver => {
                        if (receiver.track && receiver.track.kind === 'audio') {
                            const syncSources = receiver.getSynchronizationSources?.() || receiver.getContributingSources?.() || [];
                            if (syncSources.length > 0) {
                                const audioLevel = syncSources[0].audioLevel;
                                // audioLevel is normalized 0.0 to 1.0
                                if (typeof audioLevel === 'number' && audioLevel > 0.03) {
                                    lastSpokeTimeRef.current[id] = now;
                                    const scaledVol = audioLevel * 100;
                                    if (scaledVol > maxVol) {
                                        maxVol = scaledVol;
                                        currentLoudest = id;
                                    }
                                }
                            }
                        }
                    });
                } catch (_e) {}
            });

            // 3. Compute active speaking set applying Zoom speech hangover (1200ms)
            const activeSpeaking = {};
            const HANGOVER_MS = 1200;
            Object.keys(lastSpokeTimeRef.current).forEach(id => {
                if (now - (lastSpokeTimeRef.current[id] || 0) < HANGOVER_MS) {
                    activeSpeaking[id] = true;
                }
            });

            // 4. Diff check: ONLY trigger React state update if someone's speaking status actually changed!
            const prev = speakingPeersRef.current;
            const keys = new Set([...Object.keys(prev), ...Object.keys(activeSpeaking)]);
            let hasChanged = false;
            for (const k of keys) {
                if (Boolean(prev[k]) !== Boolean(activeSpeaking[k])) {
                    hasChanged = true;
                    break;
                }
            }

            if (hasChanged) {
                speakingPeersRef.current = activeSpeaking;
                setSpeakingPeers(activeSpeaking);
            }

            // 5. Update dominant active speaker with Zoom dwell time (2000ms minimum to prevent stage flapping)
            if (currentLoudest && currentLoudest !== activeSpeakerIdRef.current) {
                if (now - lastSpeakerSwitchRef.current > 2000) {
                    activeSpeakerIdRef.current = currentLoudest;
                    setActiveSpeakerId(currentLoudest);
                    lastSpeakerSwitchRef.current = now;
                }
            } else if (!currentLoudest && activeSpeakerIdRef.current) {
                if (now - lastSpeakerSwitchRef.current > 3000) {
                    activeSpeakerIdRef.current = null;
                    setActiveSpeakerId(null);
                }
            }

            timerId = setTimeout(sampleAudio, 250);
        };

        sampleAudio();

        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [isMuted]);

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
                    // Google STUN — fast and reliable
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    // Multiple free TURN servers for better NAT traversal reliability
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
                    },
                    // Fallback: Metered free TURN (more reliable than openrelay)
                    {
                        urls: 'turn:a.relay.metered.ca:80',
                        username: 'e499486991e2a2fd7a7b6bbb',
                        credential: 'kFz8RQ4o+zMOUf2X'
                    },
                    {
                        urls: 'turn:a.relay.metered.ca:443',
                        username: 'e499486991e2a2fd7a7b6bbb',
                        credential: 'kFz8RQ4o+zMOUf2X'
                    },
                    {
                        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
                        username: 'e499486991e2a2fd7a7b6bbb',
                        credential: 'kFz8RQ4o+zMOUf2X'
                    }
                ],
                bundlePolicy: 'max-bundle',
                iceCandidatePoolSize: 4
            });
            
            const activeStream = localStreamRef.current;
            const hasAudio = activeStream && activeStream.getAudioTracks().length > 0;
            const hasVideo = activeStream && activeStream.getVideoTracks().length > 0;

            if (activeStream && activeStream.getTracks().length > 0) {
                activeStream.getTracks().forEach(track => {
                    const sender = pc.addTrack(track, activeStream);
                    if (track.kind === 'video' && sender) {
                        applyVideoSenderParams(sender, isScreenSharing);
                    }
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
                            name: peerName || prevEntry?.name || 'Participant'
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
            const modOffer = new RTCSessionDescription({
                type: offer.type,
                sdp: optimizeSdp(offer.sdp)
            });
            await pc.setLocalDescription(modOffer);
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
            const modAnswer = new RTCSessionDescription({
                type: answer.type,
                sdp: optimizeSdp(answer.sdp)
            });
            await pc.setLocalDescription(modAnswer);
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
        else if (type === 'screen_share_status') {
            const isSharing = Boolean(data.isSharing);
            if (isSharing) {
                setRemoteScreenSharer({
                    peerId,
                    name: name || 'Participant',
                    stream: remoteStreamsRef.current[peerId]?.stream || null
                });
            } else {
                setRemoteScreenSharer(prev => (prev?.peerId === peerId ? null : prev));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep remoteScreenSharer stream in sync whenever remoteStreams receives/updates tracks
    useEffect(() => {
        if (remoteScreenSharer?.peerId) {
            const liveStream = remoteStreams[remoteScreenSharer.peerId]?.stream;
            if (liveStream && remoteScreenSharer.stream !== liveStream) {
                setRemoteScreenSharer(prev => prev ? { ...prev, stream: liveStream } : null);
            }
        }
    }, [remoteStreams, remoteScreenSharer?.peerId, remoteScreenSharer?.stream]);

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
                        pc.createOffer().then(async offer => {
                            const modOffer = new RTCSessionDescription({ type: offer.type, sdp: optimizeSdp(offer.sdp) });
                            await pc.setLocalDescription(modOffer);
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
                        applyVideoSenderParams(sender, false);
                    } else {
                        const newSender = pc.addTrack(newTrack, activeStream);
                        if (newSender) applyVideoSenderParams(newSender, false);
                        pc.createOffer().then(async offer => {
                            const modOffer = new RTCSessionDescription({ type: offer.type, sdp: optimizeSdp(offer.sdp) });
                            await pc.setLocalDescription(modOffer);
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

    const stopScreenShare = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => {
                try { t.stop(); } catch (_e) {}
            });
            screenStreamRef.current = null;
        }

        const stream = localStreamRef.current || localStream;
        const videoTrack = stream ? stream.getVideoTracks()[0] : null;

        if (videoTrack && 'contentHint' in videoTrack) {
            videoTrack.contentHint = 'motion';
        }

        Object.entries(peerConnections.current).forEach(([pId, pc]) => {
            try {
                const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video') ||
                                    pc.getTransceivers().find(t => t.sender && (!t.sender.track || t.sender.track.kind === 'video'))?.sender;

                if (videoSender) {
                    if (videoTrack) {
                        videoSender.replaceTrack(videoTrack);
                        applyVideoSenderParams(videoSender, false);
                    } else {
                        videoSender.replaceTrack(null);
                        const transceiver = pc.getTransceivers().find(t => t.sender === videoSender);
                        if (transceiver) transceiver.direction = 'recvonly';
                    }

                    pc.createOffer().then(async offer => {
                        const modOffer = new RTCSessionDescription({ type: offer.type, sdp: optimizeSdp(offer.sdp) });
                        await pc.setLocalDescription(modOffer);
                        sendMessageRef.current?.(JSON.stringify({
                            type: 'offer',
                            peerId: myIdRef.current,
                            targetId: pId,
                            name: myNameRef.current,
                            sdp: pc.localDescription
                        }));
                    }).catch(() => {});
                }
            } catch (err) {
                console.warn("Reverting track on peer error:", err);
            }
        });

        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(false);

        sendMessageRef.current?.(JSON.stringify({
            type: 'screen_share_status',
            peerId: myIdRef.current,
            name: myNameRef.current,
            isSharing: false
        }));
    }, [localStream]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            if (!navigator?.mediaDevices?.getDisplayMedia) {
                setMediaNotice("Screen broadcasting is restricted on mobile devices (iOS/Android). To present or share your screen, please join from a computer, or use the interactive Whiteboard to import documents and slides.");
                return;
            }

            let screenStream = null;
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor',
                        frameRate: { ideal: 15, max: 24 }
                    },
                    audio: false
                });
            } catch (err) {
                if (err.name === 'NotAllowedError' && (!err.message || err.message.toLowerCase().includes('denied') || err.message.toLowerCase().includes('cancel'))) {
                    // user cancelled the browser prompt
                    return;
                }
                if (err.name === 'NotSupportedError') {
                    setMediaNotice("Screen broadcasting is not supported by this device/browser. Please join from a desktop or laptop to share your screen.");
                    return;
                }
                console.warn("Screen share cancelled or failed:", err);
                setMediaNotice("Could not start screen sharing: " + (err.message || err.name));
                return;
            }

            if (!screenStream) return;

            try {
                const screenTrack = screenStream?.getVideoTracks()[0];
                if (!screenTrack) return;

                // Optimize track for presentation clarity (text and detail)
                if ('contentHint' in screenTrack) {
                    screenTrack.contentHint = 'detail';
                }

                screenStreamRef.current = screenStream;

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                // Replace or add video track for all connected peers
                for (const [pId, pc] of Object.entries(peerConnections.current)) {
                    try {
                        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video') ||
                                            pc.getTransceivers().find(t => t.sender && (!t.sender.track || t.sender.track.kind === 'video'))?.sender;

                        if (videoSender) {
                            const transceiver = pc.getTransceivers().find(t => t.sender === videoSender);
                            if (transceiver && transceiver.direction === 'recvonly') {
                                transceiver.direction = 'sendrecv';
                            }
                            await videoSender.replaceTrack(screenTrack);
                            applyVideoSenderParams(videoSender, true);
                        } else {
                            const newSender = pc.addTrack(screenTrack, screenStream);
                            if (newSender) applyVideoSenderParams(newSender, true);
                        }

                        // Renegotiate so remote peer receives new track
                        const offer = await pc.createOffer();
                        const modOffer = new RTCSessionDescription({ type: offer.type, sdp: optimizeSdp(offer.sdp) });
                        await pc.setLocalDescription(modOffer);
                        sendMessageRef.current?.(JSON.stringify({
                            type: 'offer',
                            peerId: myIdRef.current,
                            targetId: pId,
                            name: myNameRef.current,
                            sdp: pc.localDescription
                        }));
                    } catch (peerErr) {
                        console.warn("Error negotiating screen share with peer", pId, peerErr);
                    }
                }

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }
                setIsScreenSharing(true);

                // Broadcast screen share presence to board and video
                sendMessageRef.current?.(JSON.stringify({
                    type: 'screen_share_status',
                    peerId: myIdRef.current,
                    name: myNameRef.current,
                    isSharing: true
                }));
            } catch (err) {
                if (err.name !== 'NotAllowedError') {
                    console.error("Screen sharing error:", err);
                    setMediaNotice("Could not start screen sharing: " + (err.message || err.name));
                }
            }
        } else {
            stopScreenShare();
        }
    }, [isScreenSharing, stopScreenShare]);

    // Keep parent component (LiveClassRoom and board) notified of screen share state
    useEffect(() => {
        onScreenShareStateChange?.({
            isScreenSharing,
            localScreenStream: isScreenSharing ? (screenStreamRef.current || localVideoRef.current?.srcObject || null) : null,
            remoteScreenSharer
        });
    }, [isScreenSharing, remoteScreenSharer, onScreenShareStateChange]);

    // Provide external imperative toggle ref to parent
    useEffect(() => {
        if (externalToggleScreenShareRef) {
            externalToggleScreenShareRef.current = toggleScreenShare;
        }
    }, [externalToggleScreenShareRef, toggleScreenShare]);

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

    // Stage Selection Priority (Zoom standard):
    // 1. Explicitly pinned user
    // 2. Active remote screen sharer (so phone viewers immediately see screen share full-screen)
    // 3. Dominant active remote speaker (for 3+ participant group calls)
    // 4. First remote peer (standard 1-on-1 tutor <-> student view)
    // 5. Local camera
    const isRemoteSharing = Boolean(remoteScreenSharer?.peerId && remoteStreams[remoteScreenSharer.peerId]);
    const remoteActiveSpeaker = activeSpeakerId && activeSpeakerId !== 'local' && remoteStreams[activeSpeakerId] ? activeSpeakerId : null;
    const effectiveStageId = pinnedPeerId 
        || (isRemoteSharing ? remoteScreenSharer.peerId : null)
        || (remoteKeys.length > 2 && remoteActiveSpeaker ? remoteActiveSpeaker : null)
        || (remoteKeys.length > 0 ? remoteKeys[0] : 'local');

    return (
        <div className="flex flex-col h-full bg-[#0b0f19] text-white overflow-hidden select-none">
            {/* Dedicated persistent audio elements for all remote peers — offscreen, never display:none so browser audio thread is never throttled */}
            <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                {Object.entries(remoteStreams).map(([id, data]) => (
                    <PersistentPeerAudio key={`peer_audio_${id}`} id={id} stream={data?.stream} />
                ))}
            </div>
            
            {/* Top Zoom Toolbar: Encryption status, Participant counter & View Switcher */}
            <div className="flex-shrink-0 h-11 px-3 sm:px-4 bg-[#111622]/95 border-b border-slate-800/80 flex items-center justify-between gap-2 z-20">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>🔒 Zoom HD Encrypted</span>
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
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

                {/* Zoom View Mode Switcher: Speaker View vs Gallery View */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setZoomViewMode(m => m === 'speaker' ? 'gallery' : 'speaker')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-sm"
                        title="Toggle Zoom Speaker / Gallery View"
                    >
                        <span>{zoomViewMode === 'speaker' ? '🔲' : '👤'}</span>
                        <span>{zoomViewMode === 'speaker' ? 'Gallery View' : 'Speaker View'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col relative min-h-0 bg-[#0b0f19]">
                {mediaNotice && (
                    <div className="mb-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2 shadow-sm flex-shrink-0 flex-wrap">
                        <span className="flex-1 text-[11px] min-w-0">{mediaNotice}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Retry Camera button — only show when camera/mic failed (not for screen-share notices) */}
                            {!mediaNotice.toLowerCase().includes('screen') && (
                                <button
                                    type="button"
                                    onClick={() => retryMediaRef.current?.()}
                                    className="text-[10px] font-bold bg-amber-500/30 hover:bg-amber-500/60 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/50 transition-colors"
                                    title="Retry camera/microphone access"
                                >
                                    🔄 Retry Camera
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setMediaNotice(null)}
                                className="text-amber-400 hover:text-white text-xs px-1 font-bold"
                                title="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* ── ZOOM SPEAKER VIEW: Active Speaker is hero stage, the rest in top filmstrip ── */}
                {zoomViewMode === 'speaker' ? (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-1.5 sm:gap-2">
                        {/* Filmstrip: Small thumbnails for all other participants */}
                        {totalParticipants > 1 && (
                            <div className="flex-shrink-0 h-18 sm:h-22 flex items-center gap-2 overflow-x-auto custom-scrollbar px-1 py-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                                {/* Local user thumbnail if not on stage */}
                                {effectiveStageId !== 'local' && (
                                    <LocalVideoTile
                                        user={user}
                                        localStream={localStream}
                                        isVideoOff={isVideoOff}
                                        isMuted={isMuted}
                                        isScreenSharing={isScreenSharing}
                                        mode="filmstrip"
                                        isPinned={pinnedPeerId === 'local'}
                                        isSpeaking={Boolean(speakingPeers['local'])}
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
                                            mode="filmstrip"
                                            isPinned={pinnedPeerId === id}
                                            isSpeaking={Boolean(speakingPeers[id])}
                                            isScreenShare={remoteScreenSharer?.peerId === id}
                                            onPin={() => setPinnedPeerId(pinnedPeerId === id ? null : id)}
                                            raisedHand={raisedHands[id]}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Full Screen Stage for Active Speaker / Screen Sharer */}
                        <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 flex items-center justify-center">
                            {effectiveStageId === 'local' ? (
                                <LocalVideoTile
                                    user={user}
                                    localStream={localStream}
                                    isVideoOff={isVideoOff}
                                    isMuted={isMuted}
                                    isScreenSharing={isScreenSharing}
                                    mode="stage"
                                    isPinned={pinnedPeerId === 'local'}
                                    isSpeaking={Boolean(speakingPeers['local'])}
                                    onPin={() => setPinnedPeerId(null)}
                                    raisedHand={user?.id && raisedHands[user.id]}
                                />
                            ) : (
                                <RemoteVideoTile
                                    key={effectiveStageId}
                                    id={effectiveStageId}
                                    data={remoteStreams[effectiveStageId]}
                                    mode="stage"
                                    isPinned={pinnedPeerId === effectiveStageId}
                                    isSpeaking={Boolean(speakingPeers[effectiveStageId])}
                                    isScreenShare={remoteScreenSharer?.peerId === effectiveStageId}
                                    onPin={() => setPinnedPeerId(null)}
                                    raisedHand={raisedHands[effectiveStageId]}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── ZOOM GALLERY GRID VIEW: True Zoom side-by-side or multi-participant grid ── */
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 sm:p-2 flex items-center justify-center">
                        <div className={`w-full h-full max-w-6xl mx-auto grid gap-2.5 sm:gap-3 items-center justify-center ${
                            totalParticipants <= 1
                                ? 'grid-cols-1 max-w-3xl'
                                : totalParticipants === 2
                                    ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
                                    : totalParticipants <= 4
                                        ? 'grid-cols-1 sm:grid-cols-2 max-w-5xl'
                                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl'
                        }`}>
                            <LocalVideoTile
                                user={user}
                                localStream={localStream}
                                isVideoOff={isVideoOff}
                                isMuted={isMuted}
                                isScreenSharing={isScreenSharing}
                                mode="grid"
                                isPinned={pinnedPeerId === 'local'}
                                isSpeaking={Boolean(speakingPeers['local'])}
                                onPin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                                raisedHand={user?.id && raisedHands[user.id]}
                            />
                            {Object.entries(remoteStreams).map(([id, data]) => (
                                <RemoteVideoTile
                                    key={id}
                                    id={id}
                                    data={data}
                                    mode="grid"
                                    isPinned={pinnedPeerId === id}
                                    isSpeaking={Boolean(speakingPeers[id])}
                                    isScreenShare={remoteScreenSharer?.peerId === id}
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
                <div ref={chatPanelRef} className="absolute bottom-20 right-3 left-3 md:left-auto md:w-96 h-[460px] max-h-[70vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col z-[100] animate-in slide-in-from-bottom-6">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-emerald-500" />
                            <h4 className="font-bold text-xs uppercase tracking-widest">Class Chat</h4>
                        </div>
                        <button onClick={() => setShowChat(false)} aria-label="Close chat" className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"><X size={16} /></button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.name === 'You' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-tighter mb-1">{msg.name} • {msg.time}</span>
                                <div className={`px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed ${msg.name === 'You' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900/50 rounded-b-2xl">
                        <input name="chatInput" type="text" placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                        <button type="submit" aria-label="Send message" className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Zoom-Style Docked Controls Bar */}
            <div className="p-2 sm:p-3 bg-[#131722]/95 backdrop-blur-xl border-t border-slate-800/90 flex items-center justify-center gap-1.5 sm:gap-3 flex-nowrap overflow-x-auto custom-scrollbar pb-[max(0.6rem,env(safe-area-inset-bottom))] flex-shrink-0 shadow-2xl">
                <button 
                    onClick={toggleMute} 
                    className={`group w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center transition-all active:scale-90 ${
                        isMuted 
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/20' 
                            : Boolean(speakingPeers['local'])
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    <span className="text-[7px] font-bold mt-0.5 uppercase hidden sm:block tracking-tighter">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button 
                    onClick={toggleVideo} 
                    className={`group w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center transition-all active:scale-90 ${
                        isVideoOff ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                    title={isVideoOff ? 'Start Video' : 'Stop Video'}
                >
                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                    <span className="text-[7px] font-bold mt-0.5 uppercase hidden sm:block tracking-tighter">{isVideoOff ? 'Start' : 'Stop'}</span>
                </button>

                {canShareScreen && (
                    <button 
                        onClick={toggleScreenShare} 
                        className={`group w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center transition-all active:scale-90 font-semibold ${
                            isScreenSharing 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        }`}
                        title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen (Zoom)'}
                    >
                        <MonitorUp size={18} />
                        <span className="text-[7px] font-bold mt-0.5 uppercase hidden sm:block tracking-tighter">{isScreenSharing ? 'Sharing' : 'Share'}</span>
                    </button>
                )}

                <div className="w-px h-6 sm:h-8 bg-slate-800 flex-shrink-0" />

                <button 
                    onClick={handleRaiseHand} 
                    className="group w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-90"
                    title="Raise Hand"
                >
                    <Hand size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase hidden sm:block tracking-tighter">Hand</span>
                </button>

                <button 
                    onClick={() => setShowChat(!showChat)} 
                    className={`group w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center transition-all active:scale-90 relative ${
                        showChat ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title="Chat"
                >
                    <MessageSquare size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase hidden sm:block tracking-tighter">Chat</span>
                    {messages.length > 0 && !showChat && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </button>

                <div className="w-px h-6 sm:h-8 bg-slate-800 flex-shrink-0" />

                <button 
                    onClick={handleLeaveCall} 
                    className="group w-14 sm:w-20 h-11 sm:h-13 rounded-xl flex-shrink-0 flex flex-col items-center justify-center bg-red-600 hover:bg-red-500 text-white font-bold transition-all active:scale-90 shadow-md shadow-red-600/30"
                    title="Leave Call"
                >
                    <PhoneOff size={18} />
                    <span className="text-[7px] font-bold mt-0.5 uppercase tracking-widest">LEAVE</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(WebRTCVideoChat);
