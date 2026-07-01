import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="container pt-32 pb-20 max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-text mb-2">Privacy Policy</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: June 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly (name, email, phone number, NIN for tutors), information generated through platform use (session records, payment history, exam results), and technical information (device type, IP address, browser).</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">2. How We Use Your Information</h2>
            <p>We use your information to: provide and improve the platform; process payments; match students with tutors; send notifications about your account and sessions; comply with legal obligations; and ensure platform security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">3. Children's Privacy</h2>
            <p>Our platform serves students of all ages, including minors. For users under 18, we require parental or guardian consent at registration. We do not knowingly collect personal information from children under 13 without verified parental consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal data. We share data with: tutors and students as necessary for sessions; payment processors to complete transactions; cloud storage providers (Cloudinary) for media files; and as required by Nigerian law or court order.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. Payment records are retained for 7 years as required by Nigerian financial regulations. You may request deletion of your account and associated data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">6. Security</h2>
            <p>We use industry-standard encryption and access controls to protect your data. Tutor credentials (including NIN) are verified through secure channels and stored encrypted. However, no system is completely secure — please use a strong, unique password.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may also object to certain processing or request data portability. To exercise these rights, contact us at the address below.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text mb-3">8. Contact</h2>
            <p>For privacy questions or data requests, contact us at <a href="mailto:privacy@hidayah.ng" className="text-primary hover:underline">privacy@hidayah.ng</a>.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex gap-4 text-sm">
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/" className="text-text-muted hover:text-text">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
