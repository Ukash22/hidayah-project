import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import TutorWallet from '../../components/TutorWallet';

export default function TutorWalletPage() {
    const { token } = useAuth();
    const [financials, setFinancials] = useState(null);
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/tutor/financials/`, { headers: getAuthHeader() })
            .then(res => setFinancials(res.data))
            .catch(err => console.error('Financials fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Wallet — Hidayah</title>
            <PageHeader title="My Wallet" description="Earnings, commissions, and withdrawal history." />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Gross Earnings</span>
                    <div className="text-xl font-black text-slate-900">₦{parseFloat(financials?.gross_earnings || 0).toLocaleString()}</div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Before commission</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-600">Net Taken</span>
                    <div className="text-xl font-black text-blue-700">₦{parseFloat(financials?.net_earnings || 0).toLocaleString()}</div>
                    <p className="text-[8px] font-bold text-blue-400 uppercase mt-1 italic">Your actual share</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600">Commission</span>
                    <div className="text-xl font-black text-amber-700">₦{parseFloat(financials?.total_commission || 0).toLocaleString()}</div>
                    <p className="text-[8px] font-bold text-amber-400 uppercase mt-1 italic">Platform support fee</p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600">Completed</span>
                    <div className="text-xl font-black text-indigo-700">{financials?.completed_classes || 0} / {financials?.total_classes || 0}</div>
                    <p className="text-[8px] font-bold text-indigo-400 uppercase mt-1 italic">Delivered classes</p>
                </div>
            </div>

            <TutorWallet token={token} />
        </>
    );
}
