import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function TutorProfilePage() {
    const { token } = useAuth();
    const toast = useToast();
    const [tutorProfile, setTutorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [slots, setSlots] = useState([{ day: 'MONDAY', start_time: '09:00', end_time: '11:00' }]);
    const [savingSlots, setSavingSlots] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        api.get(`/api/tutors/me/`)
            .then(res => {
                setTutorProfile(res.data);
                if (res.data.availabilities?.length) {
                    setSlots(res.data.availabilities.map(a => ({
                        day: a.day, start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5),
                    })));
                }
            })
            .catch(err => console.error('Profile fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const addSlot = () => setSlots(prev => [...prev, { day: 'MONDAY', start_time: '09:00', end_time: '11:00' }]);
    const removeSlot = (idx) => setSlots(prev => prev.filter((_, i) => i !== idx));
    const updateSlot = (idx, field, value) => setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

    const saveSlots = async () => {
        setSavingSlots(true);
        try {
            const res = await api.put('/api/tutors/me/availability/', { slots });
            toast.success('Availability updated.');
            setTutorProfile(p => ({ ...p, availabilities: res.data.availabilities }));
        } catch (err) {
            toast.error(getApiError(err, 'Could not update availability.'));
        } finally {
            setSavingSlots(false);
        }
    };

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
                <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm p-10">
                    <form className="space-y-10" onSubmit={handleSubmit}>
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Full Legal Name (Verified)</label>
                                <input type="text" readOnly value={tutorProfile.full_name} className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold outline-none cursor-not-allowed" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-primary ml-1">Hourly Tuition Rate (₦)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={tutorProfile.hourly_rate}
                                        onChange={e => setTutorProfile({ ...tutorProfile, hourly_rate: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-primary/50 outline-none transition-all font-bold text-slate-900 dark:text-slate-100 text-lg shadow-sm"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-[11px] uppercase">Per Hour</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-600 ml-1">Live Class Link (Zoom/Internal)</label>
                                <input
                                    type="url"
                                    value={tutorProfile.live_class_link || ''}
                                    onChange={e => setTutorProfile({ ...tutorProfile, live_class_link: e.target.value })}
                                    placeholder="https://meet.jit.si/MyClass"
                                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-indigo-500/50 outline-none transition-all font-bold text-indigo-600 text-xs"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-amber-600 ml-1">Trial Class Link</label>
                                <input
                                    type="url"
                                    value={tutorProfile.trial_class_link || ''}
                                    onChange={e => setTutorProfile({ ...tutorProfile, trial_class_link: e.target.value })}
                                    placeholder="https://meet.jit.si/Trial"
                                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-amber-500/50 outline-none transition-all font-bold text-amber-600 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Professional Bio / Intro</label>
                            <textarea
                                rows="5"
                                value={tutorProfile.bio || ''}
                                onChange={e => setTutorProfile({ ...tutorProfile, bio: e.target.value })}
                                className="w-full px-6 py-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-primary/30 outline-none transition-all font-medium text-slate-700 dark:text-slate-300 leading-relaxed"
                                placeholder="Introduce yourself to prospective students..."
                            />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-card border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                    Verified Subjects
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {tutorProfile.subjects_to_teach?.split(',').map(s => (
                                        <span key={s} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] font-semibold uppercase text-indigo-600 shadow-sm">{s.trim()}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-primary-soft dark:bg-slate-800/60 p-8 rounded-card border border-blue-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                                        Availability Slots
                                    </h4>
                                    <button type="button" onClick={addSlot} className="text-[11px] font-semibold uppercase tracking-wide text-primary hover:text-primary-dark">
                                        + Add Slot
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {slots.map((slot, idx) => (
                                        <div key={idx} className="flex flex-wrap items-center gap-2">
                                            <select
                                                aria-label="Day"
                                                value={slot.day}
                                                onChange={e => updateSlot(idx, 'day', e.target.value)}
                                                className="flex-1 min-w-[110px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                                            >
                                                {DAYS.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                                            </select>
                                            <input aria-label="Start time" type="time" value={slot.start_time}
                                                onChange={e => updateSlot(idx, 'start_time', e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                                            <input aria-label="End time" type="time" value={slot.end_time}
                                                onChange={e => updateSlot(idx, 'end_time', e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                                            {slots.length > 1 && (
                                                <button type="button" aria-label="Remove slot" onClick={() => removeSlot(idx)} className="text-slate-400 hover:text-red-500 px-2 text-lg leading-none">×</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={saveSlots}
                                    disabled={savingSlots}
                                    className="mt-5 w-full bg-primary/10 hover:bg-primary hover:text-white text-primary py-3 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all disabled:opacity-50"
                                >
                                    {savingSlots ? 'Saving…' : 'Save Availability'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={updating}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
