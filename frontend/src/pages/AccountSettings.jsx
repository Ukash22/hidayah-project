import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import api, { getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/layout';

const inputCls = "w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-primary/40 focus:bg-white dark:focus:bg-slate-900 transition-all";

const PasswordField = ({ id, label, value, onChange, show, onToggle, autoComplete }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">{label}</label>
        <div className="relative">
            <input
                id={id}
                name={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                required
                className={inputCls}
            />
            <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
    </div>
);

export default function AccountSettings() {
    const { user } = useAuth();
    const toast = useToast();

    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [saving, setSaving] = useState(false);

    const toggle = (key) => setShow(s => ({ ...s, [key]: !s[key] }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (next !== confirm) {
            toast.error('New passwords do not match.');
            return;
        }
        setSaving(true);
        try {
            await api.post('/api/auth/password/change/', {
                current_password: current,
                new_password: next,
            });
            toast.success('Password updated successfully.');
            setCurrent(''); setNext(''); setConfirm('');
        } catch (err) {
            toast.error(getApiError(err, 'Could not update password.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <title>Account — Hidayah</title>
            <PageHeader title="Account Settings" description="Your login details and security." />

            <div className="grid lg:grid-cols-2 gap-8 max-w-4xl">
                {/* Identity (read-only) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 shadow-sm">
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100 mb-6">Profile</h3>
                    <dl className="space-y-4">
                        {[
                            ['Name', `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'],
                            ['Username', user?.username],
                            ['Email', user?.email],
                            ['Role', user?.role],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                                <dd className="text-sm font-bold text-slate-800 dark:text-slate-200">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="text-xs text-slate-500 mt-6">
                        Need to change your name or email? Contact the admin team.
                    </p>
                </div>

                {/* Password change */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 shadow-sm">
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <KeyRound size={18} className="text-primary" /> Change Password
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PasswordField id="current_password" label="Current password" value={current}
                            onChange={e => setCurrent(e.target.value)} show={show.current} onToggle={() => toggle('current')} autoComplete="current-password" />
                        <PasswordField id="new_password" label="New password" value={next}
                            onChange={e => setNext(e.target.value)} show={show.next} onToggle={() => toggle('next')} autoComplete="new-password" />
                        <PasswordField id="confirm_password" label="Confirm new password" value={confirm}
                            onChange={e => setConfirm(e.target.value)} show={show.confirm} onToggle={() => toggle('confirm')} autoComplete="new-password" />
                        <button
                            type="submit"
                            disabled={saving || !current || !next || !confirm}
                            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-primary/20"
                        >
                            {saving ? 'Updating…' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
