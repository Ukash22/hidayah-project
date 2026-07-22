import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

const STATUS_STEPS = ['OPEN', 'UNDER_REVIEW', 'RESOLVED'];
const STEP_LABELS = { OPEN: 'Open', UNDER_REVIEW: 'Under Review', RESOLVED: 'Resolved' };
const STEP_ICONS = { OPEN: MessageSquare, UNDER_REVIEW: Clock, RESOLVED: CheckCircle };

function StatusTimeline({ status }) {
    const currentIdx = STATUS_STEPS.indexOf(status);
    return (
        <div className="flex items-center gap-0 mt-4 mb-1">
            {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIdx;
                const Icon = STEP_ICONS[step];
                return (
                    <div key={step} className="flex items-center flex-1 min-w-0">
                        <div className={`flex flex-col items-center gap-1 shrink-0`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                done
                                    ? step === 'OPEN' ? 'bg-amber-500 text-white'
                                      : step === 'UNDER_REVIEW' ? 'bg-indigo-500 text-white'
                                      : 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                            }`}>
                                <Icon size={13} />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                                {STEP_LABELS[step]}
                            </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ComplaintCard({ complaint, variant = 'filed' }) {
    const isFiled = variant === 'filed';
    return (
        <div className={`p-6 rounded-card border shadow-sm hover:shadow-md transition-all ${
            isFiled
                ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/30'
                : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800 hover:border-rose-300'
        }`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight flex-1 pr-3">{complaint.subject}</h4>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                    {new Date(complaint.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
            </div>

            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-3">{complaint.description}</p>

            <p className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-lg inline-block ${
                isFiled ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-500' : 'bg-white dark:bg-slate-900 text-slate-500'
            }`}>
                {isFiled ? `Against: ${complaint.filed_against_name}` : `From: ${complaint.filed_by_name}`}
            </p>

            <StatusTimeline status={complaint.status} />

            {complaint.admin_response && (
                <div className={`mt-4 p-4 rounded-xl border ${
                    isFiled ? 'bg-primary-soft border-blue-100' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isFiled ? 'text-primary' : 'text-slate-500'}`}>
                        {isFiled ? 'Admin Response' : 'Resolution Notes'}
                    </p>
                    <p className={`text-sm font-medium leading-relaxed ${isFiled ? 'text-blue-700' : 'text-slate-600'}`}>
                        {complaint.admin_response}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function TutorComplaints() {
    const { token } = useAuth();
    const [complaints, setComplaints] = useState({ filed_by_me: [], filed_against_me: [] });
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        api.get(`/api/complaints/my/`)
            .then(res => setComplaints(res.data && Array.isArray(res.data.filed_by_me) ? res.data : { filed_by_me: [], filed_against_me: [] }))
            .catch(err => console.error('Complaints fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Feedback — Hidayah</title>
            <PageHeader title="Feedback & Reports" description="Track student concerns and administrative feedback." />

            <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full shadow-lg shadow-primary/20" />
                        Filed by Me
                    </h3>
                    {complaints.filed_by_me.length > 0 ? (
                        complaints.filed_by_me.map(c => <ComplaintCard key={c.id} complaint={c} variant="filed" />)
                    ) : (
                        <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-500 font-bold">No active reports filed.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-rose-500 rounded-full shadow-lg shadow-rose-500/20" />
                        Received Reports
                    </h3>
                    {complaints.filed_against_me.length > 0 ? (
                        complaints.filed_against_me.map(c => <ComplaintCard key={c.id} complaint={c} variant="against" />)
                    ) : (
                        <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-500 font-bold">Your record is perfectly clean! ✨</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
