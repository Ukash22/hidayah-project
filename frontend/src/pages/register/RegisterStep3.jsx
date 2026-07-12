import { Eye, EyeOff } from 'lucide-react';

const LEVELS = [
    { value: 'PRIMARY', label: 'Primary School' },
    { value: 'SECONDARY', label: 'Secondary School' },
    { value: 'JUNIOR_WAEC', label: 'Junior WAEC' },
    { value: 'JAMB', label: 'JAMB' },
    { value: 'WAEC', label: 'WAEC' },
    { value: 'NECO', label: 'NECO' },
];

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 ml-1">{label}</span>
        {children}
    </label>
);

const Row = ({ label, value }) => (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
        <span className="font-bold text-slate-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
);

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-primary/40 focus:bg-white transition-all";

export default function RegisterStep3({
    account, learning, subjectEnrollments,
    parent, setParent, isMinor,
    showParentPass, setShowParentPass,
}) {
    return (
        <>
            <h2 className="text-lg font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-xs">3</span>
                Confirm &amp; Submit
            </h2>

            {/* Summary */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2 text-sm">
                <Row label="Name" value={`${account.firstName} ${account.lastName}`} />
                <Row label="Username" value={account.username} />
                <Row label="Email" value={account.email} />
                <Row label="Level" value={LEVELS.find(l => l.value === learning.level)?.label} />
                <Row label="Class Type" value={learning.classType === 'ONE_ON_ONE' ? 'One-on-One' : 'Group'} />
                <Row label="Subjects" value={Object.keys(subjectEnrollments).join(', ') || '—'} />
                <Row label="Schedule" value={learning.schedule.map(s => `${s.day} ${s.time}`).join(', ')} />
            </div>

            {/* Parent fields (if minor) */}
            {isMinor && (
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-4 flex items-center gap-2">
                        ⚠ Student is under 18 — parent account required
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Parent First Name">
                            <input className={inputCls} value={parent.parentFirstName} onChange={e => setParent(p => ({ ...p, parentFirstName: e.target.value }))} placeholder="Parent's first name" />
                        </Field>
                        <Field label="Parent Last Name">
                            <input className={inputCls} value={parent.parentLastName} onChange={e => setParent(p => ({ ...p, parentLastName: e.target.value }))} placeholder="Parent's last name" />
                        </Field>
                        <Field label="Parent Email">
                            <input type="email" className={inputCls} value={parent.parentEmail} onChange={e => setParent(p => ({ ...p, parentEmail: e.target.value }))} placeholder="parent@email.com" />
                        </Field>
                        <Field label="Parent Password">
                            <div className="relative">
                                <input type={showParentPass ? 'text' : 'password'} className={inputCls} value={parent.parentPassword} onChange={e => setParent(p => ({ ...p, parentPassword: e.target.value }))} placeholder="Parent portal password" />
                                <button type="button" onClick={() => setShowParentPass(v => !v)} aria-label={showParentPass ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                                    {showParentPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </Field>
                        <Field label="Relationship">
                            <select className={inputCls} value={parent.relationship} onChange={e => setParent(p => ({ ...p, relationship: e.target.value }))}>
                                {['Father', 'Mother', 'Guardian'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </Field>
                    </div>
                </div>
            )}
        </>
    );
}
