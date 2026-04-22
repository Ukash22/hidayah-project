import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const QuranMushaf = ({ token }) => {
    const [surahs, setSurahs] = useState([]);
    const [selectedSurah, setSelectedSurah] = useState(1);
    
    // Page state (1 to 604)
    const [currentPage, setCurrentPage] = useState(1);
    const [verses, setVerses] = useState([]);
    
    // Reciters list
    const [reciters, setReciters] = useState([
        { id: 7, name: 'Mishary Rashid Alafasy' },
        { id: 1, name: 'AbdulBaset AbdulSamad' },
        { id: 12, name: 'Mahmoud Khalil Al-Husary' },
        { id: 9, name: 'Mohamed Siddiq Al-Minshawi' },
        { id: 3, name: 'Abdur-Rahman as-Sudais' },
        { id: 10, name: 'Sa`ud ash-Shuraym' },
        { id: 11, name: 'Muhammad Ayyub' },
        { id: 4, name: 'Abu Bakr al-Shatri' },
        { id: 5, name: 'Hani ar-Rifai' }
    ]);
    const [selectedReciter, setSelectedReciter] = useState(7);
    
    // Translation state
    const [selectedTranslationId, setSelectedTranslationId] = useState(20); 
    const [showTranslation, setShowTranslation] = useState(false);
    const [availableLanguages] = useState([
        { id: 20, name: 'English', detail: 'Sahih International' },
        { id: 32, name: 'Hausa', detail: 'Abubakar Gumi' },
        { id: 125, name: 'Yoruba', detail: 'Shaykh Abu Rahimah' },
        { id: 31, name: 'French', detail: 'Hamidullah' },
        { id: 83, name: 'Spanish', detail: 'Sheikh Isa Garcia' },
        { id: 33, name: 'Indonesian', detail: 'Bahasa Indonesia' }
    ]);

    // Repetition state
    const [verseRepeatCount, setVerseRepeatCount] = useState(1);
    const [versesToPlay, setVersesToPlay] = useState(0); 
    const currentVerseLoopRef = useRef(1);
    const versesPlayedRef = useRef(1);

    // Audio playback state
    const [activeVerseKey, setActiveVerseKey] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const audioRef = useRef(new Audio());

    // Run once on mount to fetch all surahs
    useEffect(() => {
        const fetchSurahs = async () => {
            try {
                const res = await axios.get('https://api.quran.com/api/v4/chapters');
                setSurahs(res.data.chapters);
            } catch (err) {
                console.error("Failed to fetch surahs", err);
            }
        };
        fetchSurahs();
    }, []);

    // Fetch verses and translations when PAGE or LANGUAGE changes
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Unified endpoint returns both text and translations in one go
                const url = `https://api.quran.com/api/v4/verses/by_page/${currentPage}?translations=${selectedTranslationId}&fields=text_uthmani`;
                const res = await axios.get(url);
                setVerses(res.data.verses);
                
                // If the user flips the page, stop current audio
                audioRef.current.pause();
                setIsPlaying(false);
                setActiveVerseKey(null);
                
                // Sync Surah selector
                if(res.data.verses.length > 0) {
                    const firstVerseKey = res.data.verses[0].verse_key;
                    const chapterId = firstVerseKey.split(':')[0];
                    if(chapterId !== String(selectedSurah)) {
                        setSelectedSurah(Number(chapterId));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch page data", err);
            }
            setLoading(false);
        };
        fetchData();
    }, [currentPage, selectedTranslationId]);
    
    // Audio end event logic
    useEffect(() => {
        const handleAudioEnd = () => {
            setIsPlaying(false);
            if(activeVerseKey && verses.length > 0) {
                if (currentVerseLoopRef.current < verseRepeatCount) {
                    currentVerseLoopRef.current += 1;
                    playVerse(activeVerseKey, true); 
                    return;
                }

                if (versesToPlay > 0 && versesPlayedRef.current >= versesToPlay) {
                    return;
                }

                const currentIndex = verses.findIndex(v => v.verse_key === activeVerseKey);
                if (currentIndex >= 0 && currentIndex < verses.length - 1) {
                    const nextVerse = verses[currentIndex + 1].verse_key;
                    versesPlayedRef.current += 1;
                    currentVerseLoopRef.current = 1;
                    playVerse(nextVerse, true);
                }
            }
        };
        
        const audioEl = audioRef.current;
        audioEl.addEventListener('ended', handleAudioEnd);
        return () => audioEl.removeEventListener('ended', handleAudioEnd);
    }, [activeVerseKey, verses, verseRepeatCount, versesToPlay, selectedReciter]);

    const playVerse = async (verseKey, isInternal = false) => {
        try {
            if (!isInternal) {
                currentVerseLoopRef.current = 1;
                versesPlayedRef.current = 1;
            }

            setActiveVerseKey(verseKey);
            setIsPlaying(true);
            
            if (activeVerseKey === verseKey && isInternal && audioRef.current.src) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                return;
            }
            
            let finalAudioUrl = '';
            const res = await axios.get(`https://api.quran.com/api/v4/recitations/${selectedReciter}/by_ayah/${verseKey}`);
            
            if (res.data.audio_files && res.data.audio_files.length > 0) {
                let audioUrl = res.data.audio_files[0].url;
                if (audioUrl.startsWith('//')) {
                    finalAudioUrl = `https:${audioUrl}`;
                } else if (!audioUrl.startsWith('http')) {
                    finalAudioUrl = `https://verses.quran.com/${audioUrl}`;
                } else {
                    finalAudioUrl = audioUrl;
                }
                
                const audioEl = audioRef.current;
                audioEl.pause();
                audioEl.src = finalAudioUrl;
                audioEl.volume = 1.0;
                
                // .play() returns a promise in modern browsers, catching errors (like autoplay blocks)
                audioEl.play().catch(err => {
                    console.warn("Autoplay / Audio Error:", err);
                    setIsPlaying(false);
                });
            } else {
                setIsPlaying(false);
            }
        } catch (err) {
            console.error("Audio error", err);
            setIsPlaying(false);
        }
    };
    
    const pauseAudio = () => {
        audioRef.current.pause();
        setIsPlaying(false);
    };

    const handleSurahChange = (e) => {
        const surahId = Number(e.target.value);
        setSelectedSurah(surahId);
        const surahData = surahs.find(s => s.id === surahId);
        if (surahData && surahData.pages) {
            setCurrentPage(surahData.pages[0]);
        }
    };
    
    const nextPage = () => {
        if (currentPage < 604) setCurrentPage(currentPage + 1);
    };
    
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    return (
        <div className="bg-[#fdfbf7] rounded-[2.5rem] p-8 border border-amber-900/10 mb-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-amber-900/10 pb-6">
                <div>
                    <h3 className="text-2xl font-display text-amber-950 flex items-center gap-2">
                        <span className="text-3xl">📖</span> Quran Mushaf
                    </h3>
                    <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">
                        Click any verse to listen exactly
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Jump to Surah</label>
                        <select 
                            value={selectedSurah} 
                            onChange={handleSurahChange}
                            className="bg-white border-2 border-amber-900/10 rounded-xl px-4 py-2 text-sm font-bold text-amber-950 focus:border-amber-600 outline-none transition-all shadow-sm max-w-[150px]"
                        >
                            {surahs.map(s => (
                                <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Meaning</label>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setShowTranslation(!showTranslation)}
                                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm border-2 ${showTranslation ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-900/10 hover:bg-amber-50'}`}
                            >
                                {showTranslation ? 'ON' : 'OFF'}
                            </button>
                            {showTranslation && (
                                <select 
                                    value={selectedTranslationId} 
                                    onChange={(e) => setSelectedTranslationId(Number(e.target.value))}
                                    className="bg-white border-2 border-amber-900/10 rounded-xl px-2 py-2 text-sm font-bold text-amber-950 focus:border-amber-600 outline-none transition-all shadow-sm max-w-[150px]"
                                >
                                    {availableLanguages.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Reciter</label>
                        <select 
                            value={selectedReciter} 
                            onChange={(e) => {
                                setSelectedReciter(Number(e.target.value));
                                pauseAudio();
                            }}
                            className="bg-white border-2 border-amber-900/10 rounded-xl px-4 py-2 text-sm font-bold text-amber-950 focus:border-amber-600 outline-none transition-all shadow-sm max-w-[150px]"
                        >
                            {reciters.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Repeat</label>
                        <select 
                            value={verseRepeatCount} 
                            onChange={(e) => setVerseRepeatCount(Number(e.target.value))}
                            className="bg-white border-2 border-amber-900/10 rounded-xl px-4 py-2 text-sm font-bold text-amber-950 focus:border-amber-600 outline-none transition-all shadow-sm"
                        >
                            <option value={1}>1x</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x</option>
                            <option value={5}>5x</option>
                            <option value={10}>10x</option>
                            <option value={999}>Loop</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Range</label>
                        <select 
                            value={versesToPlay} 
                            onChange={(e) => setVersesToPlay(Number(e.target.value))}
                            className="bg-white border-2 border-amber-900/10 rounded-xl px-4 py-2 text-sm font-bold text-amber-950 focus:border-amber-600 outline-none transition-all shadow-sm"
                        >
                            <option value={0}>Page</option>
                            <option value={1}>1 Verse</option>
                            <option value={3}>3 Verses</option>
                            <option value={5}>5 Verses</option>
                            <option value={10}>10 Verses</option>
                        </select>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Audio</label>
                        <button 
                            onClick={() => {
                                if(isPlaying) pauseAudio();
                                else if(activeVerseKey) playVerse(activeVerseKey);
                                else if(verses.length > 0) playVerse(verses[0].verse_key);
                            }}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${isPlaying ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-200'}`}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-amber-900/10 rounded-xl text-amber-900 font-bold hover:bg-amber-50 disabled:opacity-50 transition-colors">
                    &laquo; Previous
                </button>
                <div className="px-6 py-2 bg-amber-900/5 rounded-xl text-amber-900 font-black">Page {currentPage} of 604</div>
                <button onClick={nextPage} disabled={currentPage === 604} className="px-4 py-2 bg-white border border-amber-900/10 rounded-xl text-amber-900 font-bold hover:bg-amber-50 disabled:opacity-50 transition-colors">
                    Next &raquo;
                </button>
            </div>

            <div className="bg-white rounded-[2rem] p-6 md:p-12 min-h-[600px] border border-amber-900/10 shadow-xl relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-black/5 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-black/5 to-transparent pointer-events-none"></div>
                
                {loading ? (
                    <div className="flex flex-col items-center gap-4 py-32">
                        <div className="w-16 h-16 border-4 border-amber-900/20 border-t-amber-900 rounded-full animate-spin"></div>
                        <div className="text-amber-800 font-black uppercase tracking-widest text-xs">Opening Hafs Mushaf...</div>
                    </div>
                ) : (
                    <div className="w-full text-center text-justify dir-rtl select-none mx-auto max-w-4xl" style={{ direction: 'rtl', textJustify: 'inter-word' }}>
                            {verses.map((v) => (
                                <div key={v.id} className="mb-10 text-center">
                                    <span 
                                        onClick={() => playVerse(v.verse_key)}
                                        className={`relative inline cursor-pointer transition-all duration-300 px-1 rounded-2xl
                                          ${activeVerseKey === v.verse_key ? 'text-amber-700 bg-amber-50/80 shadow-sm ring-1 ring-amber-200' : 'text-slate-900 hover:text-amber-600 hover:bg-amber-50/30'}
                                        `}
                                    >
                                        <span className="text-[32px] md:text-[44px] font-arabic leading-relaxed drop-shadow-sm">
                                            {v.text_uthmani}
                                        </span>
                                        <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-amber-900/10 text-[11px] md:text-[13px] font-black text-amber-800 mx-2 md:mx-3 align-middle bg-[#fdfbf7] shadow-inner font-sans">
                                            {v.verse_key.split(':')[1]}
                                        </span>
                                    </span>
                                    
                                    {showTranslation && v.translations && v.translations[0] && (
                                        <div 
                                            className="mt-4 text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-sans"
                                            style={{ direction: 'ltr' }}
                                            dangerouslySetInnerHTML={{ __html: v.translations[0].text }}
                                        />
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuranMushaf;
