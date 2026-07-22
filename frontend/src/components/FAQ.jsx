import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
    {
        q: 'Do you offer a free trial class?',
        a: "Yes! We offer a complimentary trial class for all new students. Simply fill in the trial form at the bottom of this page and our team will match you with a tutor within 24 hours.",
    },
    {
        q: 'What age groups do you teach?',
        a: "We teach students of all ages — from young children starting Quranic recitation to adult learners pursuing Islamic studies, Arabic, and academic subjects. Our tutors adapt their style to each age group.",
    },
    {
        q: 'Are classes one-on-one or in groups?',
        a: "Both options are available. One-on-One classes provide a fully personalized experience with maximum tutor attention. Group classes (2–6 students) are more affordable and foster peer learning.",
    },
    {
        q: 'How do online classes work?',
        a: "Sessions are conducted live via Zoom or Google Meet. Your tutor will send you a link before each class. We also provide access to a shared whiteboard for notes, diagrams, and Quran text markup.",
    },
    {
        q: 'Can I choose my own tutor?',
        a: "Absolutely. You can browse tutor profiles and request a preferred tutor during registration. You can also be matched automatically based on your subject, schedule, and learning level.",
    },
    {
        q: 'What payment methods are accepted?',
        a: "We accept payments via Paystack (debit card, bank transfer) and wallet top-ups. Payments are charged per hour and you can manage everything from your student dashboard.",
    },
    {
        q: 'What subjects are available?',
        a: "We cover Quranic Recitation (Tajweed), Hifz (Memorisation), Arabic Foundation, Islamic Studies (Fiqh, Hadith, History), and Western Academic subjects including Mathematics, English, and Sciences for all school levels.",
    },
];

function FAQItem({ item, isOpen, onToggle }) {
    return (
        <div className={`rounded-xl border transition-all overflow-hidden ${
            isOpen
                ? 'border-primary/30 bg-primary/5 shadow-sm'
                : 'border-slate-200 bg-white hover:border-primary/20'
        }`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={isOpen}
            >
                <span className={`font-bold text-sm ${isOpen ? 'text-primary' : 'text-slate-800'}`}>
                    {item.q}
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform text-primary ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed border-t border-primary/10 pt-4">
                    {item.a}
                </div>
            )}
        </div>
    );
}

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(0);

    const toggle = (i) => setOpenIndex(openIndex === i ? -1 : i);

    const half = Math.ceil(FAQS.length / 2);
    const col1 = FAQS.slice(0, half);
    const col2 = FAQS.slice(half);

    return (
        <section id="faq" className="py-24 bg-surface overflow-hidden">
            <div className="container">
                <div className="text-center mb-16">
                    <span className="text-secondary font-semibold uppercase tracking-wide text-[11px] mb-4 block">
                        Got Questions?
                    </span>
                    <h2 className="text-4xl md:text-5xl font-display text-primary font-bold mb-6 tracking-tighter">
                        Frequently Asked
                    </h2>
                    <p className="text-slate-500 max-w-xl mx-auto text-lg leading-relaxed">
                        Everything you need to know before getting started.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                    <div className="space-y-3">
                        {col1.map((item, i) => (
                            <FAQItem
                                key={i}
                                item={item}
                                isOpen={openIndex === i}
                                onToggle={() => toggle(i)}
                            />
                        ))}
                    </div>
                    <div className="space-y-3">
                        {col2.map((item, i) => {
                            const globalIdx = i + half;
                            return (
                                <FAQItem
                                    key={globalIdx}
                                    item={item}
                                    isOpen={openIndex === globalIdx}
                                    onToggle={() => toggle(globalIdx)}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="mt-14 text-center">
                    <p className="text-slate-500 mb-4 text-sm">Still have questions?</p>
                    <a
                        href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '2348000000000'}?text=Hello%20Hidayah%2C%20I%20have%20a%20question%20about%20enrolment`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25d366] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#25d366]/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        {/* WhatsApp icon via SVG path */}
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Chat with us on WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}
