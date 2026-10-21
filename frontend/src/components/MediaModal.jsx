import { motion, AnimatePresence } from 'framer-motion';
import { X as IconX } from 'lucide-react';

const getYouTubeId = (url) => {
    if (!url) return null;
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
    try { return new URL(url).searchParams.get('v'); } catch { return null; }
};

export default function MediaModal({ media, onClose }) {
    if (!media) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 30 }}
                    className={`relative w-full ${media.type === 'audio' ? 'max-w-md bg-[#0f1117] rounded-card-lg p-6 md:p-12 text-center' : 'max-w-4xl aspect-video rounded-card overflow-hidden bg-black'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                    >
                        <IconX size={18} />
                    </button>

                    {media.type === 'video' && (
                        media.videoType === 'youtube' ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(media.url)}?autoplay=1&rel=0`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                                title={media.name}
                            />
                        ) : (
                            <video
                                src={media.url?.startsWith('http') ? media.url : `${import.meta.env.VITE_API_BASE_URL}${media.url}`}
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                            />
                        )
                    )}

                    {media.type === 'audio' && (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-card flex items-center justify-center text-4xl mx-auto mb-6 border border-emerald-500/20">🎙️</div>
                            <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide mb-2">Quran Recitation Sample</p>
                            <h3 className="text-2xl font-bold text-white mb-6">{media.name}</h3>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <audio
                                    src={media.url?.startsWith('http') ? media.url : `${import.meta.env.VITE_API_BASE_URL}${media.url}`}
                                    controls
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
