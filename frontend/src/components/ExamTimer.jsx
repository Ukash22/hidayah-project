import { useState, useEffect, useRef } from 'react';

export default function ExamTimer({ initialSeconds, isFinished, onTimeUp }) {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const onTimeUpRef = useRef(onTimeUp);
    useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

    useEffect(() => {
        if (initialSeconds > 0) setTimeLeft(initialSeconds);
    }, [initialSeconds]);

    useEffect(() => {
        if (initialSeconds <= 0 || isFinished) return;
        if (timeLeft <= 0) {
            onTimeUpRef.current();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isFinished, initialSeconds]);

    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    const formatted = `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;

    return (
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Time Remaining</span>
            <span className={`font-mono text-2xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                {formatted}
            </span>
        </div>
    );
}
