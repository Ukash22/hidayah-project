import os
import re

file_path = r'c:\Users\USER\Desktop\hidayah\frontend\src\pages\AdminDashboard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert Wallet Audit Log after the Audit Trail table
# We look for the end of the Audit Trail div
target_pattern = re.compile(r'(Audit Trail.*?</table>\s+</div>\s+</div>\s+</div>)', re.DOTALL)

internal_trans_section = r'''\1

                                            <div className="px-4 mt-8">
                                                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/20">
                                                        <h3 className="font-black text-slate-800 font-display tracking-tight flex items-center gap-2">
                                                            <span className="text-xl">💳</span> Wallet Transactions (Debits & Credits)
                                                        </h3>
                                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">Internal Ledger</div>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-[#f8fafc]">
                                                                <tr>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Timestamp</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">User Details</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Type</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Amount</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Description</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {transactions.length === 0 ? (
                                                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No wallet activities found.</td></tr>
                                                                ) : transactions.map(t => (
                                                                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                                                                        <td className="py-4 px-6 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                                                            {new Date(t.date).toLocaleString()}
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{t.user_name}</div>
                                                                            <div className="text-[9px] text-slate-400 font-bold lowercase">{t.user_email}</div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${
                                                                                t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') 
                                                                                ? 'bg-red-50 text-red-600 border-red-100' 
                                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                            }`}>
                                                                                {t.type.replace('_', ' ')}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className={`text-sm font-black ${
                                                                                t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') ? 'text-red-600' : 'text-emerald-600'
                                                                            }`}>
                                                                                {t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') ? '-' : '+'}
                                                                                ₦{parseFloat(t.amount || 0).toLocaleString()}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight line-clamp-1 group-hover:line-clamp-none transition-all">{t.description}</div>
                                                                            {t.reference && <div className="text-[8px] text-slate-300 font-black tracking-widest mt-0.5">REF: {t.reference}</div>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>'''

new_content = target_pattern.sub(internal_trans_section, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully added Wallet Transactions section to AdminDashboard.jsx")
else:
    print("Could not find Audit Trail section to append to.")
