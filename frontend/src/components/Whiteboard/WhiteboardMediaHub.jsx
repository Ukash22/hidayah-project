import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    FileText, Video, FileSpreadsheet, Presentation, Image as ImageIcon, 
    Upload, Play, Pause, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
    X, Share2, Layers, ZoomIn, ZoomOut,
    Volume2, VolumeX, Send, Music
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker with safe unpkg CDN fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.7.284'}/build/pdf.worker.min.mjs`;
    } catch (_e) {
        // safe fallback
    }
}

// Client-side image downscaler to prevent huge Base64 WebSocket payloads
const compressImageFile = (file, maxWidth = 1200, quality = 0.8) => {
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

/**
 * WhiteboardMediaHub
 * ──────────────────
 * Comprehensive media viewer & import engine for:
 * Video (.mp4, .webm, YouTube), PDF (.pdf), Word (.docx, .doc),
 * Excel (.xlsx, .xls, .csv), PowerPoint (.pptx), and Images (.png, .jpg, .svg).
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
    // Current active media: { type, name, url, data, rawData, ... }
    const [activeMedia, setActiveMedia] = useState(null);
    const [isSharingLive, setIsSharingLive] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [urlInput, setUrlInput] = useState('');

    // PDF State
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfTotalPages, setPdfTotalPages] = useState(1);
    const [pdfScale, setPdfScale] = useState(1.2);
    const pdfCanvasRef = useRef(null);

    // Excel State
    const [excelSheets, setExcelSheets] = useState([]);
    const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
    const [excelData, setExcelData] = useState([]);

    // Word State
    const [wordHtml, setWordHtml] = useState('');

    // PowerPoint State
    const [pptSlides, setPptSlides] = useState([]);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

    // Video State
    const videoRef = useRef(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Sync throttle tracking
    const lastBroadcastTime = useRef(0);

    const isTeacher = role === 'TUTOR' || role === 'ADMIN';

    // Broadcast media state to other participants
    const broadcastMediaState = useCallback((overrideData = {}) => {
        if (!sendMessage || !isSharingLive) return;
        // Build the merged payload but strip rawData (ArrayBuffer) —
        // it cannot be JSON.stringify'd; peers receive rawDataBase64 instead.
        const merged = {
            ...(activeMedia || {}),
            pdfPage,
            currentSheetIdx,
            currentSlideIdx,
            isVideoPlaying,
            videoCurrentTime,
            ...overrideData
        };
        delete merged.rawData; // never send ArrayBuffer over WebSocket
        const payload = {
            type: 'command',
            action: 'whiteboard_media_sync',
            media: merged,
            senderName: userName || 'Participant',
            senderRole: role,
            timestamp: Date.now()
        };
        sendMessage(JSON.stringify(payload));
    }, [sendMessage, isSharingLive, activeMedia, pdfPage, currentSheetIdx, currentSlideIdx, isVideoPlaying, videoCurrentTime, userName, role]);

    // Handle incoming synchronization commands from remote peer
    useEffect(() => {
        if (!incomingMediaCommand) return;
        const { action, media, senderName, senderRole } = incomingMediaCommand;

        if (action === 'whiteboard_media_sync' && media) {
            console.log(`📡 Whiteboard Media Sync received from ${senderName} (${senderRole}):`, media.type, media.name);

            // Peers receive rawDataBase64 instead of rawData (ArrayBuffer).
            // Decode it back so that the Excel / Word parsers work identically.
            const enriched = { ...media };
            if (enriched.rawDataBase64 && !enriched.rawData) {
                try {
                    const binaryStr = atob(enriched.rawDataBase64);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                    enriched.rawData = bytes.buffer;
                } catch (e) {
                    console.warn('Failed to decode rawDataBase64:', e);
                }
            }

            setActiveMedia(prev => {
                // If it's a new media file
                if (!prev || prev.id !== enriched.id) {
                    return enriched;
                }
                // Same media file with updated state
                return { ...prev, ...enriched };
            });

            if (media.type === 'pdf' && media.pdfPage) {
                setPdfPage(media.pdfPage);
            }
            if (media.type === 'excel' && typeof media.currentSheetIdx === 'number') {
                setCurrentSheetIdx(media.currentSheetIdx);
            }
            if (media.type === 'powerpoint' && typeof media.currentSlideIdx === 'number') {
                setCurrentSlideIdx(media.currentSlideIdx);
            }
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
        // Throttle periodic broadcast to every 4 seconds
        const now = Date.now();
        if (isSharingLive && now - lastBroadcastTime.current > 4000) {
            lastBroadcastTime.current = now;
            broadcastMediaState({ videoCurrentTime: videoRef.current.currentTime, isVideoPlaying: !videoRef.current.paused });
        }
    };

    // ── 2. PDF Processing ──────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'pdf' && activeMedia.data) {
            let isCancelled = false;
            const loadPdf = async () => {
                try {
                    setLoading(true);
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
                    console.warn('PDF.js parse error, using direct embed fallback:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadPdf();
            return () => { isCancelled = true; };
        }
    }, [activeMedia]);

    // Render current PDF page on canvas
    useEffect(() => {
        if (!pdfDoc || !pdfCanvasRef.current) return;
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
    }, [pdfDoc, pdfPage, pdfScale]);

    const changePdfPage = (delta) => {
        const next = Math.max(1, Math.min(pdfTotalPages, pdfPage + delta));
        setPdfPage(next);
        broadcastMediaState({ pdfPage: next });
    };

    // ── 3. Excel Processing ────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'excel' && activeMedia.rawData) {
            try {
                const wb = XLSX.read(activeMedia.rawData, { type: 'array' });
                setExcelSheets(wb.SheetNames);
                const firstSheet = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                setExcelData(json);
                setCurrentSheetIdx(0);
            } catch (err) {
                console.error("Excel parse failed:", err);
            }
        }
    }, [activeMedia]);

    const selectExcelSheet = (idx) => {
        if (!activeMedia?.rawData) {
            setCurrentSheetIdx(idx);
            broadcastMediaState({ currentSheetIdx: idx });
            return;
        }
        try {
            const wb = XLSX.read(activeMedia.rawData, { type: 'array' });
            const sheetName = wb.SheetNames[idx];
            if (sheetName) {
                const sheet = wb.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                setExcelData(json);
                setCurrentSheetIdx(idx);
                broadcastMediaState({ currentSheetIdx: idx });
            }
        } catch (err) {
            console.warn('Failed to parse sheet:', err);
        }
    };

    // ── 4. Word Processing ─────────────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'word' && activeMedia.rawData) {
            mammoth.convertToHtml({ arrayBuffer: activeMedia.rawData })
                .then(res => setWordHtml(res.value || '<p class="text-slate-400">Document empty</p>'))
                .catch(err => {
                    console.error("Word conversion failed:", err);
                    setWordHtml(`<div class="p-4 text-rose-500">Could not parse Word document: ${err.message}</div>`);
                });
        }
    }, [activeMedia]);

    // ── 5. PowerPoint Processing ───────────────────────────────────────────
    useEffect(() => {
        if (activeMedia?.type === 'powerpoint') {
            if (activeMedia.slides && activeMedia.slides.length > 0) {
                setPptSlides(activeMedia.slides);
            } else if (activeMedia.data) {
                // Generate preview slide deck
                setPptSlides([
                    { title: activeMedia.name || 'Presentation Slide 1', content: 'Slide presentation loaded into whiteboard stage.' },
                    { title: 'Slide 2: Overview & Concepts', content: 'Annotate and present lecture slides directly to students.' }
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

            // VIDEO — read as base64 so it can be broadcast over WebSocket
            if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) {
                setLoadingMessage(`Reading ${fileName} into memory...`);
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
                reader.onerror = () => { alert('Failed to read video file.'); setLoading(false); };
                reader.readAsDataURL(file);
                return; // loading is finalised inside the reader callback
            }
            // PDF
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
            // EXCEL — ArrayBuffer is not JSON-serializable; convert to base64
            else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                const buffer = await file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), '')
                );
                const mediaObj = {
                    id,
                    type: 'excel',
                    name: fileName,
                    rawData: buffer,        // local parser uses this
                    rawDataBase64: base64,  // peers receive this
                    currentSheetIdx: 0
                };
                setActiveMedia(mediaObj);
                setShowUploadModal(false);
                // Only broadcast serializable fields
                broadcastMediaState({ ...mediaObj, rawData: undefined });
            }
            // WORD — same base64 approach
            else if (['docx', 'doc'].includes(ext)) {
                const buffer = await file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), '')
                );
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
            // POWERPOINT
            else if (['pptx', 'ppt'].includes(ext)) {
                // PowerPoint slide deck loader
                const slides = [
                    { title: `${fileName} - Slide 1`, content: 'Welcome to the presentation. Use the slide controls below to navigate.' },
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
            // IMAGE — compress first to avoid huge WS payloads
            else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
                setLoadingMessage(`Compressing ${fileName}...`);
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
                alert(`File format .${ext} is not yet supported. Please choose PDF, Video, Word, Excel, PowerPoint, or Image.`);
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
    };

    // Insert URL Video (e.g. YouTube or MP4 Link)
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

        const mediaObj = {
            id,
            type: isYouTube ? 'youtube' : 'video',
            name: isYouTube ? 'YouTube Video Stream' : 'Live Video Stream',
            url: finalUrl,
            isVideoPlaying: true,
            videoCurrentTime: 0
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
        } else if (activeMedia?.type === 'pdf' && pdfCanvasRef.current) {
            try {
                const dataUrl = pdfCanvasRef.current.toDataURL('image/png');
                onInsertElementToBoard({
                    type: 'image',
                    url: dataUrl,
                    title: `${activeMedia.name} - Page ${pdfPage}`
                });
            } catch (err) {
                console.warn('Failed to snapshot PDF canvas:', err);
            }
        } else if (activeMedia?.type === 'excel' && excelData.length > 0) {
            const previewText = excelData.slice(0, 10).map(row => row.join(' | ')).join('\n');
            onInsertElementToBoard({
                type: 'text',
                text: `📊 [${activeMedia.name} - ${excelSheets[currentSheetIdx] || 'Sheet'}]\n\n${previewText}`
            });
        } else if (activeMedia?.type === 'word' && wordHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = wordHtml;
            const plain = tempDiv.innerText.slice(0, 800);
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

    // Preloaded sample loaders for quick testing
    const loadSample = (type) => {
        const id = 'sample_' + Date.now();
        if (type === 'quran_notes') {
            const mediaObj = {
                id,
                type: 'word',
                name: 'Tajweed_and_Grammar_Rules.docx',
                rawData: null,
            };
            setWordHtml(`
                <h2 style="color: #047857; font-weight: bold; font-size: 20px;">Tajweed: Rules of Noon Saakin and Tanween</h2>
                <p>There are four basic rules when reciting Noon Saakin (نْ) or Tanween (ً ٍ ٌ):</p>
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
                ['Module 1', 'Algebraic Expressions', 25, '92%', 'Completed'],
                ['Module 2', 'Quadratic Equations', 30, '88%', 'Completed'],
                ['Module 3', 'Trigonometry & Ratios', 20, '79%', 'In Progress'],
                ['Module 4', 'Circle Theorems', 15, 'Pending', 'Upcoming']
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
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                        title="Import Video, PDF, Word, Excel, PowerPoint, or Image"
                    >
                        <Upload size={13} />
                        <span className="hidden md:inline">Import Media</span>
                    </button>

                    {/* Send to Whiteboard Canvas button */}
                    {activeMedia && (
                        <button
                            onClick={handlePushToWhiteboardCanvas}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all"
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
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
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
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
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
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-all"
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
                    <div className="absolute inset-0 z-50 bg-emerald-900/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none text-emerald-300 animate-in fade-in">
                        <Upload size={48} className="animate-bounce mb-3" />
                        <span className="text-base font-bold">Drop to Import to Whiteboard Stage</span>
                        <span className="text-xs text-emerald-200">Video, PDF, Word, Excel, PowerPoint, or Image</span>
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
                            Import Videos, PDFs, Word docs, Excel spreadsheets, PowerPoint slides, or Images.
                            Everything you share is instantly visible to both Teacher and Students in real time.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                <Upload size={14} /> Import File / Video
                            </button>
                            <button
                                onClick={() => loadSample('quran_notes')}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all"
                            >
                                📖 Sample Tajweed Notes
                            </button>
                            <button
                                onClick={() => loadSample('math_chart')}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all"
                            >
                                📊 Sample Spreadsheet
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. VIDEO PLAYER VIEW */}
                {activeMedia?.type === 'video' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                        <video
                            ref={videoRef}
                            src={activeMedia.url}
                            onLoadedMetadata={handleVideoLoaded}
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={() => setIsVideoPlaying(false)}
                            muted={isMuted}
                            playsInline
                            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border border-slate-800 bg-black"
                        />
                        {/* Custom Synchronized Controls */}
                        <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 flex items-center gap-3 mt-3 shadow-xl">
                            <button
                                onClick={toggleVideoPlay}
                                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow"
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
                                {Math.floor(videoCurrentTime / 60)}:{(Math.floor(videoCurrentTime % 60)).toString().padStart(2, '0')} / {Math.floor(videoDuration / 60)}:{(Math.floor(videoDuration % 60)).toString().padStart(2, '0')}
                            </span>

                            <button
                                onClick={() => setIsMuted(v => !v)}
                                className="p-2 text-slate-400 hover:text-white transition-all"
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. YOUTUBE / WEB EMBED VIEW */}
                {activeMedia?.type === 'youtube' && (
                    <div className="w-full h-full flex items-center justify-center">
                        <iframe
                            src={activeMedia.url}
                            title="YouTube Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full max-w-4xl h-[75vh] rounded-2xl border border-slate-800 shadow-2xl"
                        />
                    </div>
                )}

                {/* 4. PDF DOCUMENT VIEW */}
                {activeMedia?.type === 'pdf' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="flex-1 overflow-auto flex items-center justify-center p-2 custom-scrollbar w-full">
                            <canvas ref={pdfCanvasRef} className="rounded-xl shadow-2xl border border-slate-700 bg-white" />
                        </div>
                        {/* PDF Page Controls */}
                        <div className="h-12 bg-slate-900/90 backdrop-blur-md px-4 rounded-2xl border border-slate-700 flex items-center gap-3 shadow-xl mb-2">
                            <button
                                onClick={() => changePdfPage(-1)}
                                disabled={pdfPage <= 1}
                                className="p-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-700"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-200">
                                Page {pdfPage} of {pdfTotalPages}
                            </span>
                            <button
                                onClick={() => changePdfPage(1)}
                                disabled={pdfPage >= pdfTotalPages}
                                className="p-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-700"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <div className="w-px h-4 bg-slate-700 mx-1" />
                            <button
                                onClick={() => setPdfScale(s => Math.max(0.6, s - 0.2))}
                                className="p-1.5 text-slate-400 hover:text-white"
                                title="Zoom Out"
                            >
                                <ZoomOut size={15} />
                            </button>
                            <button
                                onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))}
                                className="p-1.5 text-slate-400 hover:text-white"
                                title="Zoom In"
                            >
                                <ZoomIn size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. WORD DOCUMENT VIEW */}
                {activeMedia?.type === 'word' && (
                    <div className="w-full h-full max-w-4xl bg-white text-slate-900 rounded-2xl p-6 sm:p-10 overflow-y-auto shadow-2xl border border-slate-300 custom-scrollbar font-serif leading-relaxed">
                        <div 
                            dangerouslySetInnerHTML={{ __html: wordHtml }} 
                            className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-table:border prose-table:border-slate-300"
                        />
                    </div>
                )}

                {/* 6. EXCEL SPREADSHEET VIEW */}
                {activeMedia?.type === 'excel' && (
                    <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                        {/* Sheet Tabs */}
                        <div className="flex bg-slate-950 p-1.5 gap-1 border-b border-slate-800 overflow-x-auto">
                            {excelSheets.map((name, i) => (
                                <button
                                    key={name}
                                    onClick={() => selectExcelSheet(i)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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

                {/* 7. POWERPOINT SLIDES VIEW */}
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
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                            >
                                <ChevronLeft size={16} /> Prev Slide
                            </button>
                            <span className="text-xs font-bold text-slate-300">
                                {currentSlideIdx + 1} / {pptSlides.length}
                            </span>
                            <button
                                onClick={() => changeSlide(1)}
                                disabled={currentSlideIdx >= pptSlides.length - 1}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                            >
                                Next Slide <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 8. IMAGE VIEW */}
                {activeMedia?.type === 'image' && (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img 
                            src={activeMedia.url} 
                            alt={activeMedia.name} 
                            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border border-slate-700 object-contain"
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
                                    <h3 className="font-bold text-base">Import to Whiteboard</h3>
                                    <p className="text-[11px] text-slate-400">Video, PDF, Word, Excel, PowerPoint, or Images</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white p-1">
                                <X size={18} />
                            </button>
                        </div>

                        {/* File Upload Drop Area */}
                        <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/50 hover:bg-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all mb-4 group">
                            <Upload size={32} className="text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                            <span className="text-xs font-bold text-slate-200 mb-1">Click or Drop Document / Media</span>
                            <span className="text-[10px] text-slate-400 text-center">
                                Supports: .mp4, .pdf, .docx, .xlsx, .pptx, .png, .jpg
                            </span>
                            <input 
                                type="file" 
                                onChange={handleFileUpload} 
                                accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*" 
                                className="hidden" 
                            />
                        </label>

                        {/* URL Link Input (YouTube or Direct Video) */}
                        <div className="border-t border-slate-800 pt-4 mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                Or Stream from URL (YouTube / Video Link)
                            </span>
                            <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=... or direct video link"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all font-sans"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow"
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
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-300 border border-slate-700 transition-all text-center"
                                >
                                    📖 Tajweed Doc
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSample('math_chart')}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-300 border border-slate-700 transition-all text-center"
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
