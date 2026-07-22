import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, User, ExternalLink, Layout, ChevronLeft, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout';

const STATUS_MAP = {
    ACTIVE: { label: 'Active', icon: <Wifi size={13} />, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    APPROVED: { label: 'Approved', icon: <CheckCircle2 size={13} />, cls: 'bg-primary-soft text-primary border-blue-200' },
    PENDING: { label: 'Pending', icon: <AlertCircle size={13} />, cls: 'bg-amber-50 text-amber-600 border-amber-200' },
    CANCELLED: { label: 'Cancelled', icon: <WifiOff size={13} />, cls: 'bg-red-50 text-red-500 border-red-200' },
};

export default function StudentSessionDetail() {
    const { state: cls } = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();

    if (!cls) {
        return (
            <div className="py-32 text-center">
                <p className="text-slate-500 font-bold mb-6">Session data not found. Please return to your classes list.</p>
                <button onClick={() => navigate('/student/classes')} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-primary-dark transition-all">
                    ← Back to Classes
                </button>
            </div>
        );
    }

    const scheduledAt = cls.scheduled_at ? new Date(cls.scheduled_at) : null;
    const status = STATUS_MAP[cls.status] || STATUS_MAP.PENDING;
    const meetingLink = cls.tutor_class_link || cls.meeting_link;

    return (
        <>
            <title>{cls.subject} — Session Detail</title>
            <PageHeader
                title={cls.subject}
                description="Full details for this scheduled session."
                breadcrumb={[
                    { label: 'My Classes', to: '/student/classes' },
                    { label: cls.subject },
                ]}
            />

            <div className="max-w-2xl space-y-6">
                {/* Status + Type */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-widest ${status.cls}`}>
                        {status.icon} {status.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 text-[11px] font-semibold uppercase tracking-wide">
                        {cls.type || 'Regular'}
                    </span>
                    {cls.is_live && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-[11px] font-semibold uppercase tracking-wide animate-pulse">
                            ● Live Now
                        </span>
                    )}
                </div>

                {/* Info card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 space-y-5 shadow-sm">
                    <Row icon={<Calendar size={16} className="text-primary" />} label="Date">
                        {scheduledAt ? scheduledAt.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </Row>
                    <Row icon={<Clock size={16} className="text-indigo-600" />} label="Time">
                        {scheduledAt ? scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {cls.duration ? ` · ${cls.duration} min` : ''}
                    </Row>
                    <Row icon={<User size={16} className="text-sky-600" />} label="Tutor">
                        {cls.tutor_name || '—'}
                    </Row>
                </div>

                {/* Links */}
                {(meetingLink || cls.whiteboard_link) && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 space-y-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Session Links</p>
                        {meetingLink && (
                            <a
                                href={meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-5 py-3.5 bg-primary-soft hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-2xl text-sm font-semibold transition-all group"
                            >
                                <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                                Join Meeting Room
                            </a>
                        )}
                        {cls.whiteboard_link && (
                            <a
                                href={cls.whiteboard_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-2xl text-sm font-semibold transition-all group"
                            >
                                <Layout size={16} className="group-hover:scale-110 transition-transform" />
                                Open Whiteboard
                            </a>
                        )}
                    </div>
                )}

                {/* Back */}
                <button
                    onClick={() => navigate('/student/classes')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold text-sm transition-colors"
                >
                    <ChevronLeft size={16} /> Back to Classes
                </button>
            </div>
        </>
    );
}

function Row({ icon, label, children }) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center shrink-0">{icon}</div>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{children}</p>
            </div>
        </div>
    );
}
