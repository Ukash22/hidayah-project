import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import api from '../../services/api';
import { MessageSquare as IconMessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { SkeletonTable } from '../../components/ui';

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
            api.get(`/api/complaints/my/`),
            api.get(`/api/students/me/`),
        ]).then(([compRes, profRes]) => {
            setComplaints(compRes.data && Array.isArray(compRes.data.filed_by_me) ? compRes.data : { filed_by_me: [], filed_against_me: [] });
            setProfile(profRes.data);
        }).catch(err => console.error('Feedback fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Feedback & Support — Hidayah</title>
            <PageHeader title="Quality & Support" description="We monitor every session to ensure global educational standards." />

            <div className="max-w-4xl space-y-12">
                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-3">
                            <IconMessageSquare className="text-primary" /> My Activity Log
                        </h4>
                        {complaints.filed_by_me.length > 0 ? complaints.filed_by_me.map(c => (
                            <div key={c.id} className="bg-white dark:bg-slate-900 p-8 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.status}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <h5 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{c.subject}</h5>
                                <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                            </div>
                        )) : (
                            <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-slate-500 font-bold italic text-sm">No complaints filed yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-primary/5 rounded-card-lg p-6 md:p-10 border border-primary/10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl mb-8">📣</div>
                        <h4 className="text-2xl font-display font-bold text-primary mb-4">Need Assistance?</h4>
                        <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">If you have any issues with your tutor or the platform, our support team is available 24/7 to resolve them.</p>
                        <button
                            onClick={() => setShowComplaintModal(true)}
                            className="w-full py-5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
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
