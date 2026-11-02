import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import TutorWallet from '../../components/TutorWallet';
import { SkeletonCard, FetchError } from '../../components/ui';

export default function TutorWalletPage() {
    const { token } = useAuth();
    const [financials, setFinancials] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchData = useCallback(() => {
        if (!token) return;
        api.get(`/api/payments/tutor/financials/`)
            .then(res => { setFinancials(res.data); setLoadError(false); })
            .catch(err => { console.error('Financials fetch failed', err); setLoadError(true); })
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <>
            <PageHeader title="My Wallet" description="Earnings, commissions, and withdrawal history." />
            <FetchError message="Couldn't load your wallet. Your earnings are safe — please retry." onRetry={() => { setLoadError(false); setLoading(true); fetchData(); }} />
        </>
    );

    return (
        <>
            <title>Wallet — Hidayah</title>
            <PageHeader title="My Wallet" description="Earnings, commissions, and withdrawal history." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-gradient-to-br from-primary to-indigo-900 border border-blue-500/30 rounded-card-lg p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <h3 className="text-[11px] font-semibold text-white/70 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                            Available Balance
                        </h3>
                        <p className="text-3xl md:text-5xl font-bold text-white tracking-tight">₦{parseFloat(financials?.wallet_balance || 0).toLocaleString()}</p>
                        <p className="text-[11px] font-semibold text-white/50 uppercase mt-3 italic">Your withdrawable earnings</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1">
                        <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">Completed</span>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{financials?.completed_classes || 0} / {financials?.total_classes || 0}</div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase mt-1 italic">Delivered classes</p>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-card border border-amber-100 flex flex-col gap-1 shadow-sm">
                        <span className="text-[11px] uppercase font-semibold tracking-wide text-amber-600">Pending Review</span>
                        <div className="text-xl font-bold text-amber-700">₦{parseFloat(financials?.pending_payouts_total || 0).toLocaleString()}</div>
                        <p className="text-[11px] font-semibold text-amber-400 uppercase mt-1 italic">Awaiting admin release</p>
                    </div>
                </div>
            </div>


            {/* Pending Admin Review Section */}
            {financials?.pending_payouts?.length > 0 && (
                <div className="mb-10 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/40 rounded-card-lg p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/60 dark:border-amber-900/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/30">
                                ⏳
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                                    ₦{parseFloat(financials.pending_payouts_total || 0).toLocaleString()} Pending Admin Release
                                </h3>
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {financials.pending_payouts.length} completed session{financials.pending_payouts.length > 1 ? 's' : ''} currently under administrative duration review before wallet crediting.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 self-start md:self-auto">
                            Awaiting Admin Review
                        </span>
                    </div>

                    <div className="mt-4 divide-y divide-amber-100 dark:divide-amber-900/20">
                        {financials.pending_payouts.map(s => (
                            <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.student_name}</span>
                                    <span className="text-slate-400 mx-2">·</span>
                                    <span className="text-primary font-semibold">{s.subject_name}</span>
                                    <span className="text-slate-400 mx-2">·</span>
                                    <span className="text-slate-500 font-medium">
                                        {s.actual_duration_minutes ? `${s.actual_duration_minutes}m actual` : `${s.scheduled_duration_minutes || 60}m scheduled`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 font-semibold">
                                    <span className="text-slate-500">Gross: ₦{parseFloat(s.fee_amount).toLocaleString()}</span>
                                    <span className="text-emerald-600 font-bold">Net: ₦{parseFloat(s.net_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <TutorWallet token={token} />
        </>
    );
}
