import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Users, 
  Brain, 
  BarChart3, 
  FileText, 
  Calendar,
  Shield,
  Clock,
  Target,
  ChevronRight,
  Check,
  ArrowRight,
  Megaphone,
  Rocket,
  Briefcase,
  TrendingUp,
  Store,
  Code,
  DollarSign,
  Handshake,
  Sparkles
} from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b border-black bg-white shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-mono font-bold text-xl border-2 border-black shadow-neo-sm">
              FHQ
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono">FounderHQ</h1>
              <p className="text-xs text-gray-600">A Setique Tool</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Link
              to="/app"
              className="px-4 py-2 border-2 border-black hover:bg-gray-100 font-medium transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/app"
              className="px-4 py-2 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-yellow-300 border-2 border-black shadow-neo font-mono text-sm font-bold">
            ⚡ LIGHTWEIGHT AI-POWERED GTM HUB
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-blue-600">Everything You Need to Run GTM in One Place</span>
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
            CRM • AI Assistants • Collaboration • GTM Docs
          </p>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Manage your entire go-to-market workflow with smart CRM, context-aware AI assistants, team collaboration tools, and premium documents. Purpose-built for founders, sales teams, and consultants who need a lightweight alternative to bloated enterprise platforms.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/app"
              className="px-8 py-4 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg flex items-center gap-2"
            >
              Start Free <ArrowRight size={20} />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 border-2 border-black hover:bg-gray-100 font-medium text-lg transition-all"
            >
              See Features
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Free forever • Upgrade anytime • No credit card required
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Your Lightweight Alternative to Bloated Platforms</h2>
            <p className="text-lg text-gray-600">Stop juggling 10 tools. Get CRM, AI, collaboration, and docs in one focused workspace</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCase
              title="Founders"
              description="Track investor relationships, manage product development, and monitor business metrics in one place."
              icon={<Rocket className="w-8 h-8" />}
            />
            <UseCase
              title="Consultants"
              description="Manage multiple client projects, organize deliverables, and keep client communications organized."
              icon={<Briefcase className="w-8 h-8" />}
            />
            <UseCase
              title="Sales Professionals"
              description="Track your customer pipeline, manage follow-ups, and never miss a deal opportunity."
              icon={<TrendingUp className="w-8 h-8" />}
            />
            <UseCase
              title="Small Business Owners"
              description="Manage day-to-day operations, track expenses, and coordinate your team's tasks."
              icon={<Store className="w-8 h-8" />}
            />
          </div>
        </div>
      </section>

      {/* AI Features Highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-black shadow-neo-lg p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 bg-purple-300 border-2 border-black shadow-neo font-mono text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI-POWERED INSIGHTS
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Context-Aware AI Assistants</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Every module has a dedicated AI assistant tuned to your specific business function. Each assistant has real-time access to your business profile, CRM data, tasks, documents, and calendar—providing relevant insights based on your actual workspace data. Available on Power and Team Pro plans.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-5 h-5" />
                  <h3 className="font-bold">Platform AI</h3>
                </div>
                <p className="text-sm text-gray-600">Get technical guidance, prioritize features, and manage your product development roadmap.</p>
              </div>
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5" />
                  <h3 className="font-bold">Fundraising AI</h3>
                </div>
                <p className="text-sm text-gray-600">Research investors, draft outreach emails, and manage your fundraising pipeline.</p>
              </div>
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5" />
                  <h3 className="font-bold">Sales AI</h3>
                </div>
                <p className="text-sm text-gray-600">Generate proposals, track customer conversations, and get deal-closing strategies.</p>
              </div>
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="w-5 h-5" />
                  <h3 className="font-bold">Partnerships AI</h3>
                </div>
                <p className="text-sm text-gray-600">Identify partnership opportunities, structure deals, and manage strategic relationships.</p>
              </div>
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-5 h-5" />
                  <h3 className="font-bold">Marketing AI</h3>
                </div>
                <p className="text-sm text-gray-600">Plan campaigns, generate content ideas, and optimize your marketing strategy.</p>
              </div>
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <h3 className="font-bold">Financials AI</h3>
                </div>
                <p className="text-sm text-gray-600">Analyze expenses, forecast revenue, and get insights on your financial performance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">All Your GTM Tools in One Hub</h2>
          <p className="text-xl text-gray-600">CRM, AI, collaboration, docs, tasks, calendar, and analytics—working together seamlessly</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="3-in-1 Smart CRM"
            description="Separate pipelines for Investors, Customers, and Partners. Track contacts, meetings, deal stages, and values. Assign leads to team members and never miss a follow-up with AI-powered insights."
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="Context-Aware AI Assistants"
            description="Module-specific AI for fundraising, sales, partnerships, marketing, and product. Each assistant understands your business profile and can reference your documents, CRM, and tasks for relevant insights."
          />
          <FeatureCard
            icon={<Target className="w-8 h-8" />}
            title="Smart Task Management"
            description="Organize tasks by module (Platform, Investor, Customer, Partner, Marketing). Assign to team members, set priorities, track progress, and earn XP for completions with gamification."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Team Collaboration"
            description="Invite team members to shared workspaces. Assign tasks and CRM leads. Track team XP and achievements. Role-based permissions for security. Real-time updates across all modules."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Unified Calendar View"
            description="See all your tasks, meetings, and marketing deadlines in one place. Color-coded by module, filterable by priority, with quick-add for events. Sync with external calendars."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Financial Tracking & Analytics"
            description="Log MRR, GMV, signups, and expenses. Visualize trends with interactive charts. Track runway and burn rate. Export data for deeper analysis and reporting."
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Premium GTM Documents"
            description="Create professional documents with 24 formatting tools, charts & graphs, custom fonts, colors, and page breaks. Export to PDF/Word. Includes 5 GTM templates for common use cases."
          />
          <FeatureCard
            icon={<Megaphone className="w-8 h-8" />}
            title="Marketing Campaign Planner"
            description="Plan blog posts, newsletters, social campaigns, and events. Track status from draft to published. Link to CRM contacts and tag relevant stakeholders for coordination."
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="AI-Powered Workflows"
            description="Generate charts from data, get document suggestions, automate CRM insights, and receive smart task recommendations. AI adapts to your workspace and business context."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your stage</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="/month"
              description="Perfect for exploring the platform"
              features={[
                "Task Management",
                "Basic CRM (limited)",
                "Calendar View",
                "Basic Analytics",
                "100 MB Storage",
                "No AI Access",
                "No Document Library"
              ]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Power"
              price="$49"
              period="/month"
              description="For serious founders building their business"
              features={[
                "Unlimited AI requests/month",
                "Unlimited files",
                "5 GB storage",
                "Unlimited AI Assistant",
                "Unlimited Tasks",
                "Full CRM Features",
                "Unlimited Documents",
                "Advanced Analytics",
                "Priority Support",
                "Export Data",
                "API Access"
              ]}
              cta="Get Started"
              highlighted={true}
            />
            <PricingCard
              name="Team Pro"
              price="$99"
              period="/month"
              description="For teams collaborating together"
              additionalPricing="+ $25/user/month"
              features={[
                "Unlimited AI requests/month per user",
                "Unlimited files per user",
                "10 GB storage shared",
                "All Power Features",
                "Team Collaboration",
                "Shared Workspaces",
                "Team Achievements",
                "Member Management",
                "Team Analytics",
                "Role-Based Access",
                "Advanced Permissions",
                "Priority Team Support"
              ]}
              cta="Get Started"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <FAQItem
            question="Can I change plans later?"
            answer="Yes! You can upgrade or downgrade anytime from your settings."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards through Stripe."
          />
          <FAQItem
            question="Is there a free trial?"
            answer="The Free plan is available forever! Upgrade when you're ready."
          />
          <FAQItem
            question="How does team billing work?"
            answer="You pay a base price plus per-seat pricing. Add or remove seats anytime."
          />
          <FAQItem
            question="What happens to my data?"
            answer="Your data is stored securely using industry-standard encryption. You own your data and can export it anytime. If you delete your account, we permanently remove your data within 30 days."
          />
          <FAQItem
            question="Is my data secure?"
            answer="Absolutely. We use SSL/TLS encryption for all data transmission, row-level security in our database, and regular security audits. Your data is hosted on secure cloud infrastructure."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Build Smarter?</h2>
          <p className="text-xl mb-8 text-gray-300">
            Start free and upgrade when you're ready to scale.
          </p>
          <Link
            to="/app"
            className="inline-block px-8 py-4 bg-white text-black border-2 border-white shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg"
          >
            Get Started Free
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            No credit card required • Upgrade anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-bold border-2 border-black">
                  FHQ
                </div>
                <span className="font-bold font-mono">FounderHQ</span>
              </div>
              <p className="text-sm text-gray-600">
                Your lightweight, AI-powered hub for GTM
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#features" className="hover:text-black">Features</a></li>
                <li><a href="#pricing" className="hover:text-black">Pricing</a></li>
                <li><Link to="/app" className="hover:text-black">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/privacy" className="hover:text-black">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-black">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>joe@setique.com</li>
                <li>setique.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>&copy; 2025 Setique. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function UseCase({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 border-2 border-black shadow-neo bg-white text-center">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 bg-blue-100 border-2 border-black flex items-center justify-center">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-white">
      <div className="w-12 h-12 bg-blue-100 border-2 border-black flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  period, 
  description,
  additionalPricing,
  features, 
  cta, 
  highlighted
}: { 
  name: string; 
  price: string; 
  period: string; 
  description: string;
  additionalPricing?: string;
  features: string[]; 
  cta: string; 
  highlighted: boolean;
}) {
  return (
    <div className={`p-8 border-2 border-black ${highlighted ? 'bg-yellow-50 shadow-neo-lg' : 'bg-white shadow-neo'} relative`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-300 border-2 border-black font-bold text-sm">
          MOST POPULAR
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <div className="mb-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-gray-600">{period}</span>
        </div>
        {additionalPricing && (
          <div className="text-sm text-gray-600 font-medium mb-2">
            {additionalPricing}
          </div>
        )}
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/app"
        className={`block w-full py-3 text-center border-2 border-black font-medium transition-all ${
          highlighted 
            ? 'bg-black text-white shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' 
            : 'bg-white hover:bg-gray-100'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-2 border-black shadow-neo bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-lg pr-4">{question}</span>
        <ChevronRight className={`w-6 h-6 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-gray-700 leading-relaxed border-t-2 border-black pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}
