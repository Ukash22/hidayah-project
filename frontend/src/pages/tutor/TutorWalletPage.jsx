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

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(() => {
        if (!token) return;
        api.get(`/api/payments/tutor/financials/`)
            .then(res => { setFinancials(res.data); setLoadError(false); })
            .catch(err => { console.error('Financials fetch failed', err); setLoadError(true); })
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Gross Earnings</span>
                    <div className="text-xl font-black text-slate-900">₦{parseFloat(financials?.gross_earnings || 0).toLocaleString()}</div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 italic">Before commission</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-600">Net Taken</span>
                    <div className="text-xl font-black text-blue-700">₦{parseFloat(financials?.net_earnings || 0).toLocaleString()}</div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase mt-1 italic">Your actual share</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600">Commission</span>
                    <div className="text-xl font-black text-amber-700">₦{parseFloat(financials?.total_commission || 0).toLocaleString()}</div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase mt-1 italic">Platform support fee</p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600">Completed</span>
                    <div className="text-xl font-black text-indigo-700">{financials?.completed_classes || 0} / {financials?.total_classes || 0}</div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1 italic">Delivered classes</p>
                </div>
            </div>

            <TutorWallet token={token} />
        </>
    );
}
