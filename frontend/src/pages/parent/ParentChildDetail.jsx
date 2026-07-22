import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Wallet, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

function FundWalletModal({ isOpen, onClose, childName, childId, onSuccess }) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/api/parents/dashboard/fund_child_wallet/', {
                child_id: childId,
                amount: parseFloat(amount),
            });
            toast.success(res.data.message || 'Wallet funded successfully.');
            setAmount('');
            onClose();
            onSuccess();
        } catch (err) {
            toast.error(getApiError(err, 'Failed to fund wallet.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-card-lg w-full max-w-sm p-8 border border-slate-100 dark:border-slate-800 shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Fund Wallet</h3>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-6">
                    Add funds to {childName}'s account
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="fund_amount" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">
                            Amount (₦)
                        </label>
                        <input
                            id="fund_amount"
                            type="number"
                            min="100"
                            step="100"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-lg outline-none focus:border-primary/50 transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                            ) : `Add ₦${parseFloat(amount || 0).toLocaleString()}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const STATUS_CONFIG = {
    COMPLETED: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    PENDING:   { icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10' },
    CANCELLED: { icon: XCircle,      color: 'text-rose-500',    bg: 'bg-rose-500/10' },
    RESCHEDULED: { icon: AlertCircle, color: 'text-blue-500',   bg: 'bg-blue-500/10' },
};

function SessionRow({ s }) {
    const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    return (
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <td className="px-5 py-4">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{s.subject}</div>
                {s.is_trial && <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Trial</span>}
            </td>
            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{s.tutor}</td>
            <td className="px-5 py-4 text-[11px] font-semibold text-slate-500">
                {new Date(s.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                <div className="text-slate-400">{new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </td>
            <td className="px-5 py-4 text-[11px] font-semibold text-slate-500">{s.duration} min</td>
            <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
                    <Icon size={11} /> {s.status}
                </span>
            </td>
        </tr>
    );
}

function TxRow({ t }) {
    const isDebit = ['SESSION_DEBIT', 'WITHDRAWAL', 'COMMISSION'].includes(t.transaction_type);
    return (
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <td className="px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {t.transaction_type.replace(/_/g, ' ')}
            </td>
            <td className={`px-5 py-4 font-bold text-sm ${isDebit ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isDebit ? '−' : '+'}₦{t.amount.toLocaleString()}
            </td>
            <td className="px-5 py-4 text-[11px] text-slate-500 max-w-[180px] truncate">{t.description}</td>
            <td className="px-5 py-4 text-[11px] font-semibold text-slate-400">
                {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </td>
        </tr>
    );
}

export default function ParentChildDetail() {
    const { childId } = useParams();
    const toast = useToast();
    const [child, setChild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [fundOpen, setFundOpen] = useState(false);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await api.get(`/api/parents/dashboard/child_detail/?child_id=${childId}`);
            setChild(res.data);
        } catch (err) {
            console.error('Failed to fetch child detail', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    if (loading) return (
        <div className="space-y-4">
            <SkeletonCard />
            <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
        </div>
    );

    if (loadError) return (
        <>
            <Link to="/parent/overview" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary mb-4">
                <ArrowLeft size={16} /> Back to Children
            </Link>
            <FetchError message="Couldn't load child details." onRetry={fetchDetail} />
        </>
    );

    const sessions = asList(child?.sessions);
    const transactions = asList(child?.transactions);
    const upcomingSessions = sessions.filter(s => s.status === 'PENDING');
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');

    return (
        <>
            <title>{child?.full_name} — Hidayah</title>

            <Link to="/parent/overview" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary mb-4 transition-colors">
                <ArrowLeft size={16} /> Back to Children
            </Link>

            <PageHeader
                title={child?.full_name}
                description={`${child?.enrolled_course || 'Course TBA'} · ${(child?.class_type || '').replace('_', ' ')}`}
            />

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">Payment</span>
                    <span className={`text-sm font-bold ${child?.payment_status === 'PAID' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {child?.payment_status}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">Status</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                        {child?.approval_status?.toLowerCase() || 'pending'}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">Upcoming</span>
                    <span className="text-xl font-bold text-primary">{upcomingSessions.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">Completed</span>
                    <span className="text-xl font-bold text-emerald-600">{completedSessions.length}</span>
                </div>
            </div>

            {/* Wallet card */}
            <div className="bg-gradient-to-br from-primary to-indigo-900 rounded-card-lg p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Wallet size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-0.5">Wallet Balance</p>
                            <p className="text-3xl font-bold text-white">₦{(child?.wallet_balance || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFundOpen(true)}
                        className="flex items-center gap-2 bg-white dark:bg-slate-100 text-primary px-5 py-3 rounded-xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> Add Funds
                    </button>
                </div>
            </div>

            {/* Sessions table */}
            <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm mb-8 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <span className="w-1.5 h-5 bg-primary rounded-full" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sessions</h3>
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last 15</span>
                </div>
                {sessions.length === 0 ? (
                    <div className="py-14 text-center text-slate-500 font-semibold text-sm">
                        <Calendar size={32} className="mx-auto mb-3 text-slate-300" />
                        No sessions yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60">
                                <tr>
                                    {['Subject', 'Tutor', 'Date & Time', 'Duration', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => <SessionRow key={s.id} s={s} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Transactions table */}
            <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Wallet Transactions</h3>
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last 15</span>
                </div>
                {transactions.length === 0 ? (
                    <div className="py-14 text-center text-slate-500 font-semibold text-sm">
                        <Wallet size={32} className="mx-auto mb-3 text-slate-300" />
                        No transactions yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60">
                                <tr>
                                    {['Type', 'Amount', 'Description', 'Date'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => <TxRow key={t.id} t={t} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <FundWalletModal
                isOpen={fundOpen}
                onClose={() => setFundOpen(false)}
                childName={child?.full_name}
                childId={childId}
                onSuccess={() => fetchDetail()}
            />
        </>
    );
}
