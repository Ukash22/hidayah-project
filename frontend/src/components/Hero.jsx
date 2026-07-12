// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, MonitorCheck } from 'lucide-react';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-surface">
            {/* Static gradient wash — decoration shouldn't animate (UI-4) */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(30,64,175,0.07),transparent),radial-gradient(50%_60%_at_10%_90%,rgba(14,165,233,0.06),transparent)]"></div>

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
                        <Link to="/#trial-form" className="btn btn-primary px-8 py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            <span>Apply for Free Trial Class</span>
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/exam-practice" className="btn bg-white border border-slate-200 text-primary px-8 py-4 hover:bg-slate-50 flex items-center justify-center gap-2">
                            <MonitorCheck size={18} className="text-secondary" />
                            <span>HITIS CBT Center</span>
                            <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-semibold rounded-full uppercase tracking-wide">New</span>
                        </Link>
                    </div>

                    {/* Highlights Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-8">
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
                            <p className="text-secondary text-xs font-bold">Powered Learning</p>
                        </div>
                        <div>
                            <p className="font-bold text-primary text-lg text-nowrap">CBT</p>
                            <p className="text-secondary text-xs font-bold">Exam Prep</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative hidden md:block"
                >
                    <div className="relative z-10 rounded-card-lg overflow-hidden shadow-2xl border-8 border-white">
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
                    <div className="absolute -top-6 -right-6 glass p-4 rounded-2xl shadow-lg z-20">
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
