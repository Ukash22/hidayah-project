import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function AdminSettings() {
    const toast = useToast();
    const confirm = useConfirm();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [userForm, setUserForm] = useState({
        username: '', email: '', password: '', role: 'ADMIN',
        first_name: '', last_name: '', phone: '', is_superuser: true, is_staff: true
    });
    const [saving, setSaving] = useState(false);

    const fetchAdmins = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/admin/users/?role=ADMIN');
            setAdmins(asList(res.data));
        } catch (err) {
            console.error('Admins fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/auth/admin/users/', { ...userForm, is_superuser: true, is_staff: true });
            toast.success('Admin created successfully!');
            setShowModal(false);
            setUserForm({ username: '', email: '', password: '', role: 'ADMIN', first_name: '', last_name: '', phone: '', is_superuser: true, is_staff: true });
            fetchAdmins();
        } catch (err) {
            toast.error('Failed: ' + JSON.stringify(err.response?.data || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!await confirm('Are you sure you want to delete this admin? This action cannot be undone.', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/auth/admin/users/${userId}/`);
            toast.success('Admin deleted successfully.');
            fetchAdmins();
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Settings — Hidayah Admin</title>
            <PageHeader
                title="System Administration"
                description="Manage platform administrators and superuser accounts."
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wide rounded-xl hover:bg-primary transition-colors shadow-lg"
                    >
                        + Create Admin
                    </button>
                }
            />

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                {admins.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="text-4xl md:text-6xl mb-6">⚙️</div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Administrators Found</h3>
                        <p className="text-slate-500 text-sm mb-6">Add superusers to manage the platform.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest text-sm rounded-2xl shadow-xl hover:-translate-y-1 transition-all"
                        >
                            + Add System Admin
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {admins.map(admin => (
                                    <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{admin.first_name} {admin.last_name}</div>
                                            <div className="text-[11px] text-slate-500 uppercase font-medium">@{admin.username}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[11px] font-bold text-slate-600">{admin.email}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide">SUPERUSER</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[10px] text-slate-500">{admin.phone || 'N/A'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => handleDelete(admin.id)}
                                                className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md text-[11px] font-semibold uppercase hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-widest">Create New Admin</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">First Name</label>
                                    <input required value={userForm.first_name} onChange={e => setUserForm({...userForm, first_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Last Name</label>
                                    <input required value={userForm.last_name} onChange={e => setUserForm({...userForm, last_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Username</label>
                                <input required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                                <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Password</label>
                                <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Phone (Optional)</label>
                                <input value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold uppercase hover:bg-primary transition-colors disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
