import { useState, lazy, Suspense, memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as IconCalendar, Clock as IconClock, User as IconUser } from 'lucide-react';

const RescheduleModal = lazy(() => import('./RescheduleModal'));

const ClassCard = memo(function ClassCard({ cls, token, onJoin, onRefetch }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-6 md:p-10 flex flex-col lg:flex-row justify-between items-center gap-10 hover:border-primary/30 transition-all shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/60 rounded-card flex items-center justify-center text-4xl shadow-inner ring-1 ring-slate-100">🏫</div>
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{cls.type || 'REGULAR COURSE'}</p>
                    <h4 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-3">{cls.subject}</h4>
                    <div className="flex flex-wrap gap-4 font-bold text-[10px] text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl w-fit">
                        <span className="flex items-center gap-2"><IconCalendar size={12} className="text-primary" /> {new Date(cls.scheduled_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {new Date(cls.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-2"><IconUser size={12} className="text-sky-600" /> Tutor: {cls.tutor_name}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <Link
                    to={`/student/classes/${cls.db_id || cls.id}`}
                    state={cls}
                    className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 px-8 py-5 rounded-3xl font-bold uppercase text-xs tracking-widest transition-all shadow-sm text-center"
                >
                    Details
                </Link>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 px-10 py-5 rounded-3xl font-bold uppercase text-xs tracking-widest transition-all shadow-sm"
                >
                    Reschedule
                </button>
                <button
                    onClick={() => onJoin(cls)}
                    className="bg-primary hover:bg-primary-dark text-white px-12 py-5 rounded-3xl font-bold uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                >
                    Join Live Class →
                </button>
            </div>

            <Suspense fallback={null}>
                <RescheduleModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    sessionId={cls.db_id}
                    sessionType={cls.type || 'REGULAR'}
                    initiatedBy="STUDENT"
                    token={token}
                    onSuccess={onRefetch}
                />
            </Suspense>
        </div>
    );
});

export default ClassCard;
