import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-surface">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 rounded-bl-full -z-10 animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary/5 rounded-full -z-10"></div>

            <div className="container grid md:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="inline-block py-1 px-4 rounded-full bg-secondary/10 text-secondary font-semibold text-sm mb-6 uppercase tracking-wider">
                        International Standards of Learning
                    </span>
                    <h1 className="text-5xl md:text-7xl mb-6 text-primary">
                        Global Scholars for <span className="text-secondary">HIDAYAH International</span>
                    </h1>
                    <p className="text-lg text-text-light mb-8 max-w-lg font-medium">
                        Connect with expert tutors globally. Our international platform brings together <span className="font-bold text-primary">Western Academic Excellence</span> and <span className="font-bold text-secondary">Timeless Islamic Wisdom</span> to your home.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <a href="#trial-form" className="btn btn-primary px-8 py-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            <span>Apply for Free Trial Class</span>
                            <span className="text-xl">🚀</span>
                        </a>
                        <a href="/exam-practice" className="btn bg-white border border-slate-200 text-primary px-8 py-4 hover:bg-slate-50 flex items-center justify-center gap-2">
                            <span>HITIS CBT Center</span>
                            <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full uppercase animate-pulse">New</span>
                        </a>
                    </div>

                    {/* Highlights Grid */}
                    <div className="grid grid-cols-4 gap-4 border-t border-slate-100 pt-8">
                        <div>
                            <p className="font-bold text-primary text-lg text-nowrap">Certified</p>
                            <p className="text-text-light text-xs">Expert Tutors</p>
                        </div>
                        <div>
                            <p className="font-bold text-primary text-lg text-nowrap">Global</p>
                            <p className="text-text-light text-xs">International</p>
                        </div>
                        <div>
                            <p className="font-bold text-primary text-lg text-nowrap">AI Hub</p>
                            <p className="text-secondary text-xs font-black">Powered Learning</p>
                        </div>
                        <div>
                            <p className="font-bold text-primary text-lg text-nowrap">CBT</p>
                            <p className="text-secondary text-xs font-black">Exam Prep</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative hidden md:block"
                >
                    <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                        <div className="aspect-[4/5] bg-gradient-to-tr from-primary to-secondary relative flex items-end p-8">
                            <img
                                src="https://images.unsplash.com/photo-1596524430615-b46476dd9eb8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                alt="Student learning Quran"
                                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                            />
                            <div className="relative z-10 text-white">
                                <p className="text-3xl font-display font-bold mb-2">"Knowledge is Light"</p>
                                <p className="text-white/80">Connect with the Quran, anywhere.</p>
                            </div>
                        </div>
                    </div>

                    {/* Floating Badges */}
                    <div className="absolute -top-6 -right-6 glass p-4 rounded-2xl shadow-lg z-20 animate-bounce transition-all duration-300">
                        <p className="text-secondary font-bold">1-on-1 Classes</p>
                    </div>
                    <div className="absolute -bottom-6 -left-6 glass p-4 rounded-2xl shadow-lg z-20">
                        <p className="text-primary font-bold">Zoom Integrated</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
