import { useState, useEffect, useCallback } from 'react';
import api, { asList, getApiError } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { StatusBadge } from './adminHelpers';
import { SkeletonTable } from '../../components/ui';

function RejectModal({ withdrawal, onClose, onDone }) {
    const toast = useToast();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setLoading(true);
        try {
            await api.post(`/api/payments/admin/withdrawal/approve/${withdrawal.id}/`, {
                action: 'reject',
                reason: reason.trim(),
            });
            toast.success('Withdrawal rejected and tutor notified.');
            onDone();
        } catch (err) {
            toast.error(getApiError(err, 'Failed to reject withdrawal.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-card-lg w-full max-w-sm p-8 border border-slate-100 dark:border-slate-800 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Reject Withdrawal</h3>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-5">
                    ₦{parseFloat(withdrawal.amount).toLocaleString()} · {withdrawal.tutor_name}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">Reason (visible to tutor)</label>
                        <textarea
                            required
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Insufficient verified balance, incomplete bank details…"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-rose-400 transition-all resize-none"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !reason.trim()}
                            className="flex-[2] bg-rose-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Rejecting…</> : 'Reject →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminWithdrawals() {
    const toast = useToast();
    const confirm = useConfirm();
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectTarget, setRejectTarget] = useState(null);

    const fetchWithdrawals = useCallback(async () => {
        try {
            const res = await api.get('/api/payments/admin/withdrawals/pending/');
            setWithdrawals(asList(res.data));
        } catch (err) {
            console.error('Withdrawals fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    const handleApprove = async (id) => {
        if (!await confirm("Approve this withdrawal? Funds will be deducted from the tutor's wallet.", { confirmLabel: 'Approve', danger: false })) return;
        try {
            await api.post(`/api/payments/admin/withdrawal/approve/${id}/`, { action: 'approve' });
            toast.success('Withdrawal approved successfully!');
            fetchWithdrawals();
        } catch (err) {
            toast.error('Failed to approve withdrawal: ' + (err.response?.data?.error || err.message));
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
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Withdrawals — Hidayah Admin</title>
            <PageHeader title="Withdrawal Requests" description="Review and approve tutor withdrawal requests." />

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tutor</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Frequency</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Status</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {withdrawals.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No withdrawal requests found.</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="text-[10px] font-bold text-slate-500">{new Date(w.created_at).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{w.tutor_name}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] font-bold text-primary">₦{parseFloat(w.amount).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] text-slate-500 uppercase font-semibold">{w.withdrawal_frequency}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div>
                                            <StatusBadge status={w.status} />
                                            {w.status === 'REJECTED' && w.admin_notes && (
                                                <p className="text-[10px] text-rose-500 font-semibold mt-1 max-w-[120px] mx-auto truncate" title={w.admin_notes}>
                                                    {w.admin_notes}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex justify-center gap-2">
                                            {w.status === 'PENDING' && (<>
                                                <button
                                                    onClick={() => handleApprove(w.id)}
                                                    className="bg-emerald-500 text-white px-3 py-1 rounded text-[11px] font-semibold uppercase hover:bg-emerald-600 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejectTarget(w)}
                                                    className="bg-rose-500/10 border border-rose-500/30 text-rose-600 px-3 py-1 rounded text-[11px] font-semibold uppercase hover:bg-rose-500/20 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </>)}
                                            {w.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleDownloadReceipt(w)}
                                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
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

            {rejectTarget && (
                <RejectModal
                    withdrawal={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onDone={() => { setRejectTarget(null); fetchWithdrawals(); }}
                />
            )}
        </>
    );
}
