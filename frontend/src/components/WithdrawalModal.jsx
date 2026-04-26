/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const WithdrawalModal = ({ isOpen, onClose, currentBalance, token, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('WEEKLY');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (parseFloat(amount) > currentBalance) {
            setError('Insufficient balance for this request.');
            setLoading(false);
            return;
        }

        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/payments/tutor/withdrawal/`,
                { amount: parseFloat(amount) },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('✅ Withdrawal request submitted successfully!');
            setAmount('');
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit withdrawal request.');
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
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full"></div>

                        <button 
                            onClick={onClose} 
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-all text-xl"
                        >
                            ✕
                        </button>
                        
                        <div className="mb-8 pr-12 relative z-10">
                            <h2 className="text-3xl font-display font-black text-white mb-2">Fund Withdrawal</h2>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Process payout to bank account</p>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl mb-8 flex items-center justify-between relative z-10">
                            <div>
                                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest block mb-1">Available Funds</span>
                                <span className="text-2xl font-black text-emerald-400">₦{currentBalance?.toLocaleString()}</span>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-xl border border-emerald-500/20">
                                💰
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 relative z-10">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Request Amount (₦)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all font-black text-white text-lg placeholder:text-slate-600"
                                    required
                                    min="1"
                                    max={currentBalance}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Payout Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-[#0f172a] focus:border-emerald-500/50 outline-none transition-all font-bold text-slate-300 text-sm"
                                >
                                    <option value="DAILY">Daily Batch</option>
                                    <option value="WEEKLY">Weekly Consolidation</option>
                                    <option value="MONTHLY">Monthly Payout</option>
                                </select>
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
                                    disabled={loading || !amount}
                                    className="flex-[2] bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing</>
                                    ) : 'Submit Request →'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WithdrawalModal;
