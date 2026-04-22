import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/parents/dashboard/child_dashboard/`);
                setChildren(response.data);
            } catch (err) {
                console.error("Failed to fetch children data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    const handleImpersonate = async (childId, childName) => {
        try {
            setLoading(true);
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/parents/dashboard/impersonate_child/`, {
                child_id: childId
            });
            const { access, refresh } = response.data;
            
            // Save current parent session for easy return
            localStorage.setItem('parent_access', localStorage.getItem('access'));
            localStorage.setItem('parent_refresh', localStorage.getItem('refresh'));
            
            // Swap to child session
            localStorage.setItem('access', access);
            localStorage.setItem('refresh', refresh);
            
            // Hard redirect to clear context and remount AuthContext cleanly with new tokens
            window.location.href = '/student';
        } catch (err) {
            console.error("Impersonation failed:", err);
            alert("Failed to securely connect to child dashboard.");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Parent Portal...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20">
                <div className="bg-white rounded-[2.5rem] shadow-xl p-12 border border-slate-100">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 text-3xl font-black">
                                {user?.first_name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-4xl font-display text-primary">Parent Portal</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Welcome, {user?.first_name}</p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-display text-primary mb-8 flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-amber-500 rounded-full"></span>
                        My Registered Children
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {children.length > 0 ? (
                            children.map((child, idx) => (
                                <div key={idx} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 hover:border-amber-200 transition-all group">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">🧒</div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-primary">{child.full_name || child.user_details?.first_name + ' ' + (child.user_details?.last_name || '')}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Admission ID: {child.user_details?.admission_number}</p>
                                        </div>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${child.payment_status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {child.payment_status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/50 p-4 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Course</span>
                                            <span className="text-sm font-bold text-primary">{child.enrolled_course || 'Not Assigned'}</span>
                                        </div>
                                        <div className="bg-white/50 p-4 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Class Type</span>
                                            <span className="text-sm font-bold text-primary">{child.class_type?.replace('_', ' ')}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="block text-[10px] font-black uppercase tracking-widest text-primary/50 mb-1">Assigned Tutor</span>
                                                <p className="text-sm font-bold text-primary">
                                                    {child.assigned_tutor_details ? child.assigned_tutor_details.full_name : 'Pending Assignment'}
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                {child.meeting_link && (
                                                    <a href={child.meeting_link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-secondary hover:underline uppercase tracking-widest">
                                                        Enter Class ↗
                                                    </a>
                                                )}
                                                {child.whiteboard_link && (
                                                    <a href={child.whiteboard_link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-amber-600 hover:underline uppercase tracking-widest">
                                                        Whiteboard ✏
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weekly Schedule</span>
                                            <span className="text-xs font-bold text-primary">{child.days_per_week} Days ({child.preferred_days || 'Not set'})</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {child.admission_letter_url && (
                                                <a
                                                    href={child.admission_letter_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline flex items-center gap-1"
                                                >
                                                    Admission Letter ↓
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => handleImpersonate(child.id, child.user_details?.first_name)}
                                                className="bg-primary text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <span>👁️</span> View Dashboard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-slate-50/50 p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 font-bold">No children registered under this account.</p>
                                <a href="/register" className="text-amber-600 font-black uppercase tracking-widest text-xs mt-4 inline-block hover:underline">Register a Student →</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
