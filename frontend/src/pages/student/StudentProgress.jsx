import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, BookOpen, CheckCircle, Clock, XCircle, BarChart2 } from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';

// SVG bar chart — no dependency, pure primitives
function ScoreTrendChart({ scores }) {
    if (!scores.length) return (
        <div className="flex items-center justify-center h-48 text-slate-400 font-semibold text-sm">
            <BarChart2 size={32} className="mr-2 text-slate-300" /> No exam scores yet
        </div>
    );

    const max = 100;
    const W = 480;
    const H = 140;
    const PAD = { top: 12, right: 12, bottom: 32, left: 28 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const n = scores.length;
    const barW = Math.max(8, Math.min(28, chartW / n - 4));

    const xPos = (i) => PAD.left + (i + 0.5) * (chartW / n);
    const yPos = (score) => PAD.top + chartH * (1 - score / max);
    const barH = (score) => Math.max(2, chartH * (score / max));

    // Y-axis gridlines at 0, 50, 100
    const gridLines = [0, 50, 100];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Exam score trend chart">
            {/* Grid */}
            {gridLines.map(v => (
                <g key={v}>
                    <line
                        x1={PAD.left} y1={yPos(v)}
                        x2={W - PAD.right} y2={yPos(v)}
                        stroke="currentColor" strokeWidth="0.5"
                        className="text-slate-200 dark:text-slate-700"
                    />
                    <text x={PAD.left - 5} y={yPos(v) + 3} textAnchor="end"
                        fontSize="8" className="fill-slate-400 dark:fill-slate-600 font-semibold">{v}</text>
                </g>
            ))}
            {/* 50% pass-line emphasis */}
            <line
                x1={PAD.left} y1={yPos(50)}
                x2={W - PAD.right} y2={yPos(50)}
                stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6"
            />

            {/* Bars */}
            {scores.map((s, i) => {
                const x = xPos(i) - barW / 2;
                const y = yPos(s.score);
                const h = barH(s.score);
                const color = s.passed ? '#2563eb' : '#ef4444';
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barW} height={h}
                            fill={color} opacity="0.85" rx="2"
                        />
                        {barW >= 14 && (
                            <text x={xPos(i)} y={H - PAD.bottom + 10} textAnchor="middle"
                                fontSize="7" className="fill-slate-400 dark:fill-slate-600 font-semibold">
                                {new Date(s.date_taken).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Score labels on top of bars */}
            {scores.map((s, i) => (
                barH(s.score) > 16 ? (
                    <text key={`lbl-${i}`} x={xPos(i)} y={yPos(s.score) - 3} textAnchor="middle"
                        fontSize="7" fontWeight="700"
                        fill={s.passed ? '#1d4ed8' : '#dc2626'}>
                        {Math.round(s.score)}
                    </text>
                ) : null
            ))}
        </svg>
    );
}

function AttendanceStat({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-2`}>
                <Icon size={18} />
            </div>
            <span className="text-[11px] uppercase font-semibold tracking-wide text-slate-500">{label}</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
        </div>
    );
}

export default function StudentProgress() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchProgress = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await api.get('/api/students/me/progress/');
            setData(res.data);
        } catch (err) {
            console.error('Progress fetch failed', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProgress(); }, [fetchProgress]);

    if (loading) return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
            <SkeletonCard />
        </div>
    );

    if (loadError) return (
        <>
            <PageHeader title="Progress" description="Attendance and exam performance overview." />
            <FetchError message="Couldn't load your progress." onRetry={fetchProgress} />
        </>
    );

    const att = data?.attendance || {};
    const scores = asList(data?.score_trend);
    const subjects = asList(data?.subject_breakdown);
    const avgScore = scores.length
        ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
        : null;
    const passCount = scores.filter(s => s.passed).length;

    return (
        <>
            <title>Progress — Hidayah</title>
            <PageHeader title="My Progress" description="Attendance rate, session history, and exam performance trend." />

            {/* Attendance stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <AttendanceStat
                    icon={BookOpen}
                    label="Total Sessions"
                    value={att.total ?? 0}
                    color="bg-primary/10 text-primary"
                />
                <AttendanceStat
                    icon={CheckCircle}
                    label="Completed"
                    value={att.completed ?? 0}
                    color="bg-emerald-500/10 text-emerald-600"
                />
                <AttendanceStat
                    icon={Clock}
                    label="Upcoming"
                    value={att.upcoming ?? 0}
                    color="bg-amber-500/10 text-amber-600"
                />
                <AttendanceStat
                    icon={XCircle}
                    label="Cancelled"
                    value={att.cancelled ?? 0}
                    color="bg-rose-500/10 text-rose-500"
                />
            </div>

            {/* Attendance rate ring */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center justify-center gap-3">
                    <AttendanceRing rate={att.rate ?? 0} />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance Rate</p>
                </div>

                {/* Exam score summary */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-1.5 h-5 bg-primary rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Exam Summary</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{scores.length}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-0.5">Taken</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800">
                            <div className="text-2xl font-bold text-emerald-600">{passCount}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mt-0.5">Passed</div>
                        </div>
                        <div className={`rounded-xl p-4 text-center ${avgScore !== null && avgScore >= 50 ? 'bg-primary-soft border border-blue-100' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800'}`}>
                            <div className={`text-2xl font-bold ${avgScore !== null && avgScore >= 50 ? 'text-primary' : 'text-rose-500'}`}>
                                {avgScore !== null ? `${avgScore}%` : '—'}
                            </div>
                            <div className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${avgScore !== null && avgScore >= 50 ? 'text-primary/60' : 'text-rose-400'}`}>Avg Score</div>
                        </div>
                    </div>
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                        — Dashed line marks the 50% pass threshold
                    </p>
                </div>
            </div>

            {/* Score trend chart */}
            <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm p-6 md:p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-1.5 h-5 bg-primary rounded-full" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Score Trend</h3>
                    <div className="ml-auto flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wide">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Pass</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Fail</span>
                    </div>
                </div>
                <ScoreTrendChart scores={scores} />
            </div>

            {/* Subject attendance breakdown */}
            {subjects.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">By Subject</h3>
                    </div>
                    <div className="space-y-4">
                        {subjects.map((s, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.subject}</span>
                                    <span className="text-[11px] font-bold text-slate-500">
                                        {s.completed}/{s.total} sessions · <span className={s.rate >= 70 ? 'text-emerald-600' : s.rate >= 50 ? 'text-amber-600' : 'text-rose-500'}>{s.rate}%</span>
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${s.rate >= 70 ? 'bg-emerald-500' : s.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        style={{ width: `${s.rate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// SVG ring for attendance rate
function AttendanceRing({ rate }) {
    const R = 52;
    const circumference = 2 * Math.PI * R;
    const offset = circumference - (rate / 100) * circumference;
    const color = rate >= 70 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" />
                <circle
                    cx="60" cy="60" r={R} fill="none"
                    stroke={color} strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <div className="text-center z-10">
                <div className="text-2xl font-bold" style={{ color }}>{rate}%</div>
            </div>
        </div>
    );
}
