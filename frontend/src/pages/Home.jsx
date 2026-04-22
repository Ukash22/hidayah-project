import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HITISFeatures from '../components/HITISFeatures'
import About from '../components/About'
import Tutors from '../components/Tutors'
import Curriculum from '../components/Curriculum'
import TrialForm from '../components/TrialForm'

const Home = () => {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main>
                <Hero />
                <HITISFeatures />
                <About />
                <Tutors />
                <Curriculum />
                <TrialForm />
            </main>

            <footer className="bg-primary text-white py-12">
                <div className="container">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="col-span-2">
                            <h3 className="text-2xl font-bold mb-4">Hidayah International Tutor Platform</h3>
                            <p className="text-white/70 max-w-sm">
                                Providing accessible, high-standard Islamic and Western education to students worldwide through modern technology and expert guidance.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Quick Links</h4>
                            <ul className="space-y-2 text-white/70">
                                <li><Link to="/#about" className="hover:text-secondary">About Us</Link></li>
                                <li><Link to="/#tutors" className="hover:text-secondary">Tutors</Link></li>
                                <li><Link to="/#curriculum" className="hover:text-secondary">Curriculum</Link></li>
                                <li><Link to="/tutor/register" className="text-secondary font-bold hover:underline">Join our Tutor Team</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Connect</h4>
                            <ul className="space-y-2 text-white/70">
                                <li>Email: info@hidayahinternational.com</li>
                                <li>Social: @hidayahinternational</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
                        © 2026 Hidayah International Tutor Platform. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Home
