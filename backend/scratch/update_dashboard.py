import os
import re

file_path = r'c:\Users\USER\Desktop\hidayah\frontend\src\pages\AdminDashboard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the revenue velocity section to insert the new wallet cards
# We look for the closing div of the first grid and the opening div of the second grid
target_pattern = re.compile(r'(<div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">.*?</div>)\s+<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">', re.DOTALL)

new_section = r'''\1

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
                                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 relative z-10">Total Student Wallets</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.wallet_stats?.student_total || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Liquid Student Balance</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300 relative z-10">Total Tutor Wallets</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.wallet_stats?.tutor_total || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-tighter">Total Owed to Tutors</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-800 to-red-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-300 relative z-10">Pending Withdrawals</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.withdrawal_stats?.pending_amount || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-red-300 uppercase tracking-tighter">{financials?.withdrawal_stats?.pending_count || 0} Requests Waiting</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">'''

new_content = target_pattern.sub(new_section, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated AdminDashboard.jsx")
else:
    print("Could not find target pattern in AdminDashboard.jsx")
