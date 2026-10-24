import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';
import {
    Clock, Banknote, CheckCircle, AlertTriangle, User, BookOpen,
    RefreshCw, Timer, TrendingUp, Building2, CreditCard
} from 'lucide-react';

const fmt = (n) => `₦${parseFloat(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function DurationBadge({ scheduled, actual }) {
    if (!actual) return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <Timer size={10} /> {scheduled}m scheduled
        </span>
    );
    const diff = actual - scheduled;
    const color = diff < -5 ? 'rose' : diff > 5 ? 'blue' : 'emerald';
    const colorMap = {
        rose: 'bg-rose-50 text-rose-600 border-rose-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    };
    return (
        <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${colorMap[color]}`}>
                <Timer size={10} /> {actual}m actual
            </span>
            <span className="text-[9px] text-slate-400 font-medium">{scheduled}m scheduled</span>
        </div>
    );
}

function BankBadge({ bankName, accountNumber, accountName }) {
    if (!bankName) return (
        <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
            <AlertTriangle size={10} /> No bank details
        </span>
    );
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{bankName}</span>
            <span className="text-[10px] text-slate-500">{accountNumber}</span>
            <span className="text-[9px] text-slate-400 italic">{accountName}</span>
        </div>
    );
}

export default function AdminPendingPayouts() {
    const toast = useToast();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [releasing, setReleasing] = useState({});
    const [releasedIds, setReleasedIds] = useState(new Set());
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await api.get('/api/payments/admin/pending-payouts/');
            setSessions(res.data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch pending payouts', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRelease = async (session) => {
        if (releasing[session.session_id]) return;
        setReleasing(p => ({ ...p, [session.session_id]: true }));
        try {
            const res = await api.post(`/api/payments/admin/release-payout/${session.session_id}/`);
            toast.success(res.data.message || 'Payout released!');
            setReleasedIds(prev => new Set([...prev, session.session_id]));
            setSessions(prev => prev.filter(s => s.session_id !== session.session_id));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to release payout.');
        } finally {
            setReleasing(p => ({ ...p, [session.session_id]: false }));
        }
    };

    const filtered = sessions.filter(s => {
        const q = search.toLowerCase();
        return !q || s.tutor_name?.toLowerCase().includes(q) || s.student_name?.toLowerCase().includes(q) || s.subject?.toLowerCase().includes(q);
    });

    const totalPending = sessions.reduce((sum, s) => sum + s.net_payout, 0);
    const totalFees = sessions.reduce((sum, s) => sum + s.fee_amount, 0);
    const totalCommission = sessions.reduce((sum, s) => sum + s.commission_amount, 0);

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <FetchError message="Couldn't load pending payouts. Please retry." onRetry={() => { setLoadError(false); fetchData(); }} />
    );

    return (
        <>
            <title>Pending Payouts — Hidayah Admin</title>
            <PageHeader
                title="Pending Payouts"
                description="Review completed classes and release tutor wallet credits after verification."
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock size={14} className="text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sessions.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">sessions awaiting review</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Banknote size={14} className="text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Fees</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmt(totalFees)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">student deductions</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <TrendingUp size={14} className="text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Platform</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{fmt(totalCommission)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">commission earned</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                            <Banknote size={14} className="text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Net to Release</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{fmt(totalPending)}</p>
                    <p className="text-[10px] text-white/60 mt-0.5">to tutor wallets</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Search by tutor, student, or subject..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 transition-colors"
                />
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition-colors"
                >
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Sessions Table */}
            {filtered.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <CheckCircle size={48} className="text-emerald-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">All Clear!</h3>
                    <p className="text-sm text-slate-400">No sessions are pending payout review right now.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(session => (
                        <div
                            key={session.session_id}
                            className={`bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-hidden transition-all ${releasedIds.has(session.session_id) ? 'opacity-50' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
                        >
                            {/* Card Header */}
                            <div className="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-slate-50 dark:border-slate-800">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen size={16} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{session.subject}</p>
                                        <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1"><User size={10} className="text-indigo-400" /> <strong className="text-slate-700 dark:text-slate-300">{session.tutor_name}</strong> (Tutor)</span>
                                            <span className="flex items-center gap-1"><User size={10} className="text-emerald-400" /> {session.student_name} (Student)</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Completed: {fmtDate(session.completed_at)}</p>
                                    </div>
                                </div>
                                <DurationBadge scheduled={session.scheduled_duration_minutes} actual={session.actual_duration_minutes} />
                            </div>

                            {/* Financial Breakdown + Bank Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-0 divide-x divide-slate-50 dark:divide-slate-800">
                                <div className="p-4 flex flex-col gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Session Fee</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(session.fee_amount)}</span>
                                    <span className="text-[9px] text-slate-400">debited from student</span>
                                </div>
                                <div className="p-4 flex flex-col gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Commission</span>
                                    <span className="text-sm font-bold text-amber-600">{fmt(session.commission_amount)}</span>
                                    <span className="text-[9px] text-amber-400">{session.commission_rate}% platform fee</span>
                                </div>
                                <div className="p-4 flex flex-col gap-1 bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Net to Tutor</span>
                                    <span className="text-base font-bold text-emerald-700">{fmt(session.net_payout)}</span>
                                    <span className="text-[9px] text-emerald-500">after commission</span>
                                </div>
                                <div className="p-4 flex flex-col gap-1 col-span-2 sm:col-span-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                        <Building2 size={9} /> Bank Details
                                    </span>
                                    <BankBadge
                                        bankName={session.tutor_bank_name}
                                        accountNumber={session.tutor_account_number}
                                        accountName={session.tutor_account_name}
                                    />
                                </div>

                                {/* Action */}
                                <div className="p-4 flex items-center justify-center">
                                    <button
                                        id={`release-payout-${session.session_id}`}
                                        onClick={() => handleRelease(session)}
                                        disabled={!!releasing[session.session_id] || releasedIds.has(session.session_id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30"
                                    >
                                        {releasing[session.session_id] ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <CreditCard size={12} />
                                        )}
                                        Release Payout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
