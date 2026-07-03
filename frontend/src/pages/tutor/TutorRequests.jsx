import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
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

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api.get(`/api/classes/booking/approval/`, { headers: getAuthHeader() });
            setRequests(Array.isArray(res.data) ? res.data : []);
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
            await api.post(`/api/classes/booking/${id}/approve/`, {}, { headers: getAuthHeader() });
            toast.success('Request approved! Awaiting student payment.');
            fetchRequests();
        } catch (err) {
            toast.error('Failed to approve: ' + (err.response?.data?.error || 'Error'));
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt("Enter rejection reason:");
        if (reason === null) return;
        try {
            await api.post(`/api/classes/booking/${id}/reject/`, { rejection_reason: reason }, { headers: getAuthHeader() });
            toast.info('Request rejected.');
            fetchRequests();
        } catch (err) {
            toast.error('Failed to reject: ' + (err.response?.data?.error || 'Error'));
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

            <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto mb-8 w-fit">
                {['pending', 'approved', 'active'].map(sub => (
                    <button
                        key={sub}
                        onClick={() => setActiveSubTab(sub)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === sub ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {sub === 'pending' ? '📥 New Requests' : sub === 'approved' ? '⏳ Approved' : '✅ Active'}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {filtered.length > 0 ? filtered.map((req) => (
                    <div key={req.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-8 hover:border-blue-600/30 transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="bg-blue-600/10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl border border-blue-600/10">👤</div>
                                <div>
                                    <h4 className="text-2xl font-display font-black text-slate-900">{req.student_name}</h4>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                        <span>📩 Received: {new Date(req.created_at).toLocaleDateString()}</span>
                                        <span className="text-slate-200">|</span>
                                        <span className="text-blue-600">{req.subject}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Fee</span>
                                <span className="text-2xl font-black text-slate-900">₦{parseFloat(req.price || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-3">Target Schedule</span>
                                <div className="space-y-2">
                                    {(() => {
                                        try {
                                            const sched = typeof req.schedule === 'string' ? JSON.parse(req.schedule) : req.schedule;
                                            if (!sched || !Array.isArray(sched)) return <span className="text-[11px] font-bold text-slate-500 italic">No schedule provided</span>;
                                            return sched.map((s, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                                    <span className="font-black text-blue-600 uppercase">{s.day}</span>
                                                    <span className="font-bold text-slate-500">{s.time}</span>
                                                </div>
                                            ));
                                        } catch (_e) {
                                            return <span className="text-[11px] font-bold text-slate-500 italic">Multiple Slots Requested</span>;
                                        }
                                    })()}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hours/Week</span>
                                    <span className="text-sm font-black text-slate-900">{req.hours_per_week}h</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Start Date</span>
                                    <span className="text-sm font-black text-slate-900">{req.preferred_start_date || 'ASAP'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center gap-3">
                                {activeSubTab === 'pending' ? (
                                    <>
                                        <button onClick={() => handleApprove(req.id)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                            Approve Request
                                        </button>
                                        <button onClick={() => handleReject(req.id)} className="w-full bg-slate-50 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all border border-red-100">
                                            Reject
                                        </button>
                                    </>
                                ) : activeSubTab === 'approved' ? (
                                    <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Status: Approved</div>
                                        <div className="text-[11px] font-bold text-amber-500">Waiting for Student Payment</div>
                                    </div>
                                ) : (
                                    <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Status: Active</div>
                                        <div className="text-[11px] font-bold text-blue-500">Class Session Generated</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-8">
                            {activeSubTab === 'pending' ? '📭' : activeSubTab === 'approved' ? '⏳' : '📚'}
                        </div>
                        <p className="text-slate-500 font-bold max-w-xs mx-auto">
                            {activeSubTab === 'pending' ? 'No new student requests at the moment.' : activeSubTab === 'approved' ? 'No recently approved bookings awaiting payment.' : 'No active regular classes found.'}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
