import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { asList } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';
import ClassCard from '../../components/ClassCard';
import { Users, RefreshCw } from 'lucide-react';

export default function StudentClasses() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [classes, setClasses] = useState([]);
    const [profile, setProfile] = useState(null);
    const [batches, setBatches] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [togglingRenew, setTogglingRenew] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoadError(false);
        try {
            const [classRes, profRes, bookRes] = await Promise.all([
                api.get(`/api/classes/sessions/`),
                api.get(`/api/students/me/`),
                api.get(`/api/classes/booking/request/`).catch(() => ({ data: [] })),
            ]);
            setClasses(Array.isArray(classRes.data) ? classRes.data : (classRes.data.results || classRes.data.classes || []));
            setProfile(profRes.data);
            setBookings(Array.isArray(bookRes.data) ? bookRes.data : (bookRes.data.results || []));
            api.get('/api/classes/batches/').then(r => setBatches(asList(r.data))).catch(() => {});
        } catch (err) {
            console.error('Classes fetch failed', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggleAutoRenew = async (bookingId) => {
        setTogglingRenew(p => ({ ...p, [bookingId]: true }));
        try {
            const res = await api.post(`/api/classes/booking/${bookingId}/toggle-auto-renew/`);
            toast.success(res.data.message || 'Auto-renewal setting updated!');
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, auto_renew: res.data.auto_renew } : b));
        } catch (err) {
            toast.error('Failed to update auto-renewal.');
        } finally {
            setTogglingRenew(p => ({ ...p, [bookingId]: false }));
        }
    };

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

    const isUnpaidLocked = profile?.payment_status === 'UNPAID' && parseFloat(profile?.wallet_balance || 0) <= 0;

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

            {/* Monthly Auto-Renewal Settings Card */}
            {bookings.filter(b => b.paid).length > 0 && (
                <div className="mb-8 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <RefreshCw size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    Monthly Class Auto-Renewal
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Seamless Learning</span>
                                </h3>
                                <p className="text-xs text-slate-400">Keep your classes active next month automatically without re-booking</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {bookings.filter(b => b.paid).map(b => (
                            <div key={b.id} className="bg-slate-850/80 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="font-bold text-white text-sm">{b.subject}</p>
                                    <p className="text-xs text-slate-400">with {b.tutor_name || 'Assigned Tutor'} · ₦{parseFloat(b.price || 0).toLocaleString()} / month</p>
                                    <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1.5">
                                        {b.auto_renew ? (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                <span>Auto-renew is ON. Platform will auto-renew next month from your wallet.</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                                <span className="text-slate-400">Auto-renew is OFF. Turn ON to lock in your tutor's slot for next month.</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleToggleAutoRenew(b.id)}
                                    disabled={!!togglingRenew[b.id]}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all flex items-center gap-2 ${
                                        b.auto_renew
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    }`}
                                >
                                    <RefreshCw size={13} className={togglingRenew[b.id] ? 'animate-spin' : ''} />
                                    <span>{b.auto_renew ? 'Auto-Renew: ON' : 'Enable Auto-Renew'}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {classes.length > 0 ? (
                    classes.map((cls, i) => (
                        <ClassCard
                            key={cls.db_id || i}
                            cls={cls}
                            token={token}
                            onJoin={handleJoinClass}
                            onRefetch={fetchData}
                        />
                    ))
                ) : (
                    <div className="py-32 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">
                            {isUnpaidLocked ? '🔒' : '📅'}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {isUnpaidLocked ? 'Access Locked' : 'No Classes Scheduled'}
                        </h4>
                        <p className="text-slate-500 font-bold italic max-w-md mx-auto">
                            {isUnpaidLocked
                                ? 'Please complete your payment or fund your wallet to access your live classes.'
                                : 'No classes are currently scheduled for you. When your tutor or admin schedules sessions, they will appear here.'}
                        </p>
                        {isUnpaidLocked ? (
                            <button onClick={() => navigate('/student/finance')} className="mt-8 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-lg">
                                Top Up Wallet
                            </button>
                        ) : (
                            <button onClick={() => navigate('/student/find-tutor')} className="mt-8 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-lg">
                                Browse Tutors & Subjects
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
