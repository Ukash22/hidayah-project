import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText as IconFileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';

export default function StudentExams() {
    const { token } = useAuth();

    const [examAssignments, setExamAssignments] = useState([]);
    const [examResults, setExamResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/`, { headers: getAuthHeader() }),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/results/`, { headers: getAuthHeader() }),
        ]).then(([asgnRes, resRes]) => {
            setExamAssignments(Array.isArray(asgnRes.data) ? asgnRes.data : []);
            setExamResults(Array.isArray(resRes.data) ? resRes.data : []);
        }).catch(err => console.error('Exams fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const pending = examAssignments.filter(ea => !ea.is_completed);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Assessments — Hidayah</title>
            <PageHeader title="Assessments" description="Your assigned exams and performance history." />

            <div className="space-y-12">
                {/* Pending exams */}
                <div>
                    <h2 className="text-xl font-display font-black text-slate-900 mb-6">Pending Examinations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pending.length > 0 ? pending.map(ea => (
                            <div key={ea.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:border-blue-600/30 transition-all group shadow-sm">
                                <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                    <IconFileText size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{ea.exam_title}</h4>
                                <div className="flex flex-col gap-2 mb-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned by {ea.tutor_name || 'System'}</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Due: {ea.due_date ? new Date(ea.due_date).toLocaleDateString() : 'Immediate'}</p>
                                </div>
                                <a
                                    href={`/exam/practice/${ea.exam}`}
                                    className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest text-center transition-all shadow-lg shadow-blue-600/10"
                                >
                                    Launch CBT Simulator
                                </a>
                            </div>
                        )) : (
                            <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold italic">No pending exams at the moment.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results history */}
                <div>
                    <h2 className="text-xl font-display font-black text-slate-900 mb-6">Performance History</h2>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="grid grid-cols-4 p-6 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <div className="col-span-2">Examination</div>
                            <div>Score</div>
                            <div>Date</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {examResults.length > 0 ? examResults.map(res => (
                                <div key={res.id} className="grid grid-cols-4 p-6 hover:bg-slate-50 transition-all items-center">
                                    <div className="col-span-2">
                                        <h5 className="text-sm font-bold text-slate-900">{res.exam_title}</h5>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Aggregate Performance</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${parseFloat(res.score) >= 50 ? 'text-blue-600' : 'text-red-500'}`}>
                                            {Math.round(res.score)}%
                                        </span>
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                            <div className={`h-full ${parseFloat(res.score) >= 50 ? 'bg-blue-600' : 'bg-red-500'}`} style={{ width: `${res.score}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                        {new Date(res.date_taken).toLocaleDateString()}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-slate-400 font-bold italic">No results recorded yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
