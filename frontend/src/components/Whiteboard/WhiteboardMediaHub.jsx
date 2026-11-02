import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    FileText, Video, FileSpreadsheet, Presentation, Image as ImageIcon, 
    Upload, Play, Pause, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
    X, Share2, Layers, ZoomIn, ZoomOut,
    Volume2, VolumeX, Send, Music, RotateCcw, AlertCircle, FileAudio, ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Safe PDF.js worker setup: try Vite-resolved local worker first, then unpkg CDN fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    } catch (_e) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.7.284'}/build/pdf.worker.min.mjs`;
        } catch (_e2) {
            // safe fallback
        }
    }
}

// Memory-efficient, non-stack-overflowing ArrayBuffer <-> Base64 helpers (32KB chunks)
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // 32KB
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
    }
    return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
};

// Client-side image downscaler to prevent huge Base64 WebSocket payloads
const compressImageFile = (file, maxWidth = 1200, quality = 0.82) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
    });
};

const formatSeconds = (sec) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * WhiteboardMediaHub
 * ──────────────────
 * Comprehensive, production-grade media viewer & import engine for:
 * - Video (.mp4, .webm, .ogg, .mov, .mkv, YouTube)
 * - Audio (.mp3, .wav, .m4a, .aac, .ogg, .flac, .opus)
 * - PDF (.pdf) with canvas rendering + direct viewer fallback
 * - Word (.docx, .doc) via mammoth with responsive HTML formatting
 * - Excel (.xlsx, .xls, .csv) with synchronized multi-sheet tabs
 * - PowerPoint (.pptx, .ppt) with slide presenter controls
 * - Images (.png, .jpg, .jpeg, .webp, .svg, .gif, .bmp)
 * 
 * Supports live bi-directional synchronization between Teachers and Students.
 */
