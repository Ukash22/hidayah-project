import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Users, User } from 'lucide-react';
import api from '../services/api';

const FALLBACK_PLANS = [
    {
        class_type: 'ONE_ON_ONE',
        hourly_rate: '3500',
        description: 'Dedicated one-on-one sessions with a personal tutor. Maximum focus, maximum results.',
    },
    {
        class_type: 'GROUP',
        hourly_rate: '1800',
        description: 'Learn alongside peers in small, interactive group sessions. Affordable and effective.',
    },
];

const PLAN_META = {
    ONE_ON_ONE: {
        label: 'One-on-One',
        icon: User,
        highlight: true,
        badge: 'Most Popular',
        perks: [
            'Dedicated personal tutor',
            'Flexible scheduling',
            'Progress reports monthly',
            'WhatsApp direct support',
            'AI Hub access included',
        ],
    },
    GROUP: {
        label: 'Group Class',
        icon: Users,
        highlight: false,
        badge: 'Great Value',
        perks: [
            'Small groups (2–6 students)',
            'Peer-to-peer learning',
            'Structured weekly schedule',
            'WhatsApp group support',
            'AI Hub access included',
        ],
    },
};

function PlanCard({ plan }) {
    const meta = PLAN_META[plan.class_type] || {};
    const Icon = meta.icon || User;
    const rate = parseFloat(plan.hourly_rate || 0).toLocaleString();

    return (
        <div className={`relative rounded-card-lg p-8 flex flex-col gap-6 transition-all hover:shadow-2xl ${
            meta.highlight
                ? 'bg-gradient-to-br from-primary to-indigo-800 text-white shadow-2xl shadow-primary/20 scale-[1.02]'
                : 'bg-white border border-slate-200 shadow-sm hover:border-primary/20'
        }`}>
            {meta.badge && (
                <span className={`absolute -top-3 left-8 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    meta.highlight ? 'bg-secondary text-white' : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                    {meta.badge}
                </span>
            )}

            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    meta.highlight ? 'bg-white/20' : 'bg-primary/10'
                }`}>
                    <Icon size={22} className={meta.highlight ? 'text-white' : 'text-primary'} />
                </div>
                <div>
                    <h3 className={`text-xl font-bold ${meta.highlight ? 'text-white' : 'text-slate-900'}`}>{meta.label}</h3>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${meta.highlight ? 'text-white/60' : 'text-slate-400'}`}>
                        Per hour
                    </p>
                </div>
            </div>

            <div className="flex items-baseline gap-1">
                <span className={`text-sm font-bold ${meta.highlight ? 'text-white/70' : 'text-slate-500'}`}>₦</span>
                <span className={`text-4xl font-display font-bold ${meta.highlight ? 'text-white' : 'text-slate-900'}`}>{rate}</span>
                <span className={`text-sm font-semibold ml-1 ${meta.highlight ? 'text-white/60' : 'text-slate-400'}`}>/ hr</span>
            </div>

            <p className={`text-sm leading-relaxed ${meta.highlight ? 'text-white/80' : 'text-slate-500'}`}>
                {plan.description}
            </p>

            <ul className="space-y-2.5 flex-1">
                {(meta.perks || []).map((perk, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            meta.highlight ? 'bg-white/20' : 'bg-emerald-500/10'
                        }`}>
                            <Check size={11} className={meta.highlight ? 'text-white' : 'text-emerald-600'} strokeWidth={2.5} />
                        </div>
                        <span className={`text-sm font-medium ${meta.highlight ? 'text-white/90' : 'text-slate-700'}`}>{perk}</span>
                    </li>
                ))}
            </ul>

            <Link
                to="/#trial-form"
                className={`block text-center py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${
                    meta.highlight
                        ? 'bg-white text-primary hover:bg-slate-50 shadow-white/10'
                        : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'
                }`}
            >
                Start Free Trial →
            </Link>
        </div>
    );
}

export default function Pricing() {
    const [plans, setPlans] = useState(null);

    useEffect(() => {
        api.get('/api/payments/pricing/')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setPlans(data.length > 0 ? data : FALLBACK_PLANS);
            })
            .catch(() => setPlans(FALLBACK_PLANS));
    }, []);

    const displayPlans = plans || FALLBACK_PLANS;

    return (
        <section id="pricing" className="py-24 bg-surface overflow-hidden">
            <div className="container">
                <div className="text-center mb-16">
                    <span className="text-secondary font-semibold uppercase tracking-wide text-[11px] mb-4 block">
                        Transparent Pricing
                    </span>
                    <h2 className="text-4xl md:text-5xl font-display text-primary font-bold mb-6 tracking-tighter">
                        Simple, Honest Rates
                    </h2>
                    <p className="text-slate-500 max-w-xl mx-auto text-lg leading-relaxed">
                        No hidden fees. Pay per hour. Cancel anytime.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {displayPlans.map((plan, i) => (
                        <PlanCard key={plan.class_type || i} plan={plan} />
                    ))}
                </div>

                <p className="text-center text-slate-400 text-sm mt-10 font-medium">
                    Rates are per hour · Minimum booking: 2 hrs/week · All prices in Nigerian Naira
                </p>
            </div>
        </section>
    );
}
