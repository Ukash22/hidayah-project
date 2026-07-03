import { useState, lazy, Suspense, memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as IconCalendar, Clock as IconClock, User as IconUser } from 'lucide-react';

const RescheduleModal = lazy(() => import('./RescheduleModal'));

const ClassCard = memo(function ClassCard({ cls, token, onJoin, onRefetch }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col lg:flex-row justify-between items-center gap-10 hover:border-blue-600/30 transition-all shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner ring-1 ring-slate-100">🏫</div>
                <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{cls.type || 'REGULAR COURSE'}</p>
                    <h4 className="text-3xl font-display font-black text-slate-900 mb-3">{cls.subject}</h4>
                    <div className="flex flex-wrap gap-4 font-bold text-[10px] text-slate-500 uppercase bg-slate-50 p-3 rounded-2xl w-fit">
                        <span className="flex items-center gap-2"><IconCalendar size={12} className="text-blue-600" /> {new Date(cls.scheduled_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {new Date(cls.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-2"><IconUser size={12} className="text-sky-600" /> Tutor: {cls.tutor_name}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <Link
                    to={`/student/classes/${cls.db_id || cls.id}`}
                    state={cls}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-sm text-center"
                >
                    Details
                </Link>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-sm"
                >
                    Reschedule
                </button>
                <button
                    onClick={() => onJoin(cls)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
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
