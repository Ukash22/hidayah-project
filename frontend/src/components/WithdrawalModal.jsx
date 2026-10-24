import React, { useState, useEffect } from 'react';
import api, { getApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */

const WithdrawalModal = ({ isOpen, onClose, currentBalance, token, onSuccess }) => {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('WEEKLY');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [loadingBank, setLoadingBank] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setLoadingBank(true);
        api.get('/api/payments/tutor/bank-details/')
            .then(res => {
                if (res.data) {
                    setBankName(res.data.bank_name || '');
                    setAccountNumber(res.data.account_number || '');
                    setAccountName(res.data.account_name || '');
                }
            })
            .catch(err => {
                console.error('Failed to pre-fetch tutor bank details', err);
            })
            .finally(() => setLoadingBank(false));
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0) {
            setError('Please enter a valid amount.');
            setLoading(false);
            return;
        }

        if (numericAmount > currentBalance) {
            setError('Insufficient balance for this request.');
            setLoading(false);
            return;
        }

        if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
            setError('Please provide complete bank details (bank name, account number, and account name).');
            setLoading(false);
            return;
        }

        try {
            await api.post(
                `/api/payments/tutor/withdrawal/`,
                {
                    amount: numericAmount,
                    bank_name: bankName.trim(),
                    account_number: accountNumber.trim(),
                    account_name: accountName.trim(),
                    withdrawal_frequency: frequency,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Withdrawal request submitted successfully!');
            setAmount('');
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(getApiError(err, 'Failed to submit withdrawal request.'));
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
                        className="bg-[#0f172a] rounded-card-lg w-full max-w-lg p-8 md:p-10 relative overflow-hidden border border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto"
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full"></div>

                        <button 
                            onClick={onClose} 
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-all text-xl"
                        >
                            ✕
                        </button>
                        
                        <div className="mb-6 pr-12 relative z-10">
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Fund Withdrawal</h2>
                            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Transfer funds to your Nigerian bank account</p>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 md:p-5 rounded-2xl mb-6 flex items-center justify-between relative z-10">
                            <div>
                                <span className="text-[11px] font-semibold uppercase text-emerald-400 tracking-wide block mb-1">Available Funds</span>
                                <span className="text-2xl font-bold text-emerald-400">₦{parseFloat(currentBalance || 0).toLocaleString()}</span>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-xl border border-emerald-500/20">
                                💰
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2 relative z-10">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                            <div className="space-y-1.5">
                                <label htmlFor="withdrawal_amount" className="text-[11px] font-semibold uppercase text-slate-400 tracking-wide ml-1">Request Amount (₦)</label>
                                <input
                                    id="withdrawal_amount"
                                    name="withdrawal_amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-5 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all font-bold text-white text-base placeholder:text-slate-600"
                                    required
                                    min="1"
                                    max={currentBalance}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Bank Details section */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                                        🏦 Destination Bank Account
                                    </span>
                                    {loadingBank && (
                                        <span className="text-[10px] text-slate-400 animate-pulse">Loading saved...</span>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="bank_name" className="text-[10px] font-semibold uppercase text-slate-400 ml-1">Bank Name</label>
                                    <input
                                        id="bank_name"
                                        type="text"
                                        placeholder="e.g. GTBank, Access Bank, Zenith Bank"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all text-xs font-semibold text-white placeholder:text-slate-600"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor="account_number" className="text-[10px] font-semibold uppercase text-slate-400 ml-1">Account Number</label>
                                        <input
                                            id="account_number"
                                            type="text"
                                            maxLength="10"
                                            placeholder="10-digit NUBAN"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all text-xs font-mono font-semibold text-white placeholder:text-slate-600"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="account_name" className="text-[10px] font-semibold uppercase text-slate-400 ml-1">Account Holder Name</label>
                                        <input
                                            id="account_name"
                                            type="text"
                                            placeholder="Full Name on Account"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all text-xs font-semibold text-white placeholder:text-slate-600"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="withdrawal_frequency" className="text-[11px] font-semibold uppercase text-slate-400 tracking-wide ml-1">Payout Batch Frequency</label>
                                <select
                                    id="withdrawal_frequency"
                                    name="withdrawal_frequency"
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0f172a] focus:border-emerald-500/50 outline-none transition-all font-semibold text-slate-300 text-xs"
                                >
                                    <option value="DAILY">Daily Batch</option>
                                    <option value="WEEKLY">Weekly Consolidation</option>
                                    <option value="MONTHLY">Monthly Payout</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-white/5 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !amount || !bankName || !accountNumber || !accountName}
                                    className="flex-[2] bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
