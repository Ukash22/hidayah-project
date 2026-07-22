import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PendingApproval = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Navbar />
            <div className="container pt-32 pb-20 text-center">
                <div className="max-w-2xl mx-auto bg-white rounded-card-lg shadow-3xl p-12 border border-slate-100 animate-in fade-in zoom-in duration-700 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[100px] rounded-full"></div>
                    
                    <div className="w-24 h-24 bg-primary/5 rounded-card flex items-center justify-center mx-auto mb-8 text-4xl border border-primary/10 shadow-inner">
                        ⏳
                    </div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Application Under Review</h1>
                    <p className="text-slate-500 mb-10 text-lg leading-relaxed font-medium">
                        Thank you for registering with <strong className="text-primary">Hidayah International Tutor Platform</strong>.
                        <br />
                        Your application has been submitted and is currently being reviewed by our admissions team.
                    </p>

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
