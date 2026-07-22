import { Eye, EyeOff } from 'lucide-react';

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">{label}</span>
        {children}
    </label>
);

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-primary/40 focus:bg-white transition-all";

export default function RegisterStep1({ account, setAccount, showPass, setShowPass, showConfirmPass, setShowConfirmPass }) {
    const set = (key) => (e) => setAccount(a => ({ ...a, [key]: e.target.value }));
    return (
        <>
            <h2 className="text-lg font-bold text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-xs">1</span>
                Your Account
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">
                    <input className={inputCls} value={account.firstName} onChange={set('firstName')} placeholder="e.g. Fatima" autoComplete="given-name" />
                </Field>
                <Field label="Last Name">
                    <input className={inputCls} value={account.lastName} onChange={set('lastName')} placeholder="e.g. Ibrahim" autoComplete="family-name" />
                </Field>
                <Field label="Username">
                    <input className={inputCls} value={account.username} onChange={e => setAccount(a => ({ ...a, username: e.target.value.toLowerCase() }))} placeholder="e.g. fatima_2025" autoComplete="username" />
                </Field>
                <Field label="Email">
                    <input type="email" className={inputCls} value={account.email} onChange={set('email')} placeholder="your@email.com" autoComplete="email" />
                </Field>
                <Field label="Password">
                    <div className="relative">
                        <input type={showPass ? 'text' : 'password'} className={inputCls} value={account.password} onChange={set('password')} placeholder="Min. 8 characters" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                            {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </Field>
                <Field label="Confirm Password">
                    <div className="relative">
                        <input type={showConfirmPass ? 'text' : 'password'} className={inputCls} value={account.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowConfirmPass(v => !v)} aria-label={showConfirmPass ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                            {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </Field>
                <Field label="Date of Birth">
                    <input type="date" className={inputCls} value={account.dob} onChange={set('dob')} autoComplete="bday" />
                </Field>
                <Field label="Gender">
                    <select className={inputCls} value={account.gender} onChange={set('gender')}>
                        <option>Male</option>
                        <option>Female</option>
                    </select>
                </Field>
                <Field label="Phone (optional)">
                    <input className={inputCls} value={account.phone} onChange={set('phone')} placeholder="+234..." autoComplete="tel" />
                </Field>
                <Field label="Country (optional)">
                    <input className={inputCls} value={account.country} onChange={set('country')} placeholder="e.g. Nigeria" autoComplete="country-name" />
                </Field>
            </div>
        </>
    );
}
