import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
    const sections = [
        {
            title: "Our Platform",
            content: "Hidayah International is a premier global tutoring platform bridging Western academic excellence with timeless Islamic wisdom through advanced technology.",
            icon: "🌏"
        },
        {
            title: "Global Tutors",
            content: "Access highly qualified educators and scholars from across the globe, vetted for their expertise in both conventional subjects and Islamic sciences.",
            icon: "🎓"
        },
        {
            title: "Mission & Vision",
            content: "To empower students worldwide with high-standard, accessible digital learning that nurtures both intellectual and spiritual growth.",
            icon: "🚀"
        }
    ];

    return (
        <section id="about" className="bg-white">
            <div className="container">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl text-primary mb-4 font-black tracking-tight uppercase">Excellence in Global Learning</h2>
                    <div className="h-1.5 w-16 bg-secondary mx-auto mb-6"></div>
                    <p className="text-text-light">Discover what makes our international platform the preferred choice for students around the world.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {sections.map((item, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ y: -10 }}
                            className="p-8 rounded-2xl border border-slate-100 hover:shadow-xl transition-all duration-300 bg-surface"
                        >
                            <div className="text-4xl mb-6">{item.icon}</div>
                            <h3 className="text-xl text-primary mb-4">{item.title}</h3>
                            <p className="text-text-light text-sm leading-relaxed">
                                {item.content}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default About;
