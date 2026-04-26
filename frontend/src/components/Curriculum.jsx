import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const Curriculum = () => {
    const courses = [
        { title: "Quranic Recitation", levels: "Beginner to Advanced", description: "Master Tajweed rules with 1-on-1 focus." },
        { title: "Arabic Foundation", levels: "Levels 1-4", description: "Comprehensive reading, writing, and speaking." },
        { title: "Islamic Studies", levels: "All Ages", description: "Fiqh, Hadith, and Islamic History integrated." },
        { title: "Hifz Program", levels: "Personalized", description: "Memorization with experienced Hafiz tutors." },
        { title: "Western Sciences & Math", levels: "Primary to High School", description: "STEM-focused curriculum following international academic standards." },
        { title: "English Language Arts", levels: "All Grades", description: "Comprehensive reading, writing, grammar, and literature mastery." }
    ];

    return (
        <section id="curriculum" className="bg-white">
            <div className="container">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="md:w-1/3">
                        <h2 className="text-4xl text-primary mb-6 leading-tight">Structured <span className="text-secondary">Western & Islamic Curriculum</span> for All</h2>
                        <p className="text-text-light mb-8"> Our programs are designed by educational experts to ensure progressive academic learning and spiritual growth, following international standards.</p>
                        <div className="space-y-4">
                            {["International Certification", "Personalized Pace", "Modern Digital Tools"].map(check => (
                                <div key={check} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                                    <span className="font-semibold text-primary">{check}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {courses.map((course, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                className="p-8 rounded-3xl bg-surface border border-slate-100 hover:border-primary/20 transition-all"
                            >
                                <h3 className="text-xl text-primary mb-2">{course.title}</h3>
                                <span className="inline-block px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold mb-4">{course.levels}</span>
                                <p className="text-text-light text-sm">{course.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Curriculum;
