import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

export default function AdminRevenueChart({ financials, chartMode, onModeChange }) {
    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Revenue Velocity</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Growth Trend & Processing History</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                    {['daily', 'weekly', 'monthly'].map(m => (
                        <button
                            key={m}
                            onClick={() => onModeChange(m)}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartMode === m ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financials?.charts?.[chartMode] || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey={chartMode === 'daily' ? 'day' : chartMode === 'weekly' ? 'week' : 'month'}
                            axisLine={false} tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                            tickFormatter={(v) => { try { return new Date(v).toLocaleDateString(undefined, { month: 'short', day: chartMode === 'daily' ? 'numeric' : undefined }); } catch { return v; } }}
                            dy={10}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `₦${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(value) => [`₦${parseFloat(value).toLocaleString()}`, 'Revenue']} />
                        <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={chartMode === 'daily' ? 12 : 32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
