import { useState, useEffect, useCallback } from 'react';
import { User, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { asList } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function ParentOverview() {
    const { user } = useAuth();
    const toast = useToast();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChildren = useCallback(async () => {
        try {
            const res = await api.get('/api/parents/dashboard/child_dashboard/');
            setChildren(asList(res.data));
        } catch (err) {
            console.error('Failed to fetch children data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchChildren(); }, [fetchChildren]);

    const handleImpersonate = async (childId) => {
        try {
            const res = await api.post('/api/parents/dashboard/impersonate_child/', { child_id: childId });
            const { access } = res.data;

            // S4: the parent session lives in the httpOnly refresh cookie — it
            // survives untouched. The child access token goes into the
            // localStorage override (the one permitted localStorage token) so
            // the impersonated session survives the hard redirect. The flag
            // lets the student view offer "return to parent".
            localStorage.setItem('parent_access', '1');
            localStorage.setItem('access', access);

            // Hard redirect remounts AuthContext with the child override
            window.location.href = '/student';
        } catch (err) {
            console.error('Impersonation failed:', err);
            toast.error('Failed to securely connect to child dashboard.');
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Parent Portal — Hidayah</title>
            <PageHeader
                title="My Registered Children"
                description={`Welcome, ${user?.first_name}. Monitor your children's academic progress below.`}
            />

            <div className="grid md:grid-cols-2 gap-8">
                {children.length > 0 ? (
                    children.map((child, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-card border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all group shadow-sm hover:shadow-xl">
                            <div className="flex items-center gap-6 mb-6">
                                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"><User size={24} className="text-primary" /></div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-bold text-primary">
                                        {child.full_name || `${child.user_details?.first_name || ''} ${child.user_details?.last_name || ''}`.trim()}
                                    </h4>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mt-1">
                                        Admission ID: {child.user_details?.admission_number || 'N/A'}
                                    </p>
                                </div>
                                <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${child.payment_status === 'PAID' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {child.payment_status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Course</span>
                                    <span className="text-sm font-bold text-primary">{child.enrolled_course || 'Not Assigned'}</span>
                                </div>
                                <div className="bg-white/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Class Type</span>
                                    <span className="text-sm font-bold text-primary">{child.class_type?.replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary/50 mb-1">Assigned Tutor</span>
                                        <p className="text-sm font-bold text-primary">
                                            {child.assigned_tutor_details ? child.assigned_tutor_details.full_name : 'Pending Assignment'}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        {child.meeting_link && (
                                            <a href={child.meeting_link} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-secondary hover:underline uppercase tracking-wide">
                                                Enter Class ↗
                                            </a>
                                        )}
                                        {child.whiteboard_link && (
                                            <a href={child.whiteboard_link} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline uppercase tracking-wide">
                                                Whiteboard ✏
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weekly Schedule</span>
                                    <span className="text-xs font-bold text-primary">{child.days_per_week} Days ({child.preferred_days || 'Not set'})</span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {child.admission_letter_url && (
                                        <a href={child.admission_letter_url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold uppercase tracking-wide text-primary hover:underline flex items-center gap-1">
                                            Admission Letter ↓
                                        </a>
                                    )}
                                    <Link
                                        to={`/parent/child/${child.id}`}
                                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold uppercase tracking-wide py-2 px-4 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                                    >
                                        <ExternalLink size={12} /> Detail
                                    </Link>
                                    <button
                                        onClick={() => handleImpersonate(child.id)}
                                        className="bg-primary text-white text-[11px] font-semibold uppercase tracking-wide py-2 px-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <User size={12} /> View Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full bg-slate-50/50 p-12 rounded-card border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-slate-500 font-bold">No children registered under this account.</p>
                        <Link to="/register" className="text-primary font-bold uppercase tracking-widest text-xs mt-4 inline-block hover:underline">
                            Register a Student →
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}