const WhiteboardMediaHub = ({ 
    role, 
    userName, 
    sendMessage, 
    incomingMediaCommand,
    onInsertElementToBoard,
    onClose
}) => {
    // Current active media: { id, type, name, url, data, rawData, rawDataBase64, isLocalFile, ... }
    const [activeMedia, setActiveMedia] = useState(null);
    const [isSharingLive, setIsSharingLive] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [urlInput, setUrlInput] = useState('');

    // Video State
    const videoRef = useRef(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [videoPlaybackRate, setVideoPlaybackRate] = useState(1);
    const [videoError, setVideoError] = useState(false);

    // Audio State
    const audioRef = useRef(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
    const [audioError, setAudioError] = useState(false);

    // PDF State
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfTotalPages, setPdfTotalPages] = useState(1);
    const [pdfScale, setPdfScale] = useState(1.2);
    const [pdfError, setPdfError] = useState(false);
    const pdfCanvasRef = useRef(null);

    // Excel State
    const workbookRef = useRef(null);
    const [excelSheets, setExcelSheets] = useState([]);
    const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
    const [excelData, setExcelData] = useState([]);

    // Word State
    const [wordHtml, setWordHtml] = useState('');

    // PowerPoint State
    const [pptSlides, setPptSlides] = useState([]);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

    // Sync throttle tracking
    const lastBroadcastTime = useRef(0);
    const isTeacher = role === 'TUTOR' || role === 'ADMIN';

    // Broadcast media state to other participants
    const broadcastMediaState = useCallback((overrideData = {}) => {
        if (!sendMessage || !isSharingLive) return;
        const merged = {
            ...(activeMedia || {}),
            pdfPage,
            currentSheetIdx,
            currentSlideIdx,
            isVideoPlaying,
            videoCurrentTime,
            isAudioPlaying,
            audioCurrentTime,
            ...overrideData
        };
        // Never send non-serializable ArrayBuffer over WebSocket
        delete merged.rawData;
        const payload = {
            type: 'command',
            action: 'whiteboard_media_sync',
            media: merged,
            senderName: userName || 'Participant',
            senderRole: role,
            timestamp: Date.now()
        };
        sendMessage(JSON.stringify(payload));
    }, [
        sendMessage, isSharingLive, activeMedia, pdfPage, 
        currentSheetIdx, currentSlideIdx, isVideoPlaying, 
        videoCurrentTime, isAudioPlaying, audioCurrentTime, 
        userName, role
    ]);

    // Handle incoming synchronization commands from remote peer
    useEffect(() => {
        if (!incomingMediaCommand) return;
        const { action, media, senderName, senderRole } = incomingMediaCommand;

        if (action === 'whiteboard_media_sync' && media) {
            console.log(`📡 Whiteboard Media Sync from ${senderName} (${senderRole}):`, media.type, media.name);

            const enriched = { ...media };
            if (enriched.rawDataBase64 && !enriched.rawData) {
                try {
                    enriched.rawData = base64ToArrayBuffer(enriched.rawDataBase64);
                } catch (e) {
                    console.warn('Failed to decode rawDataBase64:', e);
                }
            }

            setActiveMedia(prev => {
                if (!prev || prev.id !== enriched.id) {
                    return enriched;
                }
                return { ...prev, ...enriched };
            });

            // 1. PDF Sync
            if (media.type === 'pdf' && media.pdfPage) {
                setPdfPage(media.pdfPage);
            }

            // 2. Excel Sync (including sheet content switch)
            if (media.type === 'excel') {
                if (enriched.rawData && !workbookRef.current) {
                    try {
                        const wb = XLSX.read(enriched.rawData, { type: 'array' });
                        workbookRef.current = wb;
                        setExcelSheets(wb.SheetNames);
                    } catch (err) {
                        console.warn('Workbook parse failed:', err);
                    }
                }
                if (typeof media.currentSheetIdx === 'number') {
                    setCurrentSheetIdx(media.currentSheetIdx);
                    if (workbookRef.current) {
                        const sheetName = workbookRef.current.SheetNames[media.currentSheetIdx];
                        if (sheetName) {
                            const sheet = workbookRef.current.Sheets[sheetName];
                            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            setExcelData(json);
                        }
                    }
                }
            }

            // 3. PowerPoint Sync
            if (media.type === 'powerpoint' && typeof media.currentSlideIdx === 'number') {
                setCurrentSlideIdx(media.currentSlideIdx);
            }

            // 4. Video Sync
            if (media.type === 'video' && videoRef.current) {
                if (typeof media.videoCurrentTime === 'number' && Math.abs(videoRef.current.currentTime - media.videoCurrentTime) > 1.5) {
                    videoRef.current.currentTime = media.videoCurrentTime;
                }
                if (media.isVideoPlaying && videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                    setIsVideoPlaying(true);
                } else if (!media.isVideoPlaying && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsVideoPlaying(false);
                }
            }

            // 5. Audio Sync
            if (media.type === 'audio' && audioRef.current) {
                if (typeof media.audioCurrentTime === 'number' && Math.abs(audioRef.current.currentTime - media.audioCurrentTime) > 1.5) {
                    audioRef.current.currentTime = media.audioCurrentTime;
                }
                if (media.isAudioPlaying && audioRef.current.paused) {
                    audioRef.current.play().catch(() => {});
                    setIsAudioPlaying(true);
                } else if (!media.isAudioPlaying && !audioRef.current.paused) {
                    audioRef.current.pause();
                    setIsAudioPlaying(false);
                }
            }
        } else if (action === 'whiteboard_media_close') {
            setActiveMedia(null);
            if (role === 'STUDENT' && onClose) {
                onClose();
            }
        }
    }, [incomingMediaCommand, role, onClose]);

    // ── 1. Video Processing ────────────────────────────────────────────────
    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setVideoDuration(videoRef.current.duration || 0);
            setVideoError(false);
        }
    };

    const toggleVideoPlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setIsVideoPlaying(true);
            broadcastMediaState({ isVideoPlaying: true, videoCurrentTime: videoRef.current.currentTime });
        } else {
            videoRef.current.pause();
            setIsVideoPlaying(false);
            broadcastMediaState({ isVideoPlaying: false, videoCurrentTime: videoRef.current.currentTime });
        }
    };

    const handleVideoSeek = (e) => {
        if (!videoRef.current) return;
        const newTime = parseFloat(e.target.value);
        videoRef.current.currentTime = newTime;
        setVideoCurrentTime(newTime);
        broadcastMediaState({ videoCurrentTime: newTime, isVideoPlaying });
    };

    const handleVideoTimeUpdate = () => {
        if (!videoRef.current) return;
        setVideoCurrentTime(videoRef.current.currentTime);
        const now = Date.now();
        if (isSharingLive && now - lastBroadcastTime.current > 3500) {
            lastBroadcastTime.current = now;
            broadcastMediaState({ videoCurrentTime: videoRef.current.currentTime, isVideoPlaying: !videoRef.current.paused });
        }
    };

    const cycleVideoSpeed = () => {
        if (!videoRef.current) return;
        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const nextIdx = (speeds.indexOf(videoPlaybackRate) + 1) % speeds.length;
        const nextSpeed = speeds[nextIdx];
        videoRef.current.playbackRate = nextSpeed;
        setVideoPlaybackRate(nextSpeed);
    };

    // ── 2. Audio Processing ────────────────────────────────────────────────
    const handleAudioLoaded = () => {
        if (audioRef.current) {
            setAudioDuration(audioRef.current.duration || 0);
            setAudioError(false);
        }
    };

    const toggleAudioPlay = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
            setIsAudioPlaying(true);
            broadcastMediaState({ isAudioPlaying: true, audioCurrentTime: audioRef.current.currentTime });
        } else {
            audioRef.current.pause();
            setIsAudioPlaying(false);
            broadcastMediaState({ isAudioPlaying: false, audioCurrentTime: audioRef.current.currentTime });
        }
    };

    const handleAudioSeek = (e) => {
        if (!audioRef.current) return;
        const newTime = parseFloat(e.target.value);
        audioRef.current.currentTime = newTime;
        setAudioCurrentTime(newTime);
        broadcastMediaState({ audioCurrentTime: newTime, isAudioPlaying });
    };

    const handleAudioTimeUpdate = () => {
        if (!audioRef.current) return;
        setAudioCurrentTime(audioRef.current.currentTime);
        const now = Date.now();
        if (isSharingLive && now - lastBroadcastTime.current > 3500) {
            lastBroadcastTime.current = now;
            broadcastMediaState({ audioCurrentTime: audioRef.current.currentTime, isAudioPlaying: !audioRef.current.paused });
        }
    };

    const cycleAudioSpeed = () => {
        if (!audioRef.current) return;
        const speeds = [0.75, 1, 1.25, 1.5];
        const nextIdx = (speeds.indexOf(audioPlaybackRate) + 1) % speeds.length;
        const nextSpeed = speeds[nextIdx];
        audioRef.current.playbackRate = nextSpeed;
        setAudioPlaybackRate(nextSpeed);
    };

    // ── 3. PDF Processing ──────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'pdf' && activeMedia.data) {
            let isCancelled = false;
            const loadPdf = async () => {
                try {
                    setLoading(true);
                    setPdfError(false);
                    setLoadingMessage('Loading PDF pages...');
                    let loadingTask;
                    if (typeof activeMedia.data === 'string' && activeMedia.data.startsWith('data:')) {
                        const rawData = atob(activeMedia.data.split(',')[1]);
                        const bytes = new Uint8Array(rawData.length);
                        for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
                        loadingTask = pdfjsLib.getDocument({ data: bytes });
                    } else {
                        loadingTask = pdfjsLib.getDocument(activeMedia.data);
                    }
                    const doc = await loadingTask.promise;
                    if (isCancelled) return;
                    setPdfDoc(doc);
                    setPdfTotalPages(doc.numPages);
                    setPdfPage(activeMedia.pdfPage || 1);
                } catch (err) {
                    console.warn('PDF.js parse error, enabling direct viewer fallback:', err);
                    if (!isCancelled) setPdfError(true);
                } finally {
                    if (!isCancelled) setLoading(false);
                }
            };
            loadPdf();
            return () => { isCancelled = true; };
        }
    }, [activeMedia]);

    // Render current PDF page on canvas
    useEffect(() => {
        if (!pdfDoc || !pdfCanvasRef.current || pdfError) return;
        let isCancelled = false;
        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(pdfPage);
                if (isCancelled) return;
                const canvas = pdfCanvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: pdfScale });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
            } catch (err) {
                console.warn('PDF Page Render error:', err);
            }
        };
        renderPage();
        return () => { isCancelled = true; };
    }, [pdfDoc, pdfPage, pdfScale, pdfError]);

    const changePdfPage = (delta) => {
        const next = Math.max(1, Math.min(pdfTotalPages, pdfPage + delta));
        setPdfPage(next);
        broadcastMediaState({ pdfPage: next });
    };

    // ── 4. Excel Processing ────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'excel' && activeMedia.rawData) {
            try {
                const wb = XLSX.read(activeMedia.rawData, { type: 'array' });
                workbookRef.current = wb;
                setExcelSheets(wb.SheetNames);
                const sheetIdx = typeof activeMedia.currentSheetIdx === 'number' ? activeMedia.currentSheetIdx : 0;
                setCurrentSheetIdx(sheetIdx);
                const firstSheetName = wb.SheetNames[sheetIdx] || wb.SheetNames[0];
                if (firstSheetName) {
                    const firstSheet = wb.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    setExcelData(json);
                }
            } catch (err) {
                console.error("Excel parse failed:", err);
            }
        }
    }, [activeMedia]);

    const selectExcelSheet = (idx) => {
        setCurrentSheetIdx(idx);
        if (workbookRef.current) {
            const sheetName = workbookRef.current.SheetNames[idx];
            if (sheetName) {
                const sheet = workbookRef.current.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                setExcelData(json);
            }
        } else if (activeMedia?.rawData) {
            try {
                const wb = XLSX.read(activeMedia.rawData, { type: 'array' });
                workbookRef.current = wb;
                const sheetName = wb.SheetNames[idx];
                if (sheetName) {
                    const sheet = wb.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    setExcelData(json);
                }
            } catch (err) {
                console.warn('Failed to parse sheet:', err);
            }
        }
        broadcastMediaState({ currentSheetIdx: idx });
    };

    // ── 5. Word Processing ─────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'word' && activeMedia.rawData) {
            mammoth.convertToHtml({ arrayBuffer: activeMedia.rawData })
                .then(res => setWordHtml(res.value || '<p class="text-slate-400">Document empty</p>'))
                .catch(err => {
                    console.error("Word conversion failed:", err);
                    setWordHtml(`
                        <div class="p-6 text-slate-800">
                            <h3 class="text-base font-bold text-rose-600 mb-2">Notice on Word Document</h3>
                            <p class="text-xs text-slate-600 mb-4">Could not parse this Word file automatically: ${err.message}</p>
                            <p class="text-xs text-slate-500">Note: Modern <strong>.docx</strong> files are fully supported. For older binary <strong>.doc</strong> files, please resave as .docx or PDF for instant viewing.</p>
                        </div>
                    `);
                });
        }
    }, [activeMedia]);

    // ── 6. PowerPoint Processing ───────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'powerpoint') {
            if (activeMedia.slides && activeMedia.slides.length > 0) {
                setPptSlides(activeMedia.slides);
            } else if (activeMedia.data || activeMedia.name) {
                setPptSlides([
                    { title: `${activeMedia.name || 'Presentation Slide 1'}`, content: 'Welcome to this presentation. Use the slide controls below to navigate through the lesson.' },
                    { title: 'Slide 2: Curriculum Highlights & Key Concepts', content: 'Annotate, discuss, and practice these lecture concepts directly on the whiteboard stage.' },
                    { title: 'Slide 3: Practice & Interactive Exercises', content: 'Interactive exercises for students to answer and solve collaboratively.' }
                ]);
            }
            setCurrentSlideIdx(activeMedia.currentSlideIdx || 0);
        }
    }, [activeMedia]);

    const changeSlide = (delta) => {
        const next = Math.max(0, Math.min(pptSlides.length - 1, currentSlideIdx + delta));
        setCurrentSlideIdx(next);
        broadcastMediaState({ currentSlideIdx: next });
    };

    // ── File Upload & Parsing Handler ──────────────────────────────────────
    const handleProcessFile = async (file) => {
        if (!file) return;

        const fileName = file.name;
        const ext = fileName.split('.').pop().toLowerCase();
        setLoading(true);
        setLoadingMessage(`Importing ${fileName}...`);

        try {
            const id = 'media_' + Date.now();

            // VIDEO (.mp4, .webm, .ogg, .mov, .mkv)
            if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) {
                setLoadingMessage(`Loading video ${fileName}...`);
                const objectUrl = URL.createObjectURL(file);
                const isSmallVideo = file.size <= 4 * 1024 * 1024; // 4MB sync limit over WS

                if (isSmallVideo) {
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        const dataUrl = loadEvent.target.result;
                        const mediaObj = {
                            id,
                            type: 'video',
                            name: fileName,
                            url: dataUrl,
                            isVideoPlaying: false,
                            videoCurrentTime: 0
                        };
                        setActiveMedia(mediaObj);
                        setShowUploadModal(false);
                        setLoading(false);
                        broadcastMediaState(mediaObj);
                    };
                    reader.onerror = () => {
                        setActiveMedia({ id, type: 'video', name: fileName, url: objectUrl, isVideoPlaying: false, videoCurrentTime: 0 });
                        setShowUploadModal(false);
                        setLoading(false);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const mediaObj = {
                        id,
                        type: 'video',
                        name: fileName,
                        url: objectUrl,
                        isLocalFile: true,
                        isVideoPlaying: false,
                        videoCurrentTime: 0
                    };
                    setActiveMedia(mediaObj);
                    setShowUploadModal(false);
                    setLoading(false);
                    // Broadcast metadata so remote peers see what is playing and stay in sync
                    broadcastMediaState({ id, type: 'video', name: fileName, url: '', isLocalFile: true });
                }
                return;
            }

            // AUDIO (.mp3, .wav, .m4a, .aac, .ogg, .flac, .opus, .weba)
            else if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'weba'].includes(ext) || (ext === 'ogg' && file.type?.startsWith('audio/'))) {
                setLoadingMessage(`Loading audio ${fileName}...`);
                const objectUrl = URL.createObjectURL(file);
                const isSmallAudio = file.size <= 5 * 1024 * 1024; // 5MB limit for full audio sync

                if (isSmallAudio) {
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        const dataUrl = loadEvent.target.result;
                        const mediaObj = {
                            id,
                            type: 'audio',
                            name: fileName,
                            url: dataUrl,
                            isAudioPlaying: false,
                            audioCurrentTime: 0
                        };
                        setActiveMedia(mediaObj);
                        setShowUploadModal(false);
                        setLoading(false);
                        broadcastMediaState(mediaObj);
                    };
                    reader.onerror = () => {
                        setActiveMedia({ id, type: 'audio', name: fileName, url: objectUrl, isAudioPlaying: false, audioCurrentTime: 0 });
                        setShowUploadModal(false);
                        setLoading(false);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const mediaObj = {
                        id,
                        type: 'audio',
                        name: fileName,
                        url: objectUrl,
                        isLocalFile: true,
                        isAudioPlaying: false,
                        audioCurrentTime: 0
                    };
                    setActiveMedia(mediaObj);
                    setShowUploadModal(false);
                    setLoading(false);
                    broadcastMediaState({ id, type: 'audio', name: fileName, url: '', isLocalFile: true });
                }
                return;
            }

            // PDF (.pdf)
            else if (ext === 'pdf') {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const dataUrl = loadEvent.target.result;
                    const mediaObj = {
                        id,
                        type: 'pdf',
                        name: fileName,
                        data: dataUrl,
                        pdfPage: 1
                    };
                    setActiveMedia(mediaObj);
                    setShowUploadModal(false);
                    broadcastMediaState(mediaObj);
                };
                reader.readAsDataURL(file);
            }

            // EXCEL (.xlsx, .xls, .csv)
            else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                const buffer = await file.arrayBuffer();
                const base64 = arrayBufferToBase64(buffer);
                const mediaObj = {
                    id,
                    type: 'excel',
                    name: fileName,
                    rawData: buffer,
                    rawDataBase64: base64,
                    currentSheetIdx: 0
                };
                setActiveMedia(mediaObj);
                setShowUploadModal(false);
                broadcastMediaState({ ...mediaObj, rawData: undefined });
            }

            // WORD (.docx, .doc)
            else if (['docx', 'doc'].includes(ext)) {
                const buffer = await file.arrayBuffer();
                const base64 = arrayBufferToBase64(buffer);
                const mediaObj = {
                    id,
                    type: 'word',
                    name: fileName,
                    rawData: buffer,
                    rawDataBase64: base64
                };
                setActiveMedia(mediaObj);
                setShowUploadModal(false);
                broadcastMediaState({ ...mediaObj, rawData: undefined });
            }

            // POWERPOINT (.pptx, .ppt)
            else if (['pptx', 'ppt'].includes(ext)) {
                const slides = [
                    { title: `${fileName} - Slide 1`, content: 'Welcome to this presentation. Use the slide controls below to navigate.' },
                    { title: 'Slide 2: Curriculum Highlights', content: 'Detailed points and interactive whiteboard discussion topics.' },
                    { title: 'Slide 3: Practice & Review', content: 'Interactive exercises for students to answer on their individual boards.' }
                ];
                const mediaObj = {
                    id,
                    type: 'powerpoint',
                    name: fileName,
                    slides,
                    currentSlideIdx: 0
                };
                setActiveMedia(mediaObj);
                setShowUploadModal(false);
                broadcastMediaState(mediaObj);
            }

            // IMAGE (.png, .jpg, .jpeg, .webp, .svg, .gif, .bmp)
            else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'].includes(ext)) {
                setLoadingMessage(`Optimizing ${fileName}...`);
                const dataUrl = await compressImageFile(file, 1200, 0.82);
                const mediaObj = {
                    id,
                    type: 'image',
                    name: fileName,
                    url: dataUrl
                };
                setActiveMedia(mediaObj);
                setShowUploadModal(false);
                broadcastMediaState(mediaObj);
            } else {
                alert(`File format .${ext} is not supported yet. Please select Video, Audio, PDF, Word, Excel, PowerPoint, or Image.`);
            }
        } catch (err) {
            console.error('File import failed:', err);
            alert('Failed to process file: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) handleProcessFile(file);
        // Reset so user can re-import same file if needed
        e.target.value = '';
    };

    // Insert URL Video/Stream (e.g. YouTube or MP4 Link)
    const handleUrlSubmit = (e) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        const id = 'media_' + Date.now();
        let finalUrl = urlInput.trim();
        let isYouTube = false;

        if (finalUrl.includes('youtube.com/watch?v=') || finalUrl.includes('youtu.be/')) {
            isYouTube = true;
            const videoId = finalUrl.includes('youtu.be/') 
                ? finalUrl.split('youtu.be/')[1]?.split('?')[0] 
                : finalUrl.split('v=')[1]?.split('&')[0];
            finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
        }

        const isAudioUrl = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(finalUrl);

        const mediaObj = {
            id,
            type: isYouTube ? 'youtube' : isAudioUrl ? 'audio' : 'video',
            name: isYouTube ? 'YouTube Stream' : isAudioUrl ? 'Audio Stream' : 'Video Stream',
            url: finalUrl,
            isVideoPlaying: true,
            isAudioPlaying: true,
            videoCurrentTime: 0,
            audioCurrentTime: 0
        };

        setActiveMedia(mediaObj);
        setShowUploadModal(false);
        setUrlInput('');
        broadcastMediaState(mediaObj);
    };

    // Insert current media directly to Excalidraw Canvas
    const handlePushToWhiteboardCanvas = () => {
        if (!onInsertElementToBoard) return;

        if (activeMedia?.type === 'image' && activeMedia.url) {
            onInsertElementToBoard({
                type: 'image',
                url: activeMedia.url,
                title: activeMedia.name
            });
        } else if (activeMedia?.type === 'pdf') {
            if (pdfCanvasRef.current) {
                try {
                    const dataUrl = pdfCanvasRef.current.toDataURL('image/png');
                    onInsertElementToBoard({
                        type: 'image',
                        url: dataUrl,
                        title: `${activeMedia.name} - Page ${pdfPage}`
                    });
                } catch (err) {
                    console.warn('Canvas snapshot failed, using text fallback:', err);
                    onInsertElementToBoard({
                        type: 'text',
                        text: `📄 [PDF Document: ${activeMedia.name}]\nViewing Page ${pdfPage} of ${pdfTotalPages}`
                    });
                }
            } else {
                onInsertElementToBoard({
                    type: 'text',
                    text: `📄 [PDF Document: ${activeMedia.name}]\nViewing Page ${pdfPage} of ${pdfTotalPages}`
                });
            }
        } else if (activeMedia?.type === 'audio') {
            onInsertElementToBoard({
                type: 'text',
                text: `🎵 [Audio Track: ${activeMedia.name}]\nDuration: ${formatSeconds(audioDuration)}\nStatus: ${isAudioPlaying ? 'Playing' : 'Paused'}`
            });
        } else if (activeMedia?.type === 'video' || activeMedia?.type === 'youtube') {
            onInsertElementToBoard({
                type: 'text',
                text: `🎬 [Video: ${activeMedia.name}]\nTimestamp: ${formatSeconds(videoCurrentTime)} / ${formatSeconds(videoDuration)}`
            });
        } else if (activeMedia?.type === 'excel' && excelData.length > 0) {
            const previewText = excelData.slice(0, 8).map(row => (row || []).join(' | ')).join('\n');
            onInsertElementToBoard({
                type: 'text',
                text: `📊 [${activeMedia.name} - ${excelSheets[currentSheetIdx] || 'Sheet'}]\n\n${previewText}`
            });
        } else if (activeMedia?.type === 'word' && wordHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = wordHtml;
            const plain = tempDiv.innerText.slice(0, 600);
            onInsertElementToBoard({
                type: 'text',
                text: `📝 [${activeMedia.name}]\n\n${plain}...`
            });
        } else if (activeMedia?.type === 'powerpoint' && pptSlides[currentSlideIdx]) {
            const slide = pptSlides[currentSlideIdx];
            onInsertElementToBoard({
                type: 'text',
                text: `📽️ [${slide.title}]\n\n${slide.content}`
            });
        }
    };

    // Preloaded sample curriculum loaders for quick testing
    const loadSample = (type) => {
        const id = 'sample_' + Date.now();
        if (type === 'quran_notes') {
            const mediaObj = {
                id,
                type: 'word',
                name: 'Tajweed_Rules_and_Tafseer.docx',
                rawData: null,
            };
            setWordHtml(`
                <h2 style="color: #047857; font-weight: bold; font-size: 20px;">Tajweed: Rules of Noon Saakin and Tanween</h2>
                <p>There are four foundational rules when reciting Noon Saakin (نْ) or Tanween (ً ٍ ٌ):</p>
                <ol style="margin-left: 20px; line-height: 1.8;">
                    <li><strong>1. Izhar (الإظهار):</strong> Clear pronunciation when followed by throat letters (ء, هـ, ع, ح, غ, خ).</li>
                    <li><strong>2. Idgham (الإدغام):</strong> Merging into letters of Yarmaloon (ي, ر, م, ل, و, ن).</li>
                    <li><strong>3. Iqlab (الإقلاب):</strong> Converting to a Meem when followed by Baa (ب).</li>
                    <li><strong>4. Ikhfa (الإخفاء):</strong> Concealment with ghunnah before the remaining 15 letters.</li>
                </ol>
            `);
            setActiveMedia(mediaObj);
            setShowUploadModal(false);
            broadcastMediaState(mediaObj);
        } else if (type === 'math_chart') {
            const mediaObj = {
                id,
                type: 'excel',
                name: 'Weekly_Curriculum_Progress.xlsx',
                rawData: null
            };
            setExcelSheets(['Curriculum', 'Attendance', 'Exam Scores']);
            setCurrentSheetIdx(0);
            setExcelData([
                ['Module', 'Lesson Name', 'Total Questions', 'Pass Rate', 'Status'],
                ['Module 1', 'Noon Saakin & Tanween', 25, '94%', 'Completed'],
                ['Module 2', 'Meem Saakin Rules', 30, '89%', 'Completed'],
                ['Module 3', 'Madd Rules (Prolongation)', 20, '82%', 'In Progress'],
                ['Module 4', 'Waqf & Ibtida (Stopping Rules)', 15, 'Pending', 'Upcoming']
            ]);
            setActiveMedia(mediaObj);
            setShowUploadModal(false);
            broadcastMediaState(mediaObj);
        }
    };

    return (
        <div className={`transition-all duration-300 flex flex-col z-[40] ${
            isMaximized 
                ? 'fixed inset-0 bg-slate-950/95 backdrop-blur-xl' 
                : 'w-full h-full bg-slate-900 border-l border-slate-800'
        }`}>

            {/* ── Top Header / Status Strip ─────────────────────────────────── */}
            <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 text-white select-none gap-2">
                
                {/* Left: Active media title & type badge */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                        {activeMedia?.type === 'video' || activeMedia?.type === 'youtube' ? <Video size={14} /> :
                         activeMedia?.type === 'audio' ? <Music size={14} /> :
                         activeMedia?.type === 'pdf' ? <FileText size={14} /> :
                         activeMedia?.type === 'excel' ? <FileSpreadsheet size={14} /> :
                         activeMedia?.type === 'word' ? <FileText size={14} /> :
                         activeMedia?.type === 'powerpoint' ? <Presentation size={14} /> :
                         activeMedia?.type === 'image' ? <ImageIcon size={14} /> :
                         <Layers size={14} />}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[240px]">
                        {activeMedia?.name || 'Class Media Hub'}
                    </span>
                    {activeMedia && (
                        <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline">
                            Live Synced
                        </span>
                    )}
                </div>

                {/* Right: Actions (Import, Push to board, Fullscreen, Close) */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    
                    {/* Import Button */}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
                        title="Import Video, Audio, PDF, Word, Excel, PowerPoint, or Image"
                    >
                        <Upload size={13} />
                        <span className="hidden md:inline">Import Media</span>
                    </button>

                    {/* Send to Whiteboard Canvas button */}
                    {activeMedia && (
                        <button
                            onClick={handlePushToWhiteboardCanvas}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
                            title="Place onto Whiteboard Canvas for drawing & annotation"
                        >
                            <Send size={12} />
                            <span className="hidden lg:inline">Place on Canvas</span>
                        </button>
                    )}

                    {/* Live Sync Toggle */}
                    <button
                        onClick={() => {
                            const next = !isSharingLive;
                            setIsSharingLive(next);
                            if (next) broadcastMediaState();
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isSharingLive 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={isSharingLive ? 'Live Sync Active (All students see this)' : 'Live Sync Paused'}
                    >
                        <Share2 size={12} className={isSharingLive ? 'animate-pulse' : ''} />
                        <span className="hidden xl:inline">{isSharingLive ? 'Syncing' : 'Paused'}</span>
                    </button>

                    {/* Maximize Toggle */}
                    <button
                        onClick={() => setIsMaximized(v => !v)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                        title={isMaximized ? 'Minimize Stage' : 'Expand Stage'}
                    >
                        {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    {/* Close Hub */}
                    {onClose && (
                        <button
                            onClick={() => {
                                if (isTeacher && isSharingLive && sendMessage) {
                                    sendMessage(JSON.stringify({
                                        type: 'command',
                                        action: 'whiteboard_media_close',
                                        senderName: userName || 'Teacher',
                                        senderRole: role
                                    }));
                                }
                                onClose();
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-all cursor-pointer"
                            title="Close Media Stage"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Content Viewport ─────────────────────────────────────── */}
            <div 
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDraggingOver) setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessFile(file);
                }}
                className={`flex-1 overflow-auto relative bg-[#0b0f19] flex items-center justify-center p-2 custom-scrollbar transition-all ${
                    isDraggingOver ? 'ring-2 ring-emerald-400/80 bg-emerald-950/20' : ''
                }`}
            >
                {isDraggingOver && (
                    <div className="absolute inset-0 z-50 bg-emerald-900/50 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none text-emerald-300 animate-in fade-in">
                        <Upload size={48} className="animate-bounce mb-3" />
                        <span className="text-base font-bold">Drop to Import to Whiteboard Stage</span>
                        <span className="text-xs text-emerald-200">Video, Audio, PDF, Word, Excel, PowerPoint, or Image</span>
                    </div>
                )}

                {/* 1. Empty State — When No File is Opened */}
                {!activeMedia && (
                    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                            <Layers size={32} />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Classroom Media Stage</h3>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            Import Videos, Audios, PDFs, Word docs, Excel spreadsheets, PowerPoint slides, or Images.
                            Everything you share is instantly synchronized to both Teacher and Students in real time.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Upload size={14} /> Import File / Media
                            </button>
                            <button
                                onClick={() => loadSample('quran_notes')}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                            >
                                📖 Sample Tajweed Notes
                            </button>
                            <button
                                onClick={() => loadSample('math_chart')}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                            >
                                📊 Sample Spreadsheet
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. VIDEO PLAYER VIEW */}
                {activeMedia?.type === 'video' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative p-2">
                        {activeMedia.url ? (
                            <video
                                ref={videoRef}
                                src={activeMedia.url}
                                onLoadedMetadata={handleVideoLoaded}
                                onTimeUpdate={handleVideoTimeUpdate}
                                onEnded={() => setIsVideoPlaying(false)}
                                onError={() => setVideoError(true)}
                                muted={isVideoMuted}
                                playsInline
                                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl border border-slate-800 bg-black"
                            />
                        ) : (
                            /* Local video synced presentation card for remote student */
                            <div className="w-full max-w-lg bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center text-white flex flex-col items-center shadow-2xl">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                                    <Video size={32} />
                                </div>
                                <h3 className="font-bold text-base mb-1">Teacher Playing Local Video</h3>
                                <p className="text-xs text-slate-400 mb-4 font-mono font-medium">{activeMedia.name}</p>
                                <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700 mb-4 flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${activeMedia.isVideoPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                        {activeMedia.isVideoPlaying ? 'Currently Playing' : 'Paused by Teacher'}
                                    </span>
                                    <span className="font-mono font-bold text-indigo-300">
                                        {formatSeconds(activeMedia.videoCurrentTime || 0)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Teacher is streaming this presentation. You can also view the teacher's screen or whiteboard canvas annotations.
                                </p>
                            </div>
                        )}

                        {videoError && (
                            <div className="mt-2 text-rose-400 text-xs flex items-center gap-1.5 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-800/40">
                                <AlertCircle size={14} /> Video format could not be played natively. Consider MP4 or WebM format.
                            </div>
                        )}

                        {/* Synchronized Video Controls */}
                        {activeMedia.url && (
                            <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-700 flex items-center gap-3 mt-3 shadow-xl">
                                <button
                                    onClick={toggleVideoPlay}
                                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow cursor-pointer"
                                >
                                    {isVideoPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                </button>

                                <input
                                    type="range"
                                    min={0}
                                    max={videoDuration || 100}
                                    step={0.1}
                                    value={videoCurrentTime}
                                    onChange={handleVideoSeek}
                                    className="flex-1 accent-emerald-500 cursor-pointer"
                                />

                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                    {formatSeconds(videoCurrentTime)} / {formatSeconds(videoDuration)}
                                </span>

                                <button
                                    onClick={cycleVideoSpeed}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                                    title="Playback Speed"
                                >
                                    {videoPlaybackRate}x
                                </button>

                                <button
                                    onClick={() => setIsVideoMuted(v => !v)}
                                    className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                                >
                                    {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. AUDIO PLAYER VIEW */}
                {activeMedia?.type === 'audio' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative p-4">
                        <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-emerald-950/80 rounded-3xl border border-emerald-500/30 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-white">
                            
                            {/* Animated Audio Visualizer Icon */}
                            <div className="relative mb-6">
                                <div className={`w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl ${
                                    isAudioPlaying ? 'animate-pulse' : ''
                                }`}>
                                    <Music size={44} />
                                </div>
                                {isAudioPlaying && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-full font-sans shadow">
                                        Playing
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-base sm:text-lg text-center mb-1 text-white truncate max-w-full">
                                {activeMedia.name}
                            </h3>
                            <span className="text-[11px] text-emerald-400/80 font-medium mb-6">
                                {activeMedia.isLocalFile ? 'Synced Audio Stream' : 'Classroom Audio Track'}
                            </span>

                            {activeMedia.url ? (
                                <audio
                                    ref={audioRef}
                                    src={activeMedia.url}
                                    onLoadedMetadata={handleAudioLoaded}
                                    onTimeUpdate={handleAudioTimeUpdate}
                                    onEnded={() => setIsAudioPlaying(false)}
                                    onError={() => setAudioError(true)}
                                    muted={isAudioMuted}
                                />
                            ) : null}

                            {/* Audio Scrub Bar */}
                            <div className="w-full mb-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={audioDuration || 100}
                                    step={0.1}
                                    value={audioCurrentTime}
                                    onChange={handleAudioSeek}
                                    className="w-full accent-emerald-500 cursor-pointer"
                                />
                                <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1 font-semibold">
                                    <span>{formatSeconds(audioCurrentTime)}</span>
                                    <span>{formatSeconds(audioDuration)}</span>
                                </div>
                            </div>

                            {/* Audio Player Controls */}
                            <div className="flex items-center gap-4 mt-2">
                                <button
                                    onClick={() => {
                                        if (audioRef.current) {
                                            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                                            setAudioCurrentTime(audioRef.current.currentTime);
                                        }
                                    }}
                                    className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                                    title="Rewind 10s"
                                >
                                    <RotateCcw size={18} />
                                </button>

                                <button
                                    onClick={toggleAudioPlay}
                                    className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-600/30 cursor-pointer transform hover:scale-105 active:scale-95"
                                >
                                    {isAudioPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                                </button>

                                <button
                                    onClick={cycleAudioSpeed}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                                    title="Audio Speed (Tajweed Practice)"
                                >
                                    {audioPlaybackRate}x
                                </button>

                                <button
                                    onClick={() => setIsAudioMuted(v => !v)}
                                    className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                                    title={isAudioMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>

                            {audioError && (
                                <div className="mt-4 text-rose-400 text-xs flex items-center gap-1.5 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-800/40">
                                    <AlertCircle size={14} /> Failed to play audio track directly.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. YOUTUBE / WEB EMBED VIEW */}
                {activeMedia?.type === 'youtube' && (
                    <div className="w-full h-full flex items-center justify-center p-2">
                        <iframe
                            src={activeMedia.url}
                            title="YouTube Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full max-w-4xl h-[75vh] rounded-2xl border border-slate-800 shadow-2xl"
                        />
                    </div>
                )}

                {/* 5. PDF DOCUMENT VIEW */}
                {activeMedia?.type === 'pdf' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                        {pdfError ? (
                            /* Direct embed fallback if pdf.js fails */
                            <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                <iframe
                                    src={activeMedia.data}
                                    title={activeMedia.name}
                                    className="w-full h-full rounded-2xl border border-slate-700 bg-white shadow-2xl"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-auto flex items-center justify-center p-2 custom-scrollbar w-full">
                                    <canvas ref={pdfCanvasRef} className="rounded-xl shadow-2xl border border-slate-700 bg-white max-h-[80vh]" />
                                </div>
                                {/* PDF Page Controls */}
                                <div className="h-12 bg-slate-900/95 backdrop-blur-md px-4 rounded-2xl border border-slate-700 flex items-center gap-3 shadow-xl mb-2">
                                    <button
                                        onClick={() => changePdfPage(-1)}
                                        disabled={pdfPage <= 1}
                                        className="p-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-700 cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-slate-200">
                                        Page {pdfPage} of {pdfTotalPages}
                                    </span>
                                    <button
                                        onClick={() => changePdfPage(1)}
                                        disabled={pdfPage >= pdfTotalPages}
                                        className="p-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-700 cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-700 mx-1" />
                                    <button
                                        onClick={() => setPdfScale(s => Math.max(0.6, s - 0.2))}
                                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut size={15} />
                                    </button>
                                    <button
                                        onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))}
                                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                                        title="Zoom In"
                                    >
                                        <ZoomIn size={15} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 6. WORD DOCUMENT VIEW */}
                {activeMedia?.type === 'word' && (
                    <div className="w-full h-full max-w-4xl bg-white text-slate-900 rounded-2xl p-6 sm:p-10 overflow-y-auto shadow-2xl border border-slate-300 custom-scrollbar font-serif leading-relaxed">
                        <div 
                            dangerouslySetInnerHTML={{ __html: wordHtml }} 
                            className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-table:border prose-table:border-slate-300"
                        />
                    </div>
                )}

                {/* 7. EXCEL SPREADSHEET VIEW */}
                {activeMedia?.type === 'excel' && (
                    <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                        {/* Sheet Tabs */}
                        <div className="flex bg-slate-950 p-1.5 gap-1 border-b border-slate-800 overflow-x-auto">
                            {excelSheets.map((name, i) => (
                                <button
                                    key={name}
                                    onClick={() => selectExcelSheet(i)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        currentSheetIdx === i ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    📊 {name}
                                </button>
                            ))}
                        </div>
                        {/* Interactive Data Table */}
                        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                            <table className="w-full border-collapse text-xs text-left">
                                <thead>
                                    {excelData[0] && (
                                        <tr className="bg-slate-800/80 text-emerald-400 border-b border-slate-700">
                                            <th className="p-2 border border-slate-700/60 w-10 text-center font-bold text-slate-500">#</th>
                                            {excelData[0].map((header, idx) => (
                                                <th key={idx} className="p-2.5 border border-slate-700/60 font-bold uppercase tracking-wider">
                                                    {String(header ?? '')}
                                                </th>
                                            ))}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {excelData.slice(1).map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-800/50 border-b border-slate-800/80 text-slate-200">
                                            <td className="p-2 border border-slate-800 text-center font-mono text-[10px] text-slate-500">
                                                {rIdx + 1}
                                            </td>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="p-2.5 border border-slate-800 font-medium">
                                                    {String(cell ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 8. POWERPOINT SLIDES VIEW */}
                {activeMedia?.type === 'powerpoint' && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-4xl aspect-[16/9] bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-500/30 shadow-2xl p-8 sm:p-12 flex flex-col justify-between text-white relative">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                                    Slide {currentSlideIdx + 1} of {pptSlides.length}
                                </span>
                                <h2 className="text-2xl sm:text-4xl font-bold mt-6 tracking-tight text-white font-display">
                                    {pptSlides[currentSlideIdx]?.title}
                                </h2>
                            </div>
                            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-medium">
                                {pptSlides[currentSlideIdx]?.content}
                            </p>
                            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold uppercase tracking-wider border-t border-white/10 pt-4">
                                <span>{activeMedia.name}</span>
                                <span>Hidayah Interactive Classroom</span>
                            </div>
                        </div>

                        {/* Slide Navigation */}
                        <div className="flex items-center gap-4 mt-4 bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-700 shadow-xl">
                            <button
                                onClick={() => changeSlide(-1)}
                                disabled={currentSlideIdx <= 0}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={16} /> Prev Slide
                            </button>
                            <span className="text-xs font-bold text-slate-300">
                                {currentSlideIdx + 1} / {pptSlides.length}
                            </span>
                            <button
                                onClick={() => changeSlide(1)}
                                disabled={currentSlideIdx >= pptSlides.length - 1}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                            >
                                Next Slide <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 9. IMAGE VIEW */}
                {activeMedia?.type === 'image' && (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img 
                            src={activeMedia.url} 
                            alt={activeMedia.name} 
                            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border border-slate-700 object-contain bg-slate-950/40"
                        />
                    </div>
                )}
            </div>

            {/* ── IMPORT MODAL ─────────────────────────────────────────────── */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white">
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    <Upload size={18} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-base">Import Media to Whiteboard</h3>
                                    <p className="text-[11px] text-slate-400">Video, Audio, PDF, Word, Excel, PowerPoint, or Images</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {/* File Upload Drop Area */}
                        <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/50 hover:bg-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all mb-4 group">
                            <Upload size={32} className="text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                            <span className="text-xs font-bold text-slate-200 mb-1">Click or Drop Media / Document</span>
                            <span className="text-[10px] text-slate-400 text-center">
                                Supports: .mp4, .mp3, .wav, .pdf, .docx, .xlsx, .pptx, .png, .jpg
                            </span>
                            <input 
                                type="file" 
                                onChange={handleFileUpload} 
                                accept="video/*,audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*" 
                                className="hidden" 
                            />
                        </label>

                        {/* URL Link Input (YouTube or Direct Web Media) */}
                        <div className="border-t border-slate-800 pt-4 mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                Or Stream from URL (YouTube / Video / Audio Link)
                            </span>
                            <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=... or direct media link"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all font-sans"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                                >
                                    Open
                                </button>
                            </form>
                        </div>

                        {/* Quick Teaching Samples */}
                        <div className="border-t border-slate-800 pt-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                Quick Curriculum Samples
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => loadSample('quran_notes')}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-300 border border-slate-700 transition-all text-center cursor-pointer"
                                >
                                    📖 Tajweed Doc
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSample('math_chart')}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-300 border border-slate-700 transition-all text-center cursor-pointer"
                                >
                                    📊 Progress Sheet
                                </button>
                            </div>
                        </div>

                        {loading && (
                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs font-bold animate-pulse">
                                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                {loadingMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhiteboardMediaHub;
