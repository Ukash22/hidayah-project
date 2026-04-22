import React from 'react';
import { motion } from 'framer-motion';

const HITISFeatures = () => {
    const features = [
        {
            title: "CBT Practice Center",
            description: "Prepare for JAMB, WAEC & NECO with our state-of-the-art Computer Based Test simulation.",
            icon: "📝",
            link: "/exam-practice",
            color: "from-blue-600 to-indigo-700",
            badge: "Exam Prep"
        },
        {
            title: "AI Question Hub",
            description: "Generate personalized practice questions based on your specific curriculum and year range.",
            icon: "✨",
            link: "/ai-hub",
            color: "from-amber-500 to-amber-700",
            badge: "Smart AI"
        }
    ];

    return (
        <section id="features" className="py-24 bg-white overflow-hidden">
            <div className="container">
                <div className="text-center mb-16">
                    <span className="text-secondary font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">New HITIS Modules</span>
                    <h2 className="text-4xl md:text-5xl font-display text-primary font-black mb-6 tracking-tighter">Global Academic Tools</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                        We've integrated modern technology to help you excel in <span className="font-bold text-primary italic">Western Academic Subjects</span> and <span className="font-bold text-secondary italic">Timeless Islamic Sciences</span>.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -10 }}
                            className={`relative overflow-hidden group bg-gradient-to-br ${feature.color} p-10 rounded-[2.5rem] shadow-2xl hover:shadow-primary/30 transition-all cursor-pointer`}
                            onClick={() => window.location.href = feature.link}
                        >
                            <div className="relative z-10">
                                <span className="inline-block px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-6">
                                    {feature.badge}
                                </span>
                                <h3 className="text-3xl font-display text-white font-black mb-4">{feature.title}</h3>
                                <p className="text-white/80 text-lg font-medium mb-8 leading-relaxed">
                                    {feature.description}
                                </p>
                                <div className="flex items-center gap-4">
                                    <span className="bg-white text-primary px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all group-hover:bg-secondary group-hover:text-white">
                                        Explore Now
                                    </span>
                                    <span className="text-white/60 text-sm font-bold uppercase tracking-tighter group-hover:translate-x-2 transition-transform">
                                        Get Started →
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -right-12 -bottom-12 text-[15rem] opacity-10 group-hover:rotate-12 group-hover:scale-110 transition-all select-none">
                                {feature.icon}
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HITISFeatures;
