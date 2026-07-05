import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function TutorProfilePage() {
    const { token } = useAuth();
    const toast = useToast();
    const [tutorProfile, setTutorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        api.get(`/api/tutors/me/`)
            .then(res => setTutorProfile(res.data))
            .catch(err => console.error('Profile fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const payload = {
                bio: tutorProfile.bio,
                hourly_rate: tutorProfile.hourly_rate,
                live_class_link: tutorProfile.live_class_link,
                trial_class_link: tutorProfile.trial_class_link,
            };
            await api.patch(`/api/tutors/${tutorProfile.id}/update_profile/`, payload, {
                headers: getAuthHeader()
            });
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error('Failed to update profile: ' + (err.response?.data?.error || err.message));
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (!tutorProfile) return null;

    return (
        <>
            <title>Profile Settings — Hidayah</title>
            <PageHeader title="Professional Identity" description="Manage your teacher profile and earning settings." />

            <div className="max-w-4xl space-y-12">
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
                    <form className="space-y-10" onSubmit={handleSubmit}>
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Legal Name (Verified)</label>
                                <input type="text" readOnly value={tutorProfile.full_name} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 font-bold outline-none cursor-not-allowed" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 ml-1">Hourly Tuition Rate (₦)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={tutorProfile.hourly_rate}
                                        onChange={e => setTutorProfile({ ...tutorProfile, hourly_rate: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-white focus:border-blue-600/50 outline-none transition-all font-black text-slate-900 text-lg shadow-sm"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px] uppercase">Per Hour</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 ml-1">Live Class Link (Zoom/Internal)</label>
                                <input
                                    type="url"
                                    value={tutorProfile.live_class_link || ''}
                                    onChange={e => setTutorProfile({ ...tutorProfile, live_class_link: e.target.value })}
                                    placeholder="https://meet.jit.si/MyClass"
                                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-white focus:border-indigo-500/50 outline-none transition-all font-bold text-indigo-600 text-xs"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 ml-1">Trial Class Link</label>
                                <input
                                    type="url"
                                    value={tutorProfile.trial_class_link || ''}
                                    onChange={e => setTutorProfile({ ...tutorProfile, trial_class_link: e.target.value })}
                                    placeholder="https://meet.jit.si/Trial"
                                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-white focus:border-amber-500/50 outline-none transition-all font-bold text-amber-600 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Professional Bio / Intro</label>
                            <textarea
                                rows="5"
                                value={tutorProfile.bio || ''}
                                onChange={e => setTutorProfile({ ...tutorProfile, bio: e.target.value })}
                                className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-white focus:border-blue-600/30 outline-none transition-all font-medium text-slate-700 leading-relaxed"
                                placeholder="Introduce yourself to prospective students..."
                            />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                    Verified Subjects
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {tutorProfile.subjects_to_teach?.split(',').map(s => (
                                        <span key={s} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-black uppercase text-indigo-600 shadow-sm">{s.trim()}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></span>
                                    Instructional Slots
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {tutorProfile.availabilities && tutorProfile.availabilities.length > 0 ? (
                                        tutorProfile.availabilities.map((slot, idx) => (
                                            <div key={idx} className="bg-white px-4 py-3 rounded-xl border border-slate-100 flex flex-col items-center">
                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight mb-1">{slot.day}</span>
                                                <span className="text-[10px] font-bold text-slate-900 whitespace-nowrap">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Default availability active.</p>
                                    )}
                                </div>
                                <p className="mt-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Contact Admins to update slots</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={updating}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-600/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {updating ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                            ) : 'Save Changes →'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
