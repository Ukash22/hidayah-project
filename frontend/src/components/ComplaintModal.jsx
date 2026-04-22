import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const ComplaintModal = ({ isOpen, onClose, filedAgainstId, filedAgainstName, token }) => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/complaints/file/`,
                {
                    filed_against_id: filedAgainstId,
                    subject,
                    description
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert('✅ Issue report filed successfully');
            setSubject('');
            setDescription('');
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to file issue report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#0f172a] rounded-[2.5rem] w-full max-w-md p-10 relative overflow-hidden border border-white/10 shadow-2xl"
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-500/20 blur-[100px] rounded-full"></div>

                        <button 
                            onClick={onClose} 
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-all text-xl"
                        >
                            ✕
                        </button>
                        
                        <div className="mb-8 pr-12 relative z-10">
                            <h2 className="text-3xl font-display font-black text-rose-500 mb-2">Report Issue</h2>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Submitting formal complaint</p>
                        </div>

                        <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl mb-8 flex items-center gap-4 relative z-10">
                            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 text-lg border border-rose-500/20">
                                👤
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest block mb-1">Filing Against</span>
                                <span className="text-sm font-black text-white">{filedAgainstName}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 relative z-10">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Incident Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-rose-500/50 outline-none transition-all font-bold text-white text-sm placeholder:text-slate-600"
                                    required
                                    placeholder="Brief summary of the issue"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Detailed Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-rose-500/50 outline-none transition-all font-bold text-white text-sm placeholder:text-slate-600 h-32 resize-none no-scrollbar"
                                    required
                                    placeholder="Please provide full details regarding the incident..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-white/5 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !subject || !description}
                                    className="flex-[2] bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating</>
                                    ) : 'Submit Report →'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ComplaintModal;
