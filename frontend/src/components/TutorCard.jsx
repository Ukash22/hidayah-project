import { useState, lazy, Suspense, memo } from 'react';
import { Star as IconStar, ShieldCheck as IconShieldCheck, Calendar as IconCalendar, Play as IconPlay } from 'lucide-react';

const MediaModal = lazy(() => import('./MediaModal'));

function getImageSrc(tutor) {
    const img = tutor.image || tutor.image_url || tutor.profile_pic;
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${import.meta.env.VITE_API_BASE_URL}${img}`;
}

function fmt12h(t) {
    if (!t) return '';
    let [h, m] = t.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${(m || '00').slice(0, 2)} ${ampm}`;
}

const TutorCard = memo(function TutorCard({ tutor, onBook }) {
    const [mediaModal, setMediaModal] = useState(null);

    const imgSrc = getImageSrc(tutor);
    const hasVideo = !!(tutor.video_url || tutor.intro_video_url);
    const hasAudio = !!(tutor.recitation_url || tutor.short_recitation);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
            {/* Hero image */}
            <div className="relative h-52 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={tutor.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=0f766e&color=fff&size=400`;
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-emerald-500/20">
                        {tutor.full_name?.[0]?.toUpperCase()}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                {/* Media preview buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                    {hasVideo && (
                        <button
                            onClick={() => setMediaModal({ type: 'video', videoType: tutor.video_type, url: tutor.video_url || tutor.intro_video_url, name: tutor.full_name })}
                            className="w-9 h-9 bg-black/60 hover:bg-emerald-600 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md hover:scale-110"
                            title="Watch Intro Video"
                        >
                            <IconPlay size={13} fill="currentColor" />
                        </button>
                    )}
                    {hasAudio && (
                        <button
                            onClick={() => {
                                const url = tutor.recitation_url || tutor.short_recitation;
                                const isVideo = url && /\.(mp4|mov|avi|webm)$/i.test(url);
                                setMediaModal({ type: isVideo ? 'video' : 'audio', url, name: tutor.full_name });
                            }}
                            className="w-9 h-9 bg-black/60 hover:bg-amber-500 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md hover:scale-110"
                            title="Listen to Recitation"
                        >
                            🎙️
                        </button>
                    )}
                </div>

                {/* Name overlay */}
                <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="text-lg font-bold text-white leading-tight">{tutor.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                            <IconStar size={10} fill="currentColor" /> 4.9
                            <span className="text-slate-400 font-normal">(24)</span>
                        </div>
                        <span className="text-emerald-400 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1">
                            <IconShieldCheck size={10} /> Verified
                        </span>
                    </div>
                </div>
            </div>

            {/* Card body */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {tutor.subjects_to_teach?.split(',').map(s => (
                        <span key={s} className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            {s.trim()}
                        </span>
                    ))}
                </div>

                <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">{tutor.bio || 'No bio provided.'}</p>

                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Hourly Rate</p>
                        <p className="text-2xl font-bold text-slate-900">₦{tutor.hourly_rate?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Available</p>
                        <div className="flex flex-col gap-1 items-end">
                            {tutor.availabilities && tutor.availabilities.length > 0
                                ? tutor.availabilities.slice(0, 2).map((av, i) => (
                                    <div key={i} className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                        <IconCalendar size={9} className="text-emerald-600" />
                                        <span className="text-[10px] font-semibold text-emerald-700 uppercase">
                                            {av.day.slice(0, 3)}: {fmt12h(av.start_time)}-{fmt12h(av.end_time)}
                                        </span>
                                    </div>
                                ))
                                : tutor.availability_hours
                                    ? tutor.availability_hours.split(',').slice(0, 2).map((h, i) => (
                                        <span key={i} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 whitespace-nowrap">
                                            {h.trim()}
                                        </span>
                                    ))
                                    : <span className="text-[10px] text-slate-400">Not set</span>
                            }
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => onBook(tutor)}
                    className="mt-auto w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-md shadow-emerald-600/20 transition-all"
                >
                    Book This Tutor →
                </button>
            </div>

            {mediaModal && (
                <Suspense fallback={null}>
                    <MediaModal media={mediaModal} onClose={() => setMediaModal(null)} />
                </Suspense>
            )}
        </div>
    );
});

export default TutorCard;
