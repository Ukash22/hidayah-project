import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="container pt-32 pb-20 max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-text mb-2">Terms of Service</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: June 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Hidayah platform, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">2. Use of the Platform</h2>
            <p>Hidayah provides online tutoring services connecting students, tutors, and parents. You agree to use the platform only for lawful educational purposes and in accordance with these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">3. Accounts and Registration</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information during registration. Accounts are non-transferable.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">4. Payments and Refunds</h2>
            <p>All payments are processed securely through our payment partners. Wallet balances are non-refundable except as required by applicable law. Session fees are charged as agreed between the tutor and student at the time of booking.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">5. Tutor Obligations</h2>
            <p>Tutors must provide accurate credentials and qualifications. Hidayah reserves the right to verify identity and credentials at any time and to suspend or terminate accounts that fail verification.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">6. Intellectual Property</h2>
            <p>All content on the platform, including course materials, is either owned by Hidayah or licensed for use. You may not reproduce, distribute, or create derivative works without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">7. Limitation of Liability</h2>
            <p>Hidayah is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our total liability is limited to the amount paid by you in the preceding 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">8. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">9. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@hidayah.ng" className="text-primary hover:underline">support@hidayah.ng</a>.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex gap-4 text-sm">
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/" className="text-text-muted hover:text-text">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
