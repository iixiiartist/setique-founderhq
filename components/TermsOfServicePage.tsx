import React from 'react';
import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black bg-white shadow-neo sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-mono font-bold text-xl border-2 border-black shadow-neo-sm">
              FHQ
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono">FounderHQ</h1>
              <p className="text-xs text-gray-600">A Setique Tool</p>
            </div>
          </Link>
          <Link
            to="/"
            className="px-4 py-2 border-2 border-black hover:bg-gray-100 font-medium transition-all"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">
          <strong>Effective Date:</strong> November 5, 2025<br />
          <strong>Last Updated:</strong> November 5, 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <Section title="1. Agreement to Terms">
            <p>
              By accessing or using FounderHQ ("Service"), operated by Setique, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>FounderHQ is a SaaS platform providing founders with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI-powered business assistance</li>
              <li>Task and project management</li>
              <li>CRM and customer relationship tools</li>
              <li>Financial tracking and analytics</li>
              <li>Team collaboration features</li>
              <li>Document management</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <h3 className="text-xl font-bold mt-4 mb-2">3.1 Account Creation</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information</li>
              <li>You must be at least 18 years old</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must not share your account credentials</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">3.2 Account Types</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free Plan:</strong> Limited features (20 AI requests/month, 100MB storage)</li>
              <li><strong>Power Plan ($99/month):</strong> Unlimited AI, 5GB storage, advanced features</li>
              <li><strong>Team Pro ($149/month + $25/user):</strong> Multi-user workspaces, unlimited everything</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">3.3 Account Termination</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may cancel your account at any time through Settings</li>
              <li>We may suspend or terminate accounts for Terms violations</li>
              <li>Upon termination, you have 30 days to export your data</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use Policy">
            <p className="font-bold">You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the Service to spam, harass, or harm others</li>
              <li>Reverse engineer or copy our software</li>
              <li>Resell or redistribute the Service without permission</li>
              <li>Use automated tools to scrape or access the Service</li>
              <li>Create fake accounts or impersonate others</li>
            </ul>
          </Section>

          <Section title="5. Subscription and Payment">
            <h3 className="text-xl font-bold mt-4 mb-2">5.1 Billing</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscriptions are billed monthly</li>
              <li>Payment is due at the start of each billing period</li>
              <li>We use Stripe for secure payment processing</li>
              <li>All fees are in USD</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">5.2 Refunds</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Monthly subscriptions: No refunds for partial months</li>
              <li>Free tier: No charges, no refunds</li>
              <li>You may cancel before the next billing cycle</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">5.3 Price Changes</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may change pricing with 30 days notice</li>
              <li>Existing subscribers maintain current pricing for their billing cycle</li>
              <li>You may cancel before price changes take effect</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <h3 className="text-xl font-bold mt-4 mb-2">6.1 Our Rights</h3>
            <p>FounderHQ and all associated trademarks are owned by Setique. All software, design, content, and materials are our property. You receive a limited license to use the Service, not ownership.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">6.2 Your Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain ownership of content you upload</li>
              <li>You grant us a license to host, store, and process your content</li>
              <li>You represent that you have rights to all content you upload</li>
              <li>We may use anonymized, aggregated data for analytics</li>
            </ul>
          </Section>

          <Section title="7. AI Services">
            <h3 className="text-xl font-bold mt-4 mb-2">7.1 AI Assistant Usage</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI responses are generated by third-party services (Groq-hosted large language models)</li>
              <li>AI-generated content may not always be accurate</li>
              <li>You are responsible for verifying AI outputs</li>
              <li>AI usage is subject to quota limits based on your plan</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">7.2 AI Data Processing</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your prompts are processed by our AI providers</li>
              <li>We do not train AI models on your private data</li>
              <li>You agree to AI provider terms when using AI features</li>
            </ul>
          </Section>

          <Section title="8. Data and Privacy">
            <p>
              We collect and process data as described in our <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. Key points:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All data transmission is encrypted using SSL/TLS</li>
              <li>We use row-level security to protect your data</li>
              <li>You may export your data at any time</li>
              <li>Deleted data is removed within 30 days</li>
            </ul>
          </Section>

          <Section title="9. Service Availability">
            <h3 className="text-xl font-bold mt-4 mb-2">9.1 Uptime</h3>
            <p>We strive for 99.9% uptime but do not guarantee it. Scheduled maintenance will be announced in advance. We are not liable for downtime or service interruptions.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">9.2 Support</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free tier: Community support only</li>
              <li>Power plan: Email support within 48 hours</li>
              <li>Team Pro: Priority support within 24 hours</li>
            </ul>
          </Section>

          <Section title="10. Limitation of Liability">
            <div className="bg-yellow-50 border-2 border-black p-6">
              <p className="font-bold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES</li>
                <li>WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES</li>
                <li>OUR TOTAL LIABILITY SHALL NOT EXCEED FEES PAID IN THE LAST 12 MONTHS</li>
                <li>WE ARE NOT RESPONSIBLE FOR THIRD-PARTY SERVICES OR CONTENT</li>
                <li>YOU USE THE SERVICE AT YOUR OWN RISK</li>
              </ul>
            </div>
          </Section>

          <Section title="11. Modifications to Service">
            <p>We reserve the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify or discontinue features at any time</li>
              <li>Update these Terms with 30 days notice</li>
              <li>Change pricing with 30 days notice</li>
              <li>Require updated agreements for continued use</li>
            </ul>
          </Section>

          <Section title="12. Termination">
            <h3 className="text-xl font-bold mt-4 mb-2">12.1 By You</h3>
            <p>Cancel anytime through Settings. Cancellation is effective at the end of your billing period. Export your data before cancellation.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">12.2 By Us</h3>
            <p>We may terminate for Terms violations with immediate effect, or with 30 days notice for other reasons. Immediate termination for fraud or illegal activity.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">12.3 Effect of Termination</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access to Service ends immediately</li>
              <li>No refunds except as stated in Section 5.2</li>
              <li>We may delete your data after 30 days</li>
            </ul>
          </Section>

          <Section title="13. General Provisions">
            <h3 className="text-xl font-bold mt-4 mb-2">13.1 Governing Law</h3>
            <p>These Terms are governed by the laws of the United States. Disputes will be resolved through binding arbitration.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">13.2 Entire Agreement</h3>
            <p>These Terms constitute the entire agreement between you and Setique.</p>

            <h3 className="text-xl font-bold mt-4 mb-2">13.3 Changes to Terms</h3>
            <p>We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.</p>
          </Section>

          <Section title="14. Contact Information">
            <p>For questions about these Terms:</p>
            <div className="bg-gray-50 border-2 border-black p-6 mt-4">
              <p><strong>Email:</strong> joe@setique.com</p>
              <p><strong>Website:</strong> https://setique.com</p>
              <p><strong>Support:</strong> Available through the application</p>
            </div>
          </Section>

          <div className="bg-yellow-50 border-2 border-black p-6 mt-8">
            <p className="font-bold mb-2">Acknowledgment</p>
            <p>
              By using FounderHQ, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>&copy; 2025 Setique. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4 pb-2 border-b-2 border-black">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
