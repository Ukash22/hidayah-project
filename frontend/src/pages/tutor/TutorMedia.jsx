import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { uploadMultipleToCloudinary } from '../../services/cloudinaryService';
import { SkeletonCard } from '../../components/ui';

export default function TutorMedia() {
    const { token, user } = useAuth();
    const [tutorProfile, setTutorProfile] = useState(null);
    const [mediaFiles, setMediaFiles] = useState({ intro_video: null, short_recitation: null });
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        api.get(`/api/tutors/me/`)
            .then(res => setTutorProfile(res.data))
            .catch(err => console.error('Profile fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const handleUpload = async () => {
        setUploading(true);
        setUploadMsg('');
        try {
            const profileRes = await api.get(`/api/tutors/`);
            const myProfile = profileRes.data.find(t => t.user?.id === user?.id);
            if (!myProfile) throw new Error('Tutor profile not found');

            setUploading('Syncing with Cloudinary...');
            const uploadMap = { intro_video: 'tutor_videos', short_recitation: 'tutor_recitations' };
            const uploadedUrls = await uploadMultipleToCloudinary(mediaFiles, uploadMap);

            const payload = {};
            if (uploadedUrls.intro_video) payload.intro_video_url = uploadedUrls.intro_video;
            if (uploadedUrls.short_recitation) payload.short_recitation_url = uploadedUrls.short_recitation;

            await api.patch(
                `/api/tutors/${myProfile.id}/update_profile/`,
                payload,
                { headers: getAuthHeader() }
            );
            setMediaFiles({ intro_video: null, short_recitation: null });
            setUploadMsg('✅ Media assets synchronized with Cloudinary!');
        } catch (err) {
            setUploadMsg('❌ Process failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>My Media — Hidayah</title>
            <PageHeader title="Profile Media" description="Secure Cloudinary storage for your intro video and recitation." />

            {tutorProfile && (tutorProfile.video_url || tutorProfile.recitation_url) && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 mb-10">
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Currently Active Assets</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        {tutorProfile.video_url && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Intro Video</p>
                                {tutorProfile.video_type === 'youtube' ? (() => {
                                    const url = tutorProfile.video_url || '';
                                    const videoId = url.includes('youtu.be/')
                                        ? url.split('youtu.be/')[1]?.split('?')[0]
                                        : url.split('v=')[1]?.split('&')[0] || '';
                                    return (
                                        <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen className="w-full h-full" title="Intro Video"
                                            />
                                        </div>
                                    );
                                })() : (
                                    <video
                                        src={tutorProfile.video_url?.startsWith('http') ? tutorProfile.video_url : `${import.meta.env.VITE_API_BASE_URL}${tutorProfile.video_url}`}
                                        controls className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 shadow-lg"
                                    />
                                )}
                            </div>
                        )}
                        {tutorProfile.recitation_url && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold uppercase text-primary tracking-widest ml-1">Recitation Audio</p>
                                <div className="bg-primary-soft p-8 rounded-2xl border border-blue-100 flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl border border-blue-100">🎙️</div>
                                    <audio
                                        src={tutorProfile.recitation_url?.startsWith('http') ? tutorProfile.recitation_url : `${import.meta.env.VITE_API_BASE_URL}${tutorProfile.recitation_url}`}
                                        controls className="w-full h-10"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-10">
                <div className="bg-white dark:bg-slate-900 rounded-card-lg p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-primary-soft rounded-2xl flex items-center justify-center text-2xl border border-blue-100">🎥</div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Intro Video</h3>
                            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">MP4 / MOV • Max 100MB</p>
                        </div>
                    </div>
                    <label className="block">
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary/30 transition-all">
                            {mediaFiles.intro_video ? (
                                <div>
                                    <p className="text-primary font-bold text-sm mb-1">✓ {mediaFiles.intro_video.name}</p>
                                    <p className="text-slate-500 text-[9px] font-bold">{(mediaFiles.intro_video.size / 1024 / 1024).toFixed(1)} MB READY</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-slate-500 font-bold text-sm mb-1">Choose Workshop Video</p>
                                    <p className="text-slate-300 text-[11px] font-semibold uppercase tracking-wide">Select File</p>
                                </div>
                            )}
                        </div>
                        <input type="file" accept="video/*" className="hidden" onChange={e => setMediaFiles(f => ({ ...f, intro_video: e.target.files[0] }))} />
                    </label>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-card-lg p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl border border-indigo-100">🔊</div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Recitation Sample</h3>
                            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">MP3 / WAV • Max 30MB</p>
                        </div>
                    </div>
                    <label className="block">
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-500/30 transition-all">
                            {mediaFiles.short_recitation ? (
                                <div>
                                    <p className="text-indigo-600 font-bold text-sm mb-1">✓ {mediaFiles.short_recitation.name}</p>
                                    <p className="text-slate-500 text-[9px] font-bold">{(mediaFiles.short_recitation.size / 1024 / 1024).toFixed(1)} MB READY</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-slate-500 font-bold text-sm mb-1">Choose Audio Clip</p>
                                    <p className="text-slate-300 text-[11px] font-semibold uppercase tracking-wide">Select File</p>
                                </div>
                            )}
                        </div>
                        <input type="file" accept="audio/*" className="hidden" onChange={e => setMediaFiles(f => ({ ...f, short_recitation: e.target.files[0] }))} />
                    </label>
                </div>
            </div>

            {(mediaFiles.intro_video || mediaFiles.short_recitation) && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={handleUpload}
                        disabled={!!uploading}
                        className="bg-primary text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4"
                    >
                        {uploading ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> PROCESSING...</>
                        ) : '☁️ Sync with Cloudinary'}
                    </button>
                </div>
            )}

            {uploadMsg && (
                <p className={`text-center font-bold text-[10px] uppercase tracking-widest mt-6 ${uploadMsg.startsWith('✅') ? 'text-primary' : 'text-red-500'}`}>{uploadMsg}</p>
            )}
        </>
    );
}
