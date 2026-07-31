import { useState, useEffect, useCallback } from 'react';
import { User, X } from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonTable } from '../../components/ui';

export default function TutorRequests() {
    const { token } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('pending');
    const [declineModal, setDeclineModal] = useState({ open: false, bookingId: null, studentName: '', reason: '' });
    const [declining, setDeclining] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api.get(`/api/classes/booking/approval/`);
            setRequests(asList(res.data));
        } catch (err) {
            console.error('Requests fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleApprove = async (id) => {
        if (!await confirm("Approve this student's request? Student will be prompted to pay.", { confirmLabel: 'Approve' })) return;
        try {
            await api.post(`/api/classes/booking/${id}/approve/`, {});
            toast.success('Request approved! Awaiting student payment.');
            fetchRequests();
        } catch (err) {
            toast.error('Failed to approve: ' + (getApiError(err, 'Error')));
        }
    };

    const openDecline = (req) => setDeclineModal({ open: true, bookingId: req.id, studentName: req.student_name, reason: '' });
    const closeDecline = () => setDeclineModal({ open: false, bookingId: null, studentName: '', reason: '' });

    const handleDeclineSubmit = async () => {
        setDeclining(true);
        try {
            await api.post(`/api/classes/booking/${declineModal.bookingId}/reject/`, {
                rejection_reason: declineModal.reason,
            });
            toast.info('Request declined. Student has been notified.');
            closeDecline();
            fetchRequests();
        } catch (err) {
            toast.error('Failed to decline: ' + getApiError(err, 'Error'));
        } finally {
            setDeclining(false);
        }
    };

    const filtered = requests.filter(r => {
        if (activeSubTab === 'pending') return !r.approved;
        if (activeSubTab === 'approved') return r.approved && !r.paid;
        if (activeSubTab === 'active') return r.approved && r.paid;
        return true;
    });

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Requests — Hidayah</title>
            <PageHeader title="Student Requests" description="Manage incoming bookings and current regular classes." />

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto mb-8 w-fit">
                {['pending', 'approved', 'active'].map(sub => (
                    <button
                        key={sub}
                        onClick={() => setActiveSubTab(sub)}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${activeSubTab === sub ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {sub === 'pending' ? 'New Requests' : sub === 'approved' ? 'Approved' : 'Active'}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {filtered.length > 0 ? filtered.map((req) => (
                    <div key={req.id} className="bg-white dark:bg-slate-900 p-8 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-8 hover:border-primary/30 transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="bg-primary/10 w-16 h-16 rounded-card flex items-center justify-center border border-primary/10"><User size={28} className="text-primary" /></div>
                                <div>
                                    <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{req.student_name}</h4>
                                    <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-2 mt-1">
                                        <span>📩 Received: {new Date(req.created_at).toLocaleDateString()}</span>
                                        <span className="text-slate-200">|</span>
                                        <span className="text-primary">{req.subject}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Total Fee</span>
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">₦{parseFloat(req.price || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-3">Target Schedule</span>
                                <div className="space-y-2">
                                    {(() => {
                                        try {
                                            const sched = typeof req.schedule === 'string' ? JSON.parse(req.schedule) : req.schedule;
                                            if (!sched || !Array.isArray(sched)) return <span className="text-[11px] font-bold text-slate-500 italic">No schedule provided</span>;
                                            return sched.map((s, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                                    <span className="font-bold text-primary uppercase">{s.day}</span>
                                                    <span className="font-bold text-slate-500">{s.time}</span>
                                                </div>
                                            ));
                                        } catch (_e) {
                                            return <span className="text-[11px] font-bold text-slate-500 italic">Multiple Slots Requested</span>;
                                        }
                                    })()}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hours/Week</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{req.hours_per_week}h</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start Date</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{req.preferred_start_date || 'ASAP'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center gap-3">
                                {activeSubTab === 'pending' ? (
                                    <>
                                        <button onClick={() => handleApprove(req.id)} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                            Approve Request
                                        </button>
                                        <button onClick={() => openDecline(req)} className="w-full bg-slate-50 dark:bg-slate-800/60 text-red-500 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all border border-red-100">
                                            Decline
                                        </button>
                                    </>
                                ) : activeSubTab === 'approved' ? (
                                    <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Status: Approved</div>
                                        <div className="text-[11px] font-bold text-amber-500">Waiting for Student Payment</div>
                                    </div>
                                ) : (
                                    <div className="text-center p-4 bg-primary-soft rounded-2xl border border-blue-100">
                                        <div className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">Status: Active</div>
                                        <div className="text-[11px] font-bold text-blue-500">Class Session Generated</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-32 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-8">
                            {activeSubTab === 'pending' ? '📭' : activeSubTab === 'approved' ? '⏳' : '📚'}
                        </div>
                        <p className="text-slate-500 font-bold max-w-xs mx-auto">
                            {activeSubTab === 'pending' ? 'No new student requests at the moment.' : activeSubTab === 'approved' ? 'No recently approved bookings awaiting payment.' : 'No active regular classes found.'}
                        </p>
                    </div>
                )}
            </div>
            {/* Decline modal */}
            {declineModal.open && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Decline Request — {declineModal.studentName}
                            </h3>
                            <button onClick={closeDecline} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-4">
                            The student will be notified with your reason. This cannot be undone.
                        </p>
                        <textarea
                            rows={4}
                            placeholder="Optional: explain why (e.g. schedule conflict, subject mismatch)…"
                            value={declineModal.reason}
                            onChange={e => setDeclineModal(v => ({ ...v, reason: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-300 transition-all resize-none mb-6"
                        />
                        <div className="flex gap-3">
                            <button onClick={closeDecline} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleDeclineSubmit} disabled={declining}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold uppercase tracking-wide transition-all">
                                {declining ? 'Declining…' : 'Decline Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
