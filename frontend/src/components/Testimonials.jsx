import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
    {
        name: 'Aisha Bello',
        role: 'Parent · Lagos',
        avatar: 'AB',
        rating: 5,
        text: "My daughter memorized her first Juz in just 4 months. The tutor is incredibly patient and the scheduling is so flexible — we fit sessions around school hours with no stress.",
        subject: 'Hifz Program',
    },
    {
        name: 'Umar Abdullahi',
        role: 'Student · Abuja',
        avatar: 'UA',
        rating: 5,
        text: "The AI Question Hub is a game-changer for my JAMB prep. I've been scoring above 280 consistently in practice sessions. Highly recommend for any serious student.",
        subject: 'JAMB Preparation',
    },
    {
        name: 'Fatima Al-Rashid',
        role: 'Parent · Dubai (Diaspora)',
        avatar: 'FA',
        rating: 5,
        text: "We're based abroad and couldn't find quality Arabic and Islamic tutors locally. Hidayah International has been a blessing — expert teachers, Zoom-integrated, always on time.",
        subject: 'Arabic & Islamic Studies',
    },
    {
        name: 'Ibrahim Suleiman',
        role: 'Student · Kano',
        avatar: 'IS',
        rating: 5,
        text: "Started with a free trial and never looked back. My Tajweed has improved massively and my tutor sends progress reports every month so I know exactly where I stand.",
        subject: 'Quranic Recitation',
    },
];

function StarRow({ count }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    className={i < count ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                />
            ))}
        </div>
    );
}

function TestimonialCard({ t, featured }) {
    return (
        <div className={`relative rounded-card-lg p-8 flex flex-col gap-5 ${
            featured
                ? 'bg-primary text-white shadow-2xl shadow-primary/20'
                : 'bg-white border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-xl'
        } transition-all`}>
            <Quote size={28} className={featured ? 'text-white/30' : 'text-primary/20'} />

            <p className={`text-base leading-relaxed flex-1 ${featured ? 'text-white/90' : 'text-slate-600'}`}>
                "{t.text}"
            </p>

            <StarRow count={t.rating} />

            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    featured ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                }`}>
                    {t.avatar}
                </div>
                <div>
                    <p className={`font-bold text-sm ${featured ? 'text-white' : 'text-slate-900'}`}>{t.name}</p>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${featured ? 'text-white/60' : 'text-slate-400'}`}>
                        {t.role} · {t.subject}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Testimonials() {
    return (
        <section id="testimonials" className="py-24 bg-white overflow-hidden">
            <div className="container">
                <div className="text-center mb-16">
                    <span className="text-secondary font-semibold uppercase tracking-wide text-[11px] mb-4 block">
                        Student & Parent Stories
                    </span>
                    <h2 className="text-4xl md:text-5xl font-display text-primary font-bold mb-6 tracking-tighter">
                        Results That Speak
                    </h2>
                    <p className="text-slate-500 max-w-xl mx-auto text-lg leading-relaxed">
                        Join hundreds of students who have transformed their learning journey.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {TESTIMONIALS.map((t, i) => (
                        <TestimonialCard key={i} t={t} featured={i === 1} />
                    ))}
                </div>

                {/* Social proof bar */}
                <div className="mt-16 grid grid-cols-3 gap-8 border-t border-slate-100 pt-12">
                    {[
                        { value: '500+', label: 'Students Enrolled' },
                        { value: '4.9★', label: 'Average Rating' },
                        { value: '15+', label: 'Certified Tutors' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl font-display font-bold text-primary mb-1">{stat.value}</div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
