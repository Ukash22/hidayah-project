import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HITISFeatures from '../components/HITISFeatures'
import About from '../components/About'
import Tutors from '../components/Tutors'
import Curriculum from '../components/Curriculum'
import Pricing from '../components/Pricing'
import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'
import TrialForm from '../components/TrialForm'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '2348000000000'
const WHATSAPP_MESSAGE = 'Hello%20Hidayah%2C%20I%27d%20like%20to%20learn%20more%20about%20your%20tutoring%20programmes'

const WhatsAppFloat = () => (
    <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center shadow-xl shadow-[#25d366]/30 hover:scale-110 active:scale-95 transition-all"
    >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    </a>
)

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
                <Pricing />
                <Testimonials />
                <FAQ />
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
                                <li><Link to="/#pricing" className="hover:text-secondary">Pricing</Link></li>
                                <li><Link to="/#faq" className="hover:text-secondary">FAQ</Link></li>
                                <li><Link to="/tutor/register" className="text-secondary font-bold hover:underline">Join our Tutor Team</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Connect</h4>
                            <ul className="space-y-2 text-white/70">
                                <li>Email: info@hidayahinternational.com</li>
                                <li>Social: @hidayahinternational</li>
                                <li>
                                    <a
                                        href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#25d366] font-semibold hover:underline flex items-center gap-1"
                                    >
                                        WhatsApp Us ↗
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
                        © 2026 Hidayah International Tutor Platform. All rights reserved.
                    </div>
                </div>
            </footer>

            <WhatsAppFloat />
        </div>
    )
}

export default Home
