import React, { useState, useEffect } from 'react';
import { Lock, Settings } from 'lucide-react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout';

const ExamHub = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [selectedType, setSelectedType] = useState('JAMB');
    const [jambYear, setJambYear] = useState('2021');
    const [jambSelection, setJambSelection] = useState(['English Language']);
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examRes, profRes] = await Promise.all([
                    api.get(`/api/exams/list/`),
                    api.get(`/api/students/me/`)
                ]);

                setExams(examRes.data);
                setProfile(profRes.data);

                const years = [...new Set(examRes.data.map(e => e.year).filter(y => y))].sort((a, b) => b - a);
                setAvailableYears(years);
                if (years.length > 0 && !jambYear) setJambYear(years[0].toString());
            } catch (err) {
                console.error('Failed to fetch exam data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleSubject = (subj) => {
        if (subj === 'English Language') return;
        if (jambSelection.includes(subj)) {
            setJambSelection(jambSelection.filter(s => s !== subj));
        } else {
            if (jambSelection.length < 4) {
                setJambSelection([...jambSelection, subj]);
            }
        }
    };

    const handleStartJAMB = () => {
        const selectedExams = jambSelection.map(subj => {
            return exams.find(e => e.subject_name === subj && e.exam_type === 'JAMB' && e.year.toString() === jambYear);
        }).filter(e => e);

        if (selectedExams.length > 0) {
            const ids = selectedExams.map(e => e.id).join(',');
            navigate(`/exam/practice/${ids}?type=JAMB&year=${jambYear}`);
        }
    };

    const filteredExams = exams.filter(e =>
        e.exam_type === selectedType &&
        (selectedType === 'JAMB' ? e.year?.toString() === jambYear : true)
    );

    // Wallet gate
    if (!loading && profile && profile.wallet_balance < 1000) {
        return (
            <>
                <title>Exam Practice — Hidayah</title>
                <PageHeader title="Exam Practice" description="Past paper practice for JAMB, WAEC, NECO and more." />
                <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="px-10">
                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Lock size={36} className="text-amber-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Exam Access Locked</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            A minimum wallet balance of ₦1,000 is required to access Exam Practice. This keeps your account ready for active assessment sessions.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => navigate('/payment')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                            >
                                Top Up Wallet →
                            </button>
                            <button
                                onClick={() => navigate('/student/overview')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <title>Exam Practice — Hidayah</title>
            <PageHeader
                title="Exam Practice"
                description="Practice past papers for JAMB, WAEC, NECO, JSSCE and primary levels."
            />

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Config panel */}
                <div className="lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
                        <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                            <Settings size={16} className="text-emerald-600" />
                            Exam Configuration
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">
                                    Examination Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['JAMB', 'WAEC', 'NECO', 'JSSCE', 'PRIMARY'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={`py-2.5 rounded-xl border-2 transition-all font-bold text-xs ${
                                                selectedType === type
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedType === 'JAMB' && (
                                <>
                                    <div>
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">
                                            Exam Year
                                        </label>
                                        <select
                                            value={jambYear}
                                            onChange={(e) => setJambYear(e.target.value)}
                                            className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 font-bold text-slate-800 text-sm outline-none focus:border-emerald-400"
                                        >
                                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">
                                            Subject Combination ({jambSelection.length}/4)
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {jambSelection.map(s => (
                                                <span key={s} className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1.5">
                                                    {s}
                                                    {s !== 'English Language' && (
                                                        <button onClick={() => toggleSubject(s)} className="hover:text-red-200 leading-none">×</button>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                                            {exams.filter(e => e.exam_type === 'JAMB' && e.year?.toString() === jambYear).map(e => (
                                                <button
                                                    key={e.id}
                                                    disabled={jambSelection.includes(e.subject_name) && e.subject_name === 'English Language'}
                                                    onClick={() => toggleSubject(e.subject_name)}
                                                    className={`w-full text-left p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                                                        jambSelection.includes(e.subject_name)
                                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                            : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'
                                                    }`}
                                                >
                                                    {jambSelection.includes(e.subject_name) ? '✓ ' : '+ '}{e.subject_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        disabled={jambSelection.length < 4}
                                        onClick={handleStartJAMB}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-md shadow-emerald-600/20"
                                    >
                                        Launch Full JAMB Simulation 🚀
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Exam cards */}
                <div className="flex-1">
                    <div className="grid md:grid-cols-2 gap-5">
                        {loading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white h-48 rounded-2xl border border-slate-200 animate-pulse" />
                            ))
                        ) : filteredExams.length > 0 ? (
                            filteredExams.map(exam => (
                                <div
                                    key={exam.id}
                                    className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                            📚
                                        </div>
                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-full uppercase tracking-tight border border-amber-100">
                                            {exam.exam_type} {exam.year}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">{exam.title}</h3>
                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-5">
                                        <span>⏱ {exam.duration_minutes} min</span>
                                    </div>
                                    <Link
                                        to={`/exam/practice/${exam.id}`}
                                        className="w-full inline-block text-center py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                                    >
                                        Start Practice
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="md:col-span-2 bg-white rounded-2xl p-16 border border-dashed border-slate-200 text-center">
                                <p className="text-3xl mb-4">🏜️</p>
                                <p className="text-slate-400 font-medium">No exams found for this selection.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExamHub;
