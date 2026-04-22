import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const ExamHub = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [selectedType, setSelectedType] = useState('JAMB');
    const [jambYear, setJambYear] = useState('2021');
    const [jambSelection, setJambSelection] = useState(['English Language']);
    const [availableYears, setAvailableYears] = useState([]);

    const getAuthHeader = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('access');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examRes, profRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, { headers: getAuthHeader() }),
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() })
                ]);
                
                setExams(examRes.data);
                setProfile(profRes.data);

                const years = [...new Set(examRes.data.map(e => e.year).filter(y => y))].sort((a, b) => b - a);
                setAvailableYears(years);
                if (years.length > 0 && !jambYear) setJambYear(years[0].toString());
            } catch (err) {
                console.error("Failed to fetch data", err);
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
            window.location.href = `/exam/practice/${ids}?type=JAMB&year=${jambYear}`;
        }
    };

    const filteredExams = exams.filter(e => e.exam_type === selectedType && (selectedType === 'JAMB' ? e.year?.toString() === jambYear : true));

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Navbar />
            <Navbar />
            <div className="container pt-32 pb-20">
                {(profile && profile.wallet_balance < 1000) ? (
                    <div className="max-w-2xl mx-auto py-20 text-center bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl relative overflow-hidden group mt-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50"></div>
                        <div className="relative z-10 px-10">
                            <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 animate-bounce shadow-inner">📜</div>
                            <h3 className="text-4xl font-display font-bold text-primary mb-4 text-center">Exam Access Locked</h3>
                            <p className="text-slate-600 mb-10 font-medium leading-relaxed italic text-lg text-center">
                                To access the Exam Practice Hub and AI Simulations, you must maintain a minimum wallet balance of ₦1,000. This ensures your account is ready for active assessment sessions.
                            </p>
                            <div className="flex flex-col md:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => window.location.href = '/payment'}
                                    className="bg-primary hover:bg-primary-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-95 group-hover:-translate-y-1"
                                >
                                    Funding Wallet Now →
                                </button>
                                <button
                                    onClick={() => window.location.href = '/student'}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-95"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Left: Configuration & Selection */}
                        <div className="lg:w-1/3">
                            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100 sticky top-32">
                                <h2 className="text-2xl font-display text-primary mb-6 flex items-center gap-2">
                                    <span className="p-2 bg-primary/5 rounded-lg text-xl">⚙️</span>
                                    Exam Configuration
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Examination Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['JAMB', 'WAEC', 'NECO', 'JSSCE', 'PRIMARY'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedType(type)}
                                                    className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${selectedType === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedType === 'JAMB' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Exam Year</label>
                                                <select
                                                    value={jambYear}
                                                    onChange={(e) => setJambYear(e.target.value)}
                                                    className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 font-bold text-primary"
                                                >
                                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                                                    Subject Combination ({jambSelection.length}/4)
                                                </label>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {jambSelection.map(s => (
                                                        <span key={s} className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                                            {s}
                                                            {s !== 'English Language' && (
                                                                <button onClick={() => toggleSubject(s)} className="hover:text-red-200">×</button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                    {exams.filter(e => e.exam_type === 'JAMB' && e.year?.toString() === jambYear).map(e => (
                                                        <button
                                                            key={e.id}
                                                            disabled={jambSelection.includes(e.subject_name) && e.subject_name === 'English Language'}
                                                            onClick={() => toggleSubject(e.subject_name)}
                                                            className={`w-full text-left p-3 rounded-xl border-2 text-xs font-bold transition-all ${jambSelection.includes(e.subject_name) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 bg-white hover:border-slate-200 text-slate-500'}`}
                                                        >
                                                            {jambSelection.includes(e.subject_name) ? '✓ ' : '+ '}
                                                            {e.subject_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                disabled={jambSelection.length < 4}
                                                onClick={handleStartJAMB}
                                                className="w-full btn btn-primary py-4 shadow-xl shadow-primary/20 disabled:opacity-50"
                                            >
                                                Launch Full JAMB Simulation 🚀
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Available Single Exams */}
                        <div className="lg:w-2/3">
                            <div className="grid md:grid-cols-2 gap-6">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-white h-48 rounded-[2rem] border border-slate-100 animate-pulse"></div>
                                    ))
                                ) : filteredExams.length > 0 ? (
                                    filteredExams.map(exam => (
                                        <div key={exam.id} className="relative overflow-hidden group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                        📚
                                                    </div>
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                                        {exam.exam_type} {exam.year}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-display text-primary mb-2 font-black">{exam.title}</h3>
                                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-8">
                                                    <span className="flex items-center gap-1">⏱️ {exam.duration_minutes} Mins</span>
                                                    <span className="flex items-center gap-1">❓ Questions</span>
                                                </div>
                                                <Link
                                                    to={`/exam/practice/${exam.id}`}
                                                    className="w-full inline-block text-center py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors"
                                                >
                                                    Start Practice
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="md:col-span-2 bg-white rounded-[2rem] p-20 border border-dashed border-slate-200 text-center">
                                        <p className="text-4xl mb-6">🏜️</p>
                                        <p className="text-slate-400 font-medium">No exams found for this selection yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamHub;
