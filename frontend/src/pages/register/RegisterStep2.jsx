import { Plus, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEVELS = [
    { value: 'PRIMARY', label: 'Primary School' },
    { value: 'SECONDARY', label: 'Secondary School' },
    { value: 'JUNIOR_WAEC', label: 'Junior WAEC' },
    { value: 'JAMB', label: 'JAMB' },
    { value: 'WAEC', label: 'WAEC' },
    { value: 'NECO', label: 'NECO' },
];
const EXAM_LEVELS = ['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'];

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 ml-1">{label}</span>
        {children}
    </label>
);

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-blue-600/40 focus:bg-white transition-all";

export default function RegisterStep2({
    learning, setLearning,
    subjectsByCategory, subjectEnrollments, setSubjectEnrollments, toggleSubject,
    tutorsBySubject, loadingTutors,
    addScheduleSlot, removeScheduleSlot, updateScheduleSlot,
}) {
    return (
        <>
            <h2 className="text-lg font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs">2</span>
                Learning Plan
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Class Type">
                    <select className={inputCls} value={learning.classType} onChange={e => setLearning(l => ({ ...l, classType: e.target.value }))}>
                        <option value="ONE_ON_ONE">One-on-One</option>
                        <option value="GROUP">Group</option>
                    </select>
                </Field>
                <Field label="Level">
                    <select className={inputCls} value={learning.level} onChange={e => setLearning(l => ({ ...l, level: e.target.value }))}>
                        {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </Field>
                {EXAM_LEVELS.includes(learning.level) && (
                    <Field label="Target Exam Year">
                        <input type="number" className={inputCls} value={learning.targetExamYear} onChange={e => setLearning(l => ({ ...l, targetExamYear: e.target.value }))} min="2024" max="2035" />
                    </Field>
                )}
                <Field label="Hours per Session">
                    <select className={inputCls} value={learning.hoursPerSession} onChange={e => setLearning(l => ({ ...l, hoursPerSession: e.target.value }))}>
                        {['0.5', '1', '1.5', '2', '2.5', '3'].map(h => <option key={h} value={h}>{h} hr{h !== '1' ? 's' : ''}</option>)}
                    </select>
                </Field>
                <Field label="Preferred Start Date (optional)">
                    <input type="date" className={inputCls} value={learning.preferredStartDate} onChange={e => setLearning(l => ({ ...l, preferredStartDate: e.target.value }))} />
                </Field>
            </div>

            {/* Subjects */}
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Select Subjects</p>
                {Object.keys(subjectsByCategory).length === 0 ? (
                    <div className="text-slate-500 text-sm font-bold">Loading subjects…</div>
                ) : (
                    Object.entries(subjectsByCategory).map(([cat, subjects]) => (
                        <div key={cat} className="mb-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{cat}</p>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map(sub => {
                                    const selected = sub in subjectEnrollments;
                                    return (
                                        <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-600/30'}`}>
                                            {sub}
                                        </button>
                                    );
                                })}
                            </div>
                            {subjects.filter(s => s in subjectEnrollments).map(sub => (
                                <div key={`t-${sub}`} className="mt-2 ml-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">{sub} — preferred tutor (optional)</p>
                                    {loadingTutors[sub] ? (
                                        <p className="text-xs text-slate-500 font-bold">Loading tutors…</p>
                                    ) : (tutorsBySubject[sub] || []).length === 0 ? (
                                        <p className="text-xs text-slate-500 font-bold">No tutors available — admin will assign one.</p>
                                    ) : (
                                        <select className={`${inputCls} text-sm py-2.5`} value={subjectEnrollments[sub] || ''} onChange={e => setSubjectEnrollments(prev => ({ ...prev, [sub]: e.target.value ? Number(e.target.value) : '' }))}>
                                            <option value="">No preference</option>
                                            {(tutorsBySubject[sub] || []).map(t => (
                                                <option key={t.id} value={t.id}>{t.user?.first_name} {t.user?.last_name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Schedule slots */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preferred Schedule</p>
                    <button type="button" onClick={addScheduleSlot} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                        <Plus size={12} /> Add slot
                    </button>
                </div>
                <div className="space-y-2">
                    {learning.schedule.map((slot, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                            <select className={`${inputCls} flex-1 py-2.5 text-sm`} value={slot.day} onChange={e => updateScheduleSlot(i, 'day', e.target.value)}>
                                {DAYS.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <input type="time" className={`${inputCls} flex-1 py-2.5 text-sm`} value={slot.time} onChange={e => updateScheduleSlot(i, 'time', e.target.value)} />
                            {learning.schedule.length > 1 && (
                                <button type="button" onClick={() => removeScheduleSlot(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
