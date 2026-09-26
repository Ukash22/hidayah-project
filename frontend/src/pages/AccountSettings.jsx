import { useState, useEffect } from 'react';
import { Eye, EyeOff, KeyRound, GraduationCap } from 'lucide-react';
import api, { getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/layout';

const inputCls = "w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-primary/40 focus:bg-white dark:focus:bg-slate-900 transition-all";
const selectCls = inputCls;

const LEVEL_OPTIONS = [
    { value: '', label: 'Not specified' },
    { value: 'PRIMARY', label: 'Primary School' },
    { value: 'SECONDARY', label: 'Secondary School (JSS)' },
    { value: 'JUNIOR_WAEC', label: 'Junior WAEC (BECE)' },
    { value: 'JAMB', label: 'JAMB / University Entrance' },
    { value: 'WAEC', label: 'WAEC' },
    { value: 'NECO', label: 'NECO' },
    { value: 'ADULT', label: 'Adult Learner' },
];

const EXAM_TYPE_OPTIONS = [
    { value: '', label: 'Not specified' },
    { value: 'JAMB', label: 'JAMB (UTME)' },
    { value: 'WAEC', label: 'WAEC (SSCE)' },
    { value: 'NECO', label: 'NECO' },
    { value: 'BECE', label: 'BECE (Junior WAEC)' },
];

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

    const [enrollment, setEnrollment] = useState({ level: '', target_exam_type: '', target_exam_year: '' });
    const [enrollSaving, setEnrollSaving] = useState(false);

    const isStudent = user?.role === 'STUDENT';

    useEffect(() => {
        if (!isStudent) return;
        api.get('/api/students/me/').then(res => {
            setEnrollment({
                level: res.data.level || '',
                target_exam_type: res.data.target_exam_type || '',
                target_exam_year: res.data.target_exam_year || '',
            });
        }).catch(() => {});
    }, [isStudent]);

    const handleEnrollSave = async (e) => {
        e.preventDefault();
        setEnrollSaving(true);
        try {
            await api.patch('/api/students/me/', enrollment);
            toast.success('Exam enrollment updated.');
        } catch (err) {
            toast.error(getApiError(err, 'Could not update enrollment.'));
        } finally {
            setEnrollSaving(false);
        }
    };

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

            <div className={`grid gap-8 max-w-4xl ${isStudent ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
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

                {/* Exam enrollment — students only */}
                {isStudent && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 shadow-sm lg:col-span-2">
                        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                            <GraduationCap size={18} className="text-primary" /> Exam Enrollment
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">
                            Update your education level and target exam. This affects how AI Hub and CBT practice are configured for you.
                        </p>
                        <form onSubmit={handleEnrollSave} className="grid sm:grid-cols-3 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="level" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Education Level</label>
                                <select id="level" value={enrollment.level}
                                    onChange={e => setEnrollment(v => ({ ...v, level: e.target.value }))}
                                    className={selectCls}>
                                    {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="target_exam_type" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Target Exam</label>
                                <select id="target_exam_type" value={enrollment.target_exam_type}
                                    onChange={e => setEnrollment(v => ({ ...v, target_exam_type: e.target.value }))}
                                    className={selectCls}>
                                    {EXAM_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="target_exam_year" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Target Year</label>
                                <input id="target_exam_year" type="text" placeholder="e.g. 2026"
                                    value={enrollment.target_exam_year}
                                    onChange={e => setEnrollment(v => ({ ...v, target_exam_year: e.target.value }))}
                                    maxLength={4}
                                    className={inputCls} />
                            </div>
                            <div className="sm:col-span-3">
                                <button type="submit" disabled={enrollSaving}
                                    className="px-8 py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-primary/20">
                                    {enrollSaving ? 'Saving…' : 'Save Enrollment'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

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
