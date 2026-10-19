import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PendingApproval = () => {
    const { token } = useAuth();
    const [tutorProfile, setTutorProfile] = useState(null);

    useEffect(() => {
        if (!token) return;
        api.get('/api/tutors/me/')
            .then(res => setTutorProfile(res.data))
            .catch(() => {});
    }, [token]);

    const isInterviewScheduled = tutorProfile?.status === 'INTERVIEW_SCHEDULED';
    const formattedInterviewTime = tutorProfile?.interview_at
        ? new Date(tutorProfile.interview_at).toLocaleString(undefined, {
            dateStyle: 'full',
            timeStyle: 'short',
        })
        : null;

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Navbar />
            <div className="container pt-32 pb-20 text-center">
                <div className="max-w-2xl mx-auto bg-white rounded-card-lg shadow-3xl p-12 border border-slate-100 animate-in fade-in zoom-in duration-700 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[100px] rounded-full"></div>
                    
                    <div className="w-24 h-24 bg-primary/5 rounded-card flex items-center justify-center mx-auto mb-8 text-4xl border border-primary/10 shadow-inner">
                        {isInterviewScheduled ? '🎯' : '⏳'}
                    </div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">
                        {isInterviewScheduled ? 'Interview Scheduled' : 'Application Under Review'}
                    </h1>
                    <p className="text-slate-500 mb-8 text-lg leading-relaxed font-medium">
                        {isInterviewScheduled
                            ? 'Great news! Your recruitment interview has been scheduled by the admissions team.'
                            : 'Thank you for registering with Hidayah International. Your application has been submitted and is currently being reviewed.'}
                    </p>

                    {isInterviewScheduled && (
                        <div className="bg-emerald-50 border-2 border-emerald-200/80 p-8 rounded-2xl mb-8 text-left shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">📅</span>
                                <h3 className="text-lg font-bold text-emerald-950">Interview Details</h3>
                            </div>
                            <p className="text-sm text-emerald-900 mb-1">
                                <strong className="font-semibold text-emerald-950">Scheduled Time:</strong>{' '}
                                {formattedInterviewTime || 'Check notification for details'}
                            </p>
                            <p className="text-xs text-emerald-700/80 mb-6">
                                Please ensure your camera and microphone are tested and join promptly at the scheduled time.
                            </p>

                            {tutorProfile.interview_link ? (
                                <a
                                    href={tutorProfile.interview_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <span>Join Interview Meeting</span>
                                    <span>↗</span>
                                </a>
                            ) : (
                                <div className="p-3 bg-emerald-100/50 rounded-xl text-xs font-semibold text-emerald-800">
                                    Meeting link will be activated prior to the session.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-slate-50 p-8 rounded-card border border-slate-100 text-left mb-10 backdrop-blur-sm">
                        <h3 className="font-semibold text-[11px] uppercase tracking-wide text-primary mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
                            Onboarding Sequence:
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-500 font-medium">
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                                <span>We will verify your submitted credentials and academic background.</span>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                                <span>Once approved, you will receive an <strong className="text-slate-900">Admission Letter</strong> via your registered email.</span>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                                <span>The email will contain secure instructions to fulfill your <strong className="text-slate-900">Admission Deposit</strong>.</span>
                            </li>
                        </ul>
                    </div>

                    <Link to="/" className="inline-block px-12 py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all">
                        Return to Global Hub →
                    </Link>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-6 text-xs text-slate-500">
                        <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                        <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
