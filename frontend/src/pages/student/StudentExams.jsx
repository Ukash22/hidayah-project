import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { FileText as IconFileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function StudentExams() {
    const { token } = useAuth();

    const [examAssignments, setExamAssignments] = useState([]);
    const [examResults, setExamResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            api.get(`/api/exams/assignments/`),
            api.get(`/api/exams/results/`),
        ]).then(([asgnRes, resRes]) => {
            setExamAssignments(asList(asgnRes.data));
            setExamResults(asList(resRes.data));
        }).catch(err => console.error('Exams fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const pending = examAssignments.filter(ea => !ea.is_completed);

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Assessments — Hidayah</title>
            <PageHeader title="Assessments" description="Your assigned exams and performance history." />

            <div className="space-y-12">
                {/* Pending exams */}
                <div>
                    <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mb-6">Pending Examinations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pending.length > 0 ? pending.map(ea => (
                            <div key={ea.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-5 md:p-8 hover:border-primary/30 transition-all group shadow-sm">
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                    <IconFileText size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">{ea.exam_title}</h4>
                                <div className="flex flex-col gap-2 mb-8">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Assigned by {ea.tutor_name || 'System'}</p>
                                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Due: {ea.due_date ? new Date(ea.due_date).toLocaleDateString() : 'Immediate'}</p>
                                </div>
                                <a
                                    href={`/exam/practice/${ea.exam}`}
                                    className="block w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-[11px] uppercase tracking-wide text-center transition-all shadow-lg shadow-primary/10"
                                >
                                    Launch CBT Simulator
                                </a>
                            </div>
                        )) : (
                            <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-slate-500 font-bold italic">No pending exams at the moment.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results history */}
                <div>
                    <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mb-6">Performance History</h2>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg overflow-hidden shadow-sm">
                        <div className="grid grid-cols-4 p-6 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <div className="col-span-2">Examination</div>
                            <div>Score</div>
                            <div>Date</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {examResults.length > 0 ? examResults.map(res => (
                                <div key={res.id} className="grid grid-cols-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all items-center">
                                    <div className="col-span-2">
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{res.exam_title}</h5>
                                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Aggregate Performance</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${parseFloat(res.score) >= 50 ? 'text-primary' : 'text-red-500'}`}>
                                            {Math.round(res.score)}%
                                        </span>
                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                            <div className={`h-full ${parseFloat(res.score) >= 50 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${res.score}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-500">
                                        {new Date(res.date_taken).toLocaleDateString()}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-slate-500 font-bold italic">No results recorded yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
