import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import { StatusBadge } from './adminHelpers';

export default function AdminWithdrawals() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWithdrawals = useCallback(async () => {
        try {
            const res = await api.get('/api/payments/admin/withdrawals/pending/');
            setWithdrawals(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Withdrawals fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this withdrawal? Funds will be deducted from the tutor\'s wallet.')) return;
        try {
            await api.post(`/api/payments/admin/withdrawal/approve/${id}/`, {});
            alert('Withdrawal approved successfully!');
            fetchWithdrawals();
        } catch (err) {
            alert('Failed to approve withdrawal: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDownloadReceipt = async (w) => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Withdrawal Receipt', 20, 20);
        doc.setFontSize(10);
        doc.text(`Tutor: ${w.tutor_name}`, 20, 35);
        doc.text(`Amount: ₦${parseFloat(w.amount).toLocaleString()}`, 20, 45);
        doc.text(`Date: ${new Date(w.created_at).toLocaleString()}`, 20, 55);
        doc.text(`Status: ${w.status}`, 20, 65);
        doc.save(`withdrawal-receipt-${w.id}.pdf`);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Withdrawals — Hidayah Admin</title>
            <PageHeader title="Withdrawal Requests" description="Review and approve tutor withdrawal requests." />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutor</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {withdrawals.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No withdrawal requests found.</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="text-[10px] font-bold text-slate-500">{new Date(w.created_at).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{w.tutor_name}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] font-black text-primary">₦{parseFloat(w.amount).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[9px] text-slate-400 uppercase font-black">{w.withdrawal_frequency}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <StatusBadge status={w.status} />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex justify-center gap-2">
                                            {w.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApprove(w.id)}
                                                    className="bg-emerald-500 text-white px-3 py-1 rounded text-[9px] font-black uppercase"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {w.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleDownloadReceipt(w)}
                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-200"
                                                    title="Download Receipt"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                </button>
                                            )}
                                        </div>
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
