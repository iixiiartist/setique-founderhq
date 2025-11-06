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
  Megaphone
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
            ⚡ AI-POWERED FOUNDER DASHBOARD
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-blue-600">Plan. Track. Scale.</span>
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
            Your AI-Powered Command Center for Business Growth
          </p>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            The all-in-one workspace for founders, consultants, sales reps, and small businesses. Manage projects, track finances, engage customers, and get AI-powered insights—all in one place.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/app"
              className="px-8 py-4 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg flex items-center gap-2"
            >
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 border-2 border-black hover:bg-gray-100 font-medium text-lg transition-all"
            >
              See Features
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            No credit card required • 20 AI requests free • Cancel anytime
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perfect For</h2>
            <p className="text-lg text-gray-600">Built to support your unique workflow</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCase
              title="Founders & Startups"
              description="Build your business from idea to scale with comprehensive tools for every stage."
              emoji="🚀"
            />
            <UseCase
              title="Independent Consultants"
              description="Manage client projects, track billable hours, and deliver exceptional results."
              emoji="💼"
            />
            <UseCase
              title="Sales Representatives"
              description="Track leads, manage your pipeline, and close more deals with powerful CRM tools."
              emoji="📈"
            />
            <UseCase
              title="Small Businesses"
              description="Run your entire operation from one dashboard—projects, finances, and team management."
              emoji="🏪"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-gray-600">Built for founders, consultants, sales reps, and small business owners</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="AI Assistant"
            description="Get instant answers, generate content, and receive strategic insights powered by Google Gemini."
          />
          <FeatureCard
            icon={<Target className="w-8 h-8" />}
            title="Project & Task Management"
            description="Track tasks, set priorities, assign to team members, and manage projects with deadlines."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="CRM & Pipeline"
            description="Manage investors, customers, and partners. Perfect for sales reps tracking deals and relationships."
          />
          <FeatureCard
            icon={<Megaphone className="w-8 h-8" />}
            title="Marketing Hub"
            description="Plan campaigns, track content, manage social media, and organize marketing initiatives."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Financial Tracking"
            description="Monitor expenses, track revenue, and visualize your financial health with charts and analytics."
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Document Library"
            description="Store proposals, contracts, pitch decks, and important files in one organized place."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Calendar & Meetings"
            description="Schedule client meetings, set reminders, and keep track of all your appointments."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Team Collaboration"
            description="Share workspaces, assign tasks, and collaborate with your team in real-time."
          />
          <FeatureCard
            icon={<Clock className="w-8 h-8" />}
            title="Daily Briefings"
            description="AI-generated daily summaries of your tasks, meetings, and priorities to start each day focused."
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
              description="Perfect for exploring and getting started"
              features={[
                "20 AI requests/month",
                "25 files",
                "100 MB storage",
                "Basic AI Assistant",
                "Task Management",
                "CRM (limited)",
                "Document Library (25 files)",
                "Basic Analytics"
              ]}
              cta="Start Free"
              highlighted={false}
            />
            <PricingCard
              name="Power"
              price="$99"
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
              cta="Subscribe Now"
              highlighted={true}
            />
            <PricingCard
              name="Team Pro"
              price="$149"
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
              cta="Subscribe Now"
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
            Join founders who are using FounderHQ to grow their businesses faster.
          </p>
          <Link
            to="/app"
            className="inline-block px-8 py-4 bg-white text-black border-2 border-white shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            No credit card required • 14-day free trial
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
                A Setique Tool for ambitious founders
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

function UseCase({ title, description, emoji }: { title: string; description: string; emoji: string }) {
  return (
    <div className="p-6 border-2 border-black shadow-neo bg-white text-center">
      <div className="text-4xl mb-3">{emoji}</div>
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
