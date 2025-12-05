import React from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-semibold text-xl rounded-xl shadow-sm">
              FHQ
            </div>
            <div>
              <h1 className="text-xl font-bold">Setique: FounderHQ</h1>
              <p className="text-xs text-gray-600">A Setique Tool</p>
            </div>
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium transition-all"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">
          <strong>Effective Date:</strong> November 5, 2025<br />
          <strong>Last Updated:</strong> November 5, 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <Section title="1. Introduction">
            <p>
              Welcome to Setique: FounderHQ ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services operated by Setique.
            </p>
            <p>
              By using Setique: FounderHQ, you consent to the data practices described in this policy.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="text-xl font-bold mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password</li>
              <li><strong>Profile Information:</strong> Business details, workspace settings, preferences</li>
              <li><strong>User Content:</strong> Tasks, notes, documents, CRM data, financial records, calendar events</li>
              <li><strong>Communication Data:</strong> Messages sent through our AI assistant and team chat features</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Features used, actions taken, time spent, pages viewed</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address, device identifiers</li>
              <li><strong>Analytics Data:</strong> Application performance, error logs, feature usage statistics</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">2.3 Third-Party Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication:</strong> Supabase for secure authentication</li>
              <li><strong>AI Services:</strong> Groq-hosted large language models for assistant features</li>
              <li><strong>Payment Processing:</strong> Stripe for subscription payments</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Process transactions and send related information</li>
              <li>Provide AI-powered assistance and recommendations</li>
              <li>Send administrative information, updates, and security alerts</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Enforce plan entitlements (including free-tier Copilot credits and unlimited storage abuse prevention)</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Data Storage and Security">
            <h3 className="text-xl font-bold mt-4 mb-2">4.1 Data Storage</h3>
            <p>
              Your data is stored securely using Supabase (PostgreSQL database) on secure cloud infrastructure with industry-standard encryption. We perform regular automated backups to prevent data loss, retained for 90 days.
            </p>

            <h3 className="text-xl font-bold mt-4 mb-2">4.2 Security Measures</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>All data transmission is encrypted using SSL/TLS</li>
              <li>Passwords are hashed and never stored in plain text</li>
              <li>Row-level security policies protect your data from unauthorized access</li>
              <li>Regular security audits and updates</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              However, no system is 100% secure. While we implement strong security measures, we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="5. Data Sharing and Disclosure">
            <p className="font-bold">We do NOT sell your personal information.</p>
            <p>We may share your information only in the following circumstances:</p>

            <h3 className="text-xl font-bold mt-4 mb-2">5.1 Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Groq:</strong> AI-powered assistant features</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Netlify:</strong> Application hosting and delivery</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">5.2 Legal Requirements</h3>
            <p>We may disclose your information if required by law or in response to valid requests by public authorities (e.g., court orders, government requests).</p>

            <h3 className="text-xl font-bold mt-4 mb-2">5.3 Business Transfers</h3>
            <p>If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.</p>
          </Section>

          <Section title="6. Your Data Rights">
            <h3 className="text-xl font-bold mt-4 mb-2">6.1 Access and Portability</h3>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Export your data in a portable format (JSON/CSV)</li>
              <li>Request a copy of your data</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">6.2 Correction and Deletion</h3>
            <p>You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Update your account information at any time through Settings</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Delete specific content (tasks, notes, documents) at any time</li>
            </ul>

            <h3 className="text-xl font-bold mt-4 mb-2">6.3 Data Retention</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Active account data is retained while your account is active</li>
              <li>Deleted data is permanently removed within 30 days</li>
              <li>Backup data is retained for 90 days for disaster recovery</li>
            </ul>
          </Section>

          <Section title="7. AI and Machine Learning">
            <h3 className="text-xl font-bold mt-4 mb-2">7.1 AI Assistant Usage</h3>
            <p>
              Your prompts and conversations with the AI assistant are processed by Groq-hosted large language models. We only send necessary context to AI services (your prompts and relevant workspace data). We do not train custom AI models on your data.
            </p>

            <h3 className="text-xl font-bold mt-4 mb-2">7.2 Opting Out</h3>
            <p>You can opt out of AI features at any time through your settings.</p>
          </Section>

          <Section title="8. Cookies and Tracking">
            <p>We use essential cookies and local storage to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain your session and keep you logged in</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze application performance</li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Setique: FounderHQ is not intended for users under 18 years of age. We do not knowingly collect information from children under 18. If you become aware that a child has provided us with personal information, please contact us.
            </p>
          </Section>

          <Section title="10. International Users">
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data.
            </p>
          </Section>

          <Section title="11. California Privacy Rights (CCPA)">
            <p>California residents have additional rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale of personal information (we don't sell data)</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
          </Section>

          <Section title="12. GDPR Rights (European Users)">
            <p>If you are in the European Economic Area, you have rights under GDPR:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access, rectification, and erasure</li>
              <li>Right to restrict processing and data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with supervisory authorities</li>
            </ul>
          </Section>

          <Section title="13. Changes to This Privacy Policy">
            <p>We may update this Privacy Policy periodically. We will notify you of any material changes by:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending an email notification (for significant changes)</li>
            </ul>
          </Section>

          <Section title="14. Contact Us">
            <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4">
              <p><strong>Email:</strong> joe@setique.com</p>
              <p><strong>Website:</strong> https://setique.com</p>
              <p><strong>Support:</strong> Available through the application</p>
            </div>
          </Section>

          <Section title="15. Beta Program & Fair Use">
            <p>Setique: FounderHQ is currently offered as a live beta. Feature scope, AI credit allocations (including the 25 monthly Copilot requests on the Free plan), and pricing may change as we evolve the service.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All plans include unlimited document storage and file uploads. We reserve the right to investigate and limit abusive usage that threatens platform reliability.</li>
              <li>Free-tier AI credits automatically reset each calendar month. We may temporarily suspend AI access if we detect malicious or automated traffic.</li>
              <li>We will provide notice before making material changes to quotas or pricing, and you may cancel at any time via the Settings page.</li>
            </ul>
          </Section>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-8">
            <p className="font-bold mb-2">Acknowledgment</p>
            <p>
              By using Setique: FounderHQ, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
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
      <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
