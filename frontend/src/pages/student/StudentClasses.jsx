import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';
import ClassCard from '../../components/ClassCard';

export default function StudentClasses() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [classes, setClasses] = useState([]);
    const [profile, setProfile] = useState(null);
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
                    <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8 animate-pulse">
                            {profile?.wallet_balance <= 0 ? '🔒' : '📅'}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">{profile?.wallet_balance <= 0 ? 'Access Locked' : 'No Classes Scheduled'}</h4>
                        <p className="text-slate-500 font-bold italic max-w-md mx-auto">
                            {profile?.wallet_balance <= 0
                                ? 'Please fund your wallet to access your live classes.'
                                : 'No classes are currently scheduled. Check back later.'}
                        </p>
                        {profile?.wallet_balance <= 0 && (
                            <button onClick={() => navigate('/student/finance')} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">
                                Top Up Wallet
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
