import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonTable } from '../../components/ui';
import { UserCheck, Check, X, UserPlus, Clock } from 'lucide-react';

export default function AdminBookings() {
    const toast = useToast();
    const confirm = useConfirm();
    const [bookings, setBookings] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [status, setStatus] = useState('paid_awaiting_approval');
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState({ open: false, booking: null, tutorId: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/classes/admin/bookings/?status=${status}`);
            setBookings(asList(res.data));
        } catch (err) {
            console.error('Bookings fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Fetch approved tutors list for assigning
    useEffect(() => {
        const fetchTutors = async () => {
            try {
                const res = await api.get('/api/tutors/admin/list/?status=APPROVED');
                setTutors(asList(res.data));
            } catch (err) {
                console.warn('Could not load tutors for assignment:', err);
            }
        };
        fetchTutors();
    }, []);

    const handleApprove = async (booking) => {
        if (!await confirm(`Approve booking for ${booking.student_name} (${booking.subject})?${booking.paid ? ' This will automatically generate the 4-week class sessions.' : ''}`, { confirmLabel: 'Approve & Confirm' })) return;
        try {
            const res = await api.post(`/api/classes/admin/bookings/${booking.id}/action/`, { action: 'approve' });
            toast.success(res.data.message || 'Booking approved successfully!');
            fetchBookings();
        } catch (err) {
            toast.error('Approval failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleReject = async (id) => {
        if (!await confirm('Reject and delete this booking?', { confirmLabel: 'Reject', danger: true })) return;
        try {
            await api.post(`/api/classes/admin/bookings/${id}/action/`, { action: 'reject' });
            toast.success('Booking rejected and removed.');
            fetchBookings();
        } catch (err) {
            toast.error('Rejection failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenAssign = (booking) => {
        setAssignModal({
            open: true,
            booking,
            tutorId: booking.tutor || ''
        });
    };

    const handleSaveAssignment = async () => {
        if (!assignModal.tutorId) {
            toast.error('Please select a tutor from the list.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post(`/api/classes/admin/bookings/${assignModal.booking.id}/action/`, {
                tutor_id: assignModal.tutorId,
                action: 'approve'
            });
            toast.success(res.data.message || 'Tutor assigned and booking updated successfully!');
            setAssignModal({ open: false, booking: null, tutorId: '' });
            fetchBookings();
        } catch (err) {
            toast.error('Assignment failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <title>Bookings — Hidayah Admin</title>
            <PageHeader title="Booking Management" description="Review student bookings, assign tutors, and manage active course classes." />

            {/* Status Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit mb-6 gap-1 flex-wrap">
                {[
                    { key: 'paid_awaiting_approval', label: '💰 Paid Awaiting Tutor / Approval' },
                    { key: 'pending', label: '⏳ All Pending' },
                    { key: 'tutor_busy', label: '⚠️ Tutor Busy / Needs Reassignment' },
                    { key: 'approved', label: '🔵 Approved (Unpaid)' },
                    { key: 'active', label: '✅ Active Classes' },
                    { key: 'all', label: 'All Bookings' }
                ].map(s => (
                    <button
                        key={s.key}
                        onClick={() => setStatus(s.key)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${status === s.key ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-4 space-y-2">
                    <SkeletonTable rows={6} />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course & Schedule</th>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Tutor</th>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Payment Status</th>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Booking Status</th>
                                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Admin Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {bookings.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No bookings found in this category.</td></tr>
                                ) : bookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{booking.student_name}</div>
                                            <div className="text-[11px] text-slate-500">@{booking.student_email?.split('@')[0]}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-primary text-xs">{booking.subject}</div>
                                            <div className="text-[11px] text-slate-500">₦{parseFloat(booking.price || 0).toLocaleString()} • {booking.hours_per_week}h/wk</div>
                                            <div className="text-[10px] text-slate-400">Start: {booking.preferred_start_date || 'ASAP'}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {booking.tutor_name || 'Unassigned'}
                                            </div>
                                            {booking.tutor_declined && (
                                                <span className="inline-block mt-1 text-[9px] font-bold uppercase text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                                    ⚠️ Tutor Declined (Busy)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {booking.paid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                                    <span>✅</span>
                                                    <span>Paid</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                                    <span>💳</span>
                                                    <span>Unpaid</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className={`text-[9px] font-bold px-2.5 py-1 rounded-full inline-block uppercase tracking-wider ${booking.status === 'ACTIVE'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                                    : booking.status === 'AWAITING_APPROVAL' || booking.status === 'TUTOR_BUSY_AWAITING_ADMIN'
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                                                        : booking.status === 'APPROVED_PENDING_PAYMENT'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                {booking.status === 'AWAITING_APPROVAL'
                                                    ? 'Awaiting Approval'
                                                    : booking.status === 'TUTOR_BUSY_AWAITING_ADMIN'
                                                        ? 'Tutor Busy'
                                                        : booking.status}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {/* Assign or Change Tutor Button */}
                                                <button
                                                    onClick={() => handleOpenAssign(booking)}
                                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1 shadow-sm"
                                                    title="Assign or change tutor"
                                                >
                                                    <UserPlus size={12} />
                                                    <span>Assign Tutor</span>
                                                </button>

                                                {/* Direct Approve Button (if not already approved) */}
                                                {!booking.approved && (
                                                    <button
                                                        onClick={() => handleApprove(booking)}
                                                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                                        title={booking.paid ? "Approve booking and generate class sessions" : "Approve booking"}
                                                    >
                                                        <Check size={12} />
                                                        <span>Approve</span>
                                                    </button>
                                                )}

                                                {/* Reject Button */}
                                                <button
                                                    onClick={() => handleReject(booking.id)}
                                                    className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-red-500/20"
                                                    title="Reject booking"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Assign / Reassign Tutor Modal ── */}
            {assignModal.open && (
                <div className="fixed inset-0 z-[6000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Tutor to Booking</h3>
                                    <p className="text-xs text-slate-500">Student: {assignModal.booking?.student_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAssignModal({ open: false, booking: null, tutorId: '' })}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Booking details snapshot */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subject:</span>
                                    <span className="font-bold text-primary">{assignModal.booking?.subject}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Price:</span>
                                    <span className="font-bold">₦{parseFloat(assignModal.booking?.price || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Payment Status:</span>
                                    <span className={`font-bold ${assignModal.booking?.paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {assignModal.booking?.paid ? '✅ Paid (Held in Escrow)' : '💳 Unpaid'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Current Tutor:</span>
                                    <span className="font-bold">{assignModal.booking?.tutor_name || 'None'}</span>
                                </div>
                            </div>

                            {/* Tutor Selection Dropdown */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                                    Select Approved Tutor:
                                </label>
                                <select
                                    value={assignModal.tutorId}
                                    onChange={(e) => setAssignModal(prev => ({ ...prev, tutorId: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                                >
                                    <option value="">-- Choose a Tutor --</option>
                                    {tutors.map(t => {
                                        const uid = t.user_id || t.id;
                                        return (
                                            <option key={uid} value={uid}>
                                                {t.name || t.user?.first_name || 'Tutor'} {t.subjects ? `(Teaches: ${t.subjects})` : ''} — ₦{parseFloat(t.hourly_rate || 0).toLocaleString()}/hr
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {assignModal.booking?.paid && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300">
                                    💡 <strong>Note:</strong> Because the student has already paid, assigning a tutor will automatically approve the booking and <strong>generate the 4-week class schedule</strong> immediately!
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignModal({ open: false, booking: null, tutorId: '' })}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAssignment}
                                    disabled={submitting || !assignModal.tutorId}
                                    className="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-xs uppercase rounded-2xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserCheck size={14} />
                                            <span>{assignModal.booking?.paid ? 'Assign & Generate Classes' : 'Assign Tutor'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
