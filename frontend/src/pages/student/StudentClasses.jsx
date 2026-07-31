import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { asList } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';
import ClassCard from '../../components/ClassCard';
import { Users } from 'lucide-react';

export default function StudentClasses() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [classes, setClasses] = useState([]);
    const [profile, setProfile] = useState(null);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoadError(false);
        try {
            const [classRes, profRes] = await Promise.all([
                api.get(`/api/classes/sessions/`),
                api.get(`/api/students/me/`),
            ]);
            setClasses(Array.isArray(classRes.data) ? classRes.data : (classRes.data.results || classRes.data.classes || []));
            setProfile(profRes.data);
            api.get('/api/classes/batches/').then(r => setBatches(asList(r.data))).catch(() => {});
        } catch (err) {
            console.error('Classes fetch failed', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleJoinClass = useCallback(async (cls) => {
        const sessionId = cls.db_id || cls.id;
        if (!sessionId) { toast.error('Invalid session ID'); return; }
        api.post(`/api/classes/session/${sessionId}/start/`, {})
            .catch(e => { if (!axios.isCancel(e)) console.warn('Join notify failed:', e.message); });
        navigate(`/live/${sessionId}`);
    }, [getAuthHeader, navigate, toast]);

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <>
            <PageHeader title="Live Learning Sessions" description="Your upcoming and scheduled class sessions." />
            <FetchError message="Couldn't load your classes. Please check your connection." onRetry={() => { setLoading(true); fetchData(); }} />
        </>
    );

    return (
        <>
            <title>My Classes — Hidayah</title>
            <PageHeader title="Live Learning Sessions" description="Your upcoming and scheduled class sessions." />

            {batches.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-emerald-600" /> My Study Groups
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {batches.map(batch => (
                            <div key={batch.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Users size={16} className="text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{batch.name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{batch.subject_name || 'All subjects'}</p>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">Tutor:</span> {batch.tutor_name}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">{batch.student_count} member{batch.student_count !== 1 ? 's' : ''} in this group</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {classes.length > 0 ? classes.map((cls, i) => (
                    <ClassCard
                        key={cls.db_id || i}
                        cls={cls}
                        token={token}
                        onJoin={handleJoinClass}
                        onRefetch={fetchData}
                    />
                )) : (
                    <div className="py-32 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">
                            {profile?.wallet_balance <= 0 ? '🔒' : '📅'}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{profile?.wallet_balance <= 0 ? 'Access Locked' : 'No Classes Scheduled'}</h4>
                        <p className="text-slate-500 font-bold italic max-w-md mx-auto">
                            {profile?.wallet_balance <= 0
                                ? 'Please fund your wallet to access your live classes.'
                                : 'No classes are currently scheduled. Check back later.'}
                        </p>
                        {profile?.wallet_balance <= 0 && (
                            <button onClick={() => navigate('/student/finance')} className="mt-8 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-lg">
                                Top Up Wallet
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
