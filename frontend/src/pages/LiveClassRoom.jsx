import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import WebRTCVideoChat from '../components/LiveClass/WebRTCVideoChat';
import ExcalidrawWhiteboard from '../components/Whiteboard/ExcalidrawWhiteboard';
import { Timer, CheckCircle, Clock } from 'lucide-react';

/**
 * LiveClassRoom
 * ─────────────
 * The video/audio call is ALWAYS mounted (never unmounted) so that the
 * WebRTC connection and audio stream stay alive when a user switches to
 * the whiteboard – exactly like WhatsApp or Zoom.
 */
const LiveClassRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Desktop sidebar open/collapsed
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  // Desktop layout: 'classroom' (board + sidebar) | 'gallery' (video only)
  const [layoutMode, setLayoutMode] = useState('classroom');
  // Mobile active view: 'whiteboard' | 'video'
  const [mobileView, setMobileView] = useState('whiteboard');

  // Elapsed timer tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishMinutes, setFinishMinutes] = useState(40);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingFinish, setSubmittingFinish] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenFinish = () => {
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    setFinishMinutes(mins);
    setShowFinishModal(true);
  };

  const handleSubmitFinish = async () => {
    const sessionId = /^\d+$/.test(roomId) ? roomId : (roomId.match(/\d+/) ? roomId.match(/\d+/)[0] : null);
    if (!sessionId) {
      toast.error("Session ID not detected. Exiting room.");
      navigate(-1);
      return;
    }

    setSubmittingFinish(true);
    try {
      const res = await api.post(`/api/classes/session/${sessionId}/complete/`, {
        actual_duration_minutes: finishMinutes,
        completion_notes: completionNotes,
      });

      toast.success(res.data.message || `Class finished! Admin will verify ${finishMinutes} minutes and release your payout.`);
      setShowFinishModal(false);
      navigate(user?.role === 'TUTOR' ? '/tutor/schedule' : -1);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit class completion.");
    } finally {
      setSubmittingFinish(false);
    }
  };

  // Screen share bridge between WebRTC and Board
  const [screenShareState, setScreenShareState] = useState({
    isScreenSharing: false,
    localScreenStream: null,
    remoteScreenSharer: null
  });
  const externalToggleScreenShareRef = React.useRef(null);

  const handleToggleScreenShare = () => {
    if (externalToggleScreenShareRef.current) {
      externalToggleScreenShareRef.current();
    }
  };

  const handleExitRoom = () => navigate(-1);
  const isTutorOrAdmin = user?.role === 'TUTOR' || user?.role === 'ADMIN';

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0f172a] overflow-hidden font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 md:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-6 z-[3000] gap-2">

        {/* Left: LIVE badge + room name + timer */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/80 rounded-lg text-slate-300 border border-slate-700/60 text-[10px] font-mono">
            <Timer size={11} className="text-emerald-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <h2 className="text-white font-bold text-[11px] md:text-sm truncate max-w-[80px] sm:max-w-[180px]">
            Room: {roomId}
          </h2>
        </div>

        {/* Centre: layout / mode toggles */}
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

        {/* Right: Tutor Finish Class Button + exit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isTutorOrAdmin && (
            <button
              onClick={handleOpenFinish}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wide transition-all shadow-md shadow-emerald-600/30 border border-emerald-400"
              title="Finish class session and submit minutes for admin verification"
            >
              <CheckCircle size={12} />
              <span>Finish Class</span>
            </button>
          )}

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

      {/* ── Main Workspace: Whiteboard + Video (Single Unified Mount) ──── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Whiteboard Container — Single Mount */}
        <div className={`relative transition-all duration-300 bg-[#f8fafc] ${
          layoutMode === 'gallery' ? 'md:hidden' : 'md:flex-1'
        } ${
          mobileView === 'whiteboard' ? 'flex-1 z-10' : 'hidden md:flex'
        }`}>
          <ExcalidrawWhiteboard 
            roomId={roomId} 
            role={user?.role} 
            userName={user?.first_name}
            screenShareState={screenShareState}
            onToggleScreenShare={handleToggleScreenShare}
          />

          {/* Floating "Live Call Active" pill on mobile while on whiteboard tab */}
          <div className="md:hidden absolute bottom-4 right-4 z-[2000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {screenShareState.isScreenSharing ? 'Sharing Screen' : screenShareState.remoteScreenSharer ? 'Screen Live' : 'Call Active'}
            </span>
            <button
              onClick={() => setMobileView('video')}
              className="ml-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase rounded-lg transition-all"
            >
              Open
            </button>
          </div>
        </div>

        {/* Video Sidebar / Gallery — Single Mount */}
        <div className={`flex flex-col bg-slate-900 transition-all duration-300 relative ${
          layoutMode === 'gallery'
            ? 'md:flex-1'
            : isVideoOpen
              ? 'md:w-[380px] md:xl:w-[420px] md:border-l md:border-slate-800'
              : 'md:w-0 md:overflow-hidden'
        } ${
          mobileView === 'video'
            ? 'flex-1 z-20'
            : 'hidden md:flex'
        }`}>
          <WebRTCVideoChat
            roomId={roomId}
            isVideoOpen={isVideoOpen}
            setIsVideoOpen={setIsVideoOpen}
            layoutMode={layoutMode}
            onScreenShareStateChange={setScreenShareState}
            externalToggleScreenShareRef={externalToggleScreenShareRef}
          />

          {/* Desktop collapse/expand handle */}
          {layoutMode === 'classroom' && (
            <button
              onClick={() => setIsVideoOpen(v => !v)}
              className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-4 w-4 h-12 bg-slate-800 border border-slate-700 rounded-l-xl text-slate-400 hover:text-white transition-all z-[3000] items-center justify-center text-xs"
              title={isVideoOpen ? 'Hide video panel' : 'Show video panel'}
            >
              {isVideoOpen ? '❯' : '❮'}
            </button>
          )}
        </div>
      </div>

      {/* ── Finish Class Modal (Tutor submission for admin verification) ── */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[5000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finish Class Session</h3>
                <p className="text-xs text-slate-400">Record minutes for Admin verification & wallet payout</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock size={14} className="text-emerald-400" />
                  <span>Call Elapsed Time:</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-400">{formatTimer(elapsedSeconds)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Actual Minutes Taken:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={finishMinutes}
                    onChange={(e) => setFinishMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-center font-bold text-base outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-400 font-medium">minutes</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Topics Covered / Notes:
                </label>
                <textarea
                  rows="3"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Completed Chapter 3 exercises and pronunciation practice..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none focus:border-emerald-500 placeholder:text-slate-500 resize-none"
                />
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-[11px] text-emerald-200/90 leading-relaxed">
                ℹ️ <strong>Platform Escrow Payout:</strong> Admin will verify your minutes. The platform calculates your earnings based on your hourly rate and credits your tutor wallet directly.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  disabled={submittingFinish}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-xs uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFinish}
                  disabled={submittingFinish}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {submittingFinish ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Submit & Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassRoom;
