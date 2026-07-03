import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonTable } from '../../components/ui';

export default function AdminBookings() {
    const toast = useToast();
    const confirm = useConfirm();
    const [bookings, setBookings] = useState([]);
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/classes/admin/bookings/?status=${status}`);
            setBookings(Array.isArray(res.data) ? res.data : (res.data?.results || []));
        } catch (err) {
            console.error('Bookings fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleApprove = async (id) => {
        if (!await confirm('Approve this booking?', { confirmLabel: 'Approve' })) return;
        try {
            await api.post(`/api/classes/admin/bookings/${id}/action/`, { action: 'approve' });
            fetchBookings();
        } catch (err) {
            toast.error('Approval failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleReject = async (id) => {
        if (!await confirm('Reject and delete this booking?', { confirmLabel: 'Reject', danger: true })) return;
        try {
            await api.post(`/api/classes/admin/bookings/${id}/action/`, { action: 'reject' });
            fetchBookings();
        } catch (err) {
            toast.error('Rejection failed: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <>
            <title>Bookings — Hidayah Admin</title>
            <PageHeader title="Booking Management" description="Review and manage all class booking requests." />

            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mb-6 gap-1">
                {['pending', 'approved', 'active', 'all'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-600'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-4 space-y-2">
                    <SkeletonTable rows={6} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Course</th>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tutor</th>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bookings.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No bookings found in this category.</td></tr>
                                ) : bookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800 text-xs">{booking.student_name}</div>
                                            <div className="text-[9px] text-slate-500 uppercase font-black">@{booking.student_email?.split('@')[0]}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-primary text-xs">{booking.subject}</div>
                                            <div className="text-[9px] text-slate-500 uppercase font-black">₦{parseFloat(booking.price).toLocaleString()} • {booking.hours_per_week}h/wk</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800 text-xs">{booking.tutor_name}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[10px] font-medium text-slate-500">{new Date(booking.created_at).toLocaleDateString()}</div>
                                            <div className="text-[10px] font-black uppercase text-slate-500">Start: {booking.preferred_start_date || 'ASAP'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${
                                                booking.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                booking.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {booking.status}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1 items-center">
                                                {booking.status === 'PENDING' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleApprove(booking.id)} className="px-2 py-1 bg-emerald-500 text-white rounded text-[9px] font-black uppercase hover:bg-emerald-600">✅</button>
                                                        <button onClick={() => handleReject(booking.id)} className="px-2 py-1 bg-red-500 text-white rounded text-[9px] font-black uppercase hover:bg-red-600">❌</button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}
