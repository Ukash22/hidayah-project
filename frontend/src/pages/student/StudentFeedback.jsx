import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import axios from 'axios';
import { MessageSquare as IconMessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';

const ComplaintModal = lazy(() => import('../../components/ComplaintModal'));

export default function StudentFeedback() {
    const { token } = useAuth();

    const [complaints, setComplaints] = useState({ filed_by_me: [], filed_against_me: [] });
    const [profile, setProfile] = useState(null);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/my/`, { headers: getAuthHeader() }),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() }),
        ]).then(([compRes, profRes]) => {
            setComplaints(compRes.data && Array.isArray(compRes.data.filed_by_me) ? compRes.data : { filed_by_me: [], filed_against_me: [] });
            setProfile(profRes.data);
        }).catch(err => console.error('Feedback fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Feedback & Support — Hidayah</title>
            <PageHeader title="Quality & Support" description="We monitor every session to ensure global educational standards." />

            <div className="max-w-4xl space-y-12">
                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                            <IconMessageSquare className="text-blue-600" /> My Activity Log
                        </h4>
                        {complaints.filed_by_me.length > 0 ? complaints.filed_by_me.map(c => (
                            <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="bg-slate-50 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">{c.status}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <h5 className="text-lg font-bold text-slate-900 mb-2">{c.subject}</h5>
                                <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                            </div>
                        )) : (
                            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold italic text-sm">No complaints filed yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-600/5 rounded-[3rem] p-10 border border-blue-600/10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-3xl mb-8">📣</div>
                        <h4 className="text-2xl font-display font-black text-blue-600 mb-4">Need Assistance?</h4>
                        <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">If you have any issues with your tutor or the platform, our support team is available 24/7 to resolve them.</p>
                        <button
                            onClick={() => setShowComplaintModal(true)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            File Formal Report →
                        </button>
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                <ComplaintModal
                    isOpen={showComplaintModal}
                    onClose={() => setShowComplaintModal(false)}
                    filedAgainstId={profile?.assigned_tutor_details?.id}
                    filedAgainstName={profile?.assigned_tutor_details?.full_name}
                    token={token}
                />
            </Suspense>
        </>
    );
}
