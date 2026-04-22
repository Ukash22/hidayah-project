import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PendingApproval = () => {
    return (
        <div className="min-h-screen bg-surface">
            <Navbar />
            <div className="container pt-32 pb-20 text-center">
                <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-pulse">
                        ⏳
                    </div>
                    <h1 className="text-3xl font-display text-primary mb-4">Application Under Review</h1>
                    <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                        Thank you for registering with <strong>Hidayah International Tutor Platform</strong>.
                        <br />
                        Your application has been submitted and is currently being reviewed by our admissions team.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left mb-8">
                        <h3 className="font-bold text-slate-800 mb-3">Next Steps:</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">✓</span>
                                <span>We will review your application details.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">✓</span>
                                <span>Once approved, you will receive an <strong>Admission Letter</strong> via email.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">✓</span>
                                <span>The email will contain a link to make your <strong>First Payment</strong>.</span>
                            </li>
                        </ul>
                    </div>

                    <Link to="/" className="inline-block px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-600 transition-colors">
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
