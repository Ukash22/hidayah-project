import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { StatusBadge, getLocalTime } from './adminHelpers';
import { SkeletonTable } from '../../components/ui';

export default function AdminStudents() {
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();
    const [allStudents, setAllStudents] = useState([]);
    const [approvedTutors, setApprovedTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentForm, setStudentForm] = useState({
        enrolled_course: '', days_per_week: 3, hours_per_week: 1,
        class_type: 'ONE_ON_ONE', preferred_days: '', preferred_time: '',
        preferred_time_exact: '', level: '', assigned_tutor: '',
        meeting_link: '', whiteboard_link: ''
    });
    const [walletAction, setWalletAction] = useState({ amount: '', type: 'DEPOSIT', description: 'Bank Transfer' });
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'STUDENT', first_name: '', last_name: '', phone: '' });

    const fetchData = useCallback(async () => {
        try {
            const [studRes, tutRes] = await Promise.all([
                api.get('/api/students/admin/all/'),
                api.get('/api/tutors/admin/list/?status=APPROVED'),
            ]);
            setAllStudents(asList(studRes.data));
            setApprovedTutors(asList(tutRes.data));
        } catch (err) {
            console.error('Students fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openManage = (student) => {
        setSelectedStudent(student);
        setStudentForm({
            enrolled_course: student.enrolled_course || '',
            days_per_week: student.days_per_week || 3,
            hours_per_week: student.hours_per_week || 1,
            class_type: student.class_type || 'ONE_ON_ONE',
            preferred_days: student.preferred_days || '',
            preferred_time: student.preferred_time || '',
            preferred_time_exact: student.preferred_time_exact || '',
            level: student.level || '',
            assigned_tutor: student.assigned_tutor || '',
            meeting_link: student.meeting_link || '',
            whiteboard_link: student.whiteboard_link || ''
        });
        setShowModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;
        setSaving(true);
        try {
            await api.patch(`/api/students/admin/${selectedStudent.id}/update/`, studentForm);
            toast.success('Student updated successfully!');
            fetchData();
            setShowModal(false);
        } catch (err) {
            toast.error('Failed to update student: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleWalletAction = async () => {
        if (!walletAction.amount || !selectedStudent) return;
        setSaving(true);
        try {
            await api.post(`/api/payments/admin/wallet-action/${selectedStudent.user?.id || selectedStudent.id}/`, walletAction);
            toast.success('Wallet updated!');
            fetchData();
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!await confirm('Are you sure you want to delete this Student? This action cannot be undone.', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/auth/admin/users/${userId}/`);
            toast.success('Student deleted successfully.');
            fetchData();
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/auth/admin/users/', { ...userForm, role: 'STUDENT' });
            toast.success('Student created successfully!');
            setShowUserModal(false);
            setUserForm({ username: '', email: '', password: '', role: 'STUDENT', first_name: '', last_name: '', phone: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed: ' + JSON.stringify(err.response?.data || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Students — Hidayah Admin</title>
            <PageHeader
                title="Active Students"
                description="Manage enrolled students, assignments, and wallet balances."
                actions={
                    <button
                        onClick={() => setShowUserModal(true)}
                        className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        + Add Student
                    </button>
                }
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Course & Region</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Details</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment / Tutor</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {allStudents.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-500 italic">No active students found.</td></tr>
                            ) : allStudents.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{student.user?.first_name} {student.user?.last_name}</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-black">@{student.user?.username}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{student.enrolled_course}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[12px]">{student.user?.country === 'Nigeria' ? '🇳🇬' : '🌍'}</span>
                                            <span className="text-[9px] text-amber-600 font-black uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                                                🕒 {getLocalTime(student.user?.timezone)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[10px] font-bold text-slate-600">{student.class_type}</div>
                                        <div className="text-[9px] text-slate-500">{student.days_per_week} Days/Week • {student.hours_per_week}h</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${student.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {student.payment_status}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-700">₦{parseFloat(student.wallet_balance || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                            {student.assigned_tutor_details ? `✅ ${student.assigned_tutor_details.full_name}` : '❌ No Tutor'}
                                            {(student.meeting_link || student.assigned_tutor_details?.live_class_link) && (
                                                <button onClick={() => navigate(`/live/${student.db_id || student.id}`)} title="Join Live Class" className="text-primary hover:scale-110 transition-transform">📹</button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <StatusBadge status={student.approval_status} />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1 items-center">
                                            <button onClick={() => openManage(student)} className="px-3 py-1 w-full flex justify-center bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase hover:bg-slate-200 items-center gap-1">⚙️ Manage</button>
                                            <button onClick={() => student.user?.id && handleDelete(student.user.id)} className="px-3 py-1 w-full flex justify-center bg-red-50 text-red-600 rounded-md text-[10px] font-black uppercase hover:bg-red-100 items-center">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Student Modal */}
            {showModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Manage: {selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-600 text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4 mb-8">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile Settings</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrolled Course</label>
                                    <input value={studentForm.enrolled_course} onChange={e => setStudentForm({...studentForm, enrolled_course: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Level</label>
                                    <input value={studentForm.level} onChange={e => setStudentForm({...studentForm, level: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Type</label>
                                    <select value={studentForm.class_type} onChange={e => setStudentForm({...studentForm, class_type: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold bg-white">
                                        <option value="ONE_ON_ONE">One on One</option>
                                        <option value="GROUP">Group</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign Tutor</label>
                                    <select value={studentForm.assigned_tutor} onChange={e => setStudentForm({...studentForm, assigned_tutor: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold bg-white">
                                        <option value="">No Tutor</option>
                                        {approvedTutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Days/Week</label>
                                    <input type="number" min="1" max="7" value={studentForm.days_per_week} onChange={e => setStudentForm({...studentForm, days_per_week: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hours/Week</label>
                                    <input type="number" min="1" value={studentForm.hours_per_week} onChange={e => setStudentForm({...studentForm, hours_per_week: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meeting Link</label>
                                    <input value={studentForm.meeting_link} onChange={e => setStudentForm({...studentForm, meeting_link: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Whiteboard Link</label>
                                    <input value={studentForm.whiteboard_link} onChange={e => setStudentForm({...studentForm, whiteboard_link: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-white font-black uppercase text-sm hover:bg-primary/80 transition-colors disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>

                        <hr className="border-slate-100 my-6" />
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Wallet Action</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (₦)</label>
                                <input type="number" value={walletAction.amount} onChange={e => setWalletAction({...walletAction, amount: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                                <select value={walletAction.type} onChange={e => setWalletAction({...walletAction, type: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold bg-white">
                                    <option value="DEPOSIT">Deposit</option>
                                    <option value="DEBIT">Debit</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleWalletAction} disabled={saving || !walletAction.amount} className="w-full py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-sm hover:bg-primary transition-colors disabled:opacity-50">Apply</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Student Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-widest">Add Student</h3>
                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">First Name</label>
                                    <input required value={userForm.first_name} onChange={e => setUserForm({...userForm, first_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Name</label>
                                    <input required value={userForm.last_name} onChange={e => setUserForm({...userForm, last_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Username</label>
                                <input required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                                <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                                <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-black uppercase hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Add Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
