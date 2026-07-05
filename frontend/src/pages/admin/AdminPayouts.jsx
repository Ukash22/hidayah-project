import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonTable } from '../../components/ui';

export default function AdminPayouts() {
    const toast = useToast();
    const confirm = useConfirm();
    const [pendingPayouts, setPendingPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPayouts = useCallback(async () => {
        try {
            const res = await api.get('/api/admin/classes/pending-payouts/');
            setPendingPayouts(asList(res.data));
        } catch (err) {
            console.error('Payouts fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

    const handleRelease = async (sessionId) => {
        if (!await confirm("Release this payout to the tutor's wallet?", { confirmLabel: 'Release Funds' })) return;
        try {
            await api.post(`/api/admin/classes/${sessionId}/release-payout/`, {});
            toast.success('Payout released successfully!');
            fetchPayouts();
        } catch (err) {
            toast.error('Failed to release payout: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Payouts — Hidayah Admin</title>
            <PageHeader title="Escrow Payouts" description="Release pending session fees to tutors after completion." />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled At</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parties</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee Breakdown</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {pendingPayouts.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No pending payouts at the moment.</td></tr>
                            ) : pendingPayouts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="text-xs font-bold text-slate-700">{new Date(p.scheduled_at).toLocaleDateString()}</div>
                                        <div className="text-[9px] text-slate-500">{new Date(p.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">Student: {p.student_name}</div>
                                        <div className="text-[10px] text-primary font-black uppercase">Tutor: {p.tutor_name}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] text-slate-600 font-medium">Session Fee: ₦{parseFloat(p.fee_amount).toLocaleString()}</div>
                                        <div className="text-[9px] text-emerald-600 font-black uppercase">Tutor Share: ₦{(parseFloat(p.fee_amount) - parseFloat(p.commission_amount)).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pending Review</span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => handleRelease(p.id)}
                                            className="px-3 py-1 bg-emerald-600 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-emerald-700 transition-all"
                                        >
                                            🚀 Release Funds
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
