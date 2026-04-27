import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PendingApproval = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Navbar />
            <div className="container pt-32 pb-20 text-center">
                <div className="max-w-2xl mx-auto bg-white rounded-[3rem] shadow-3xl p-12 border border-slate-100 animate-in fade-in zoom-in duration-700 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 blur-[100px] rounded-full"></div>
                    
                    <div className="w-24 h-24 bg-blue-600/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-4xl animate-pulse border border-blue-600/10 shadow-inner">
                        ⏳
                    </div>
                    <h1 className="text-4xl font-display font-black text-slate-900 mb-4">Application Under Review</h1>
                    <p className="text-slate-500 mb-10 text-lg leading-relaxed font-medium">
                        Thank you for registering with <strong className="text-blue-600">Hidayah International Tutor Platform</strong>.
                        <br />
                        Your application has been submitted and is currently being reviewed by our admissions team.
                    </p>

                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-left mb-10 backdrop-blur-sm">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-blue-600 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                            Onboarding Sequence:
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-400 font-medium">
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black">1</span>
                                <span>We will verify your submitted credentials and academic background.</span>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black">2</span>
                                <span>Once approved, you will receive an <strong className="text-slate-900">Admission Letter</strong> via your registered email.</span>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black">3</span>
                                <span>The email will contain secure instructions to fulfill your <strong className="text-slate-900">Admission Deposit</strong>.</span>
                            </li>
                        </ul>
                    </div>

                    <Link to="/" className="inline-block px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-600/30 hover:scale-[1.05] active:scale-95 transition-all">
                        Return to Global Hub →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
