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
            ⚡ FOR SEED-STAGE FOUNDERS ORCHESTRATING GTM
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-blue-600">Replace 7 Tools With One Lightweight GTM Hub</span>
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
            Pipeline • Execution • Intelligence
          </p>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Built for founders juggling fundraising, sales, and partnerships. Manage your entire GTM motion—investor pipeline, customer deals, partner relationships—with AI that knows your business context. Start free, unlock AI as you grow.
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
            Start free with core GTM tools • Unlock AI with paid plans • No credit card required
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Designed for Seed-Stage Go-To-Market</h2>
            <p className="text-lg text-gray-600">When you're wearing every GTM hat, you need a hub that keeps up—not slows you down.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UseCase
              title="Seed-Stage Founders"
              description="Orchestrate fundraising, first customers, and early partnerships in one place. Track investor conversations, close initial deals, and manage your founding team—all without enterprise tool bloat."
              icon={<Rocket className="w-8 h-8" />}
            />
            <UseCase
              title="Early Sales Teams"
              description="For teams graduating from spreadsheets. Smart pipeline tracking, AI-powered account briefs, and deal coaching that actually understands your product and ICP."
              icon={<TrendingUp className="w-8 h-8" />}
            />
            <UseCase
              title="GTM Consultants"
              description="Run multiple client GTM motions simultaneously. Pre-built templates, collaborative deal rooms, and AI assistance for strategy deliverables in half the time."
              icon={<Briefcase className="w-8 h-8" />}
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
              CONTEXT-AWARE AI
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">AI That Knows Your Pipeline</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Unlike generic ChatGPT, our AI has full context on your investor conversations, customer deals, and partnership discussions. Get actionable coaching on your actual GTM motion—not generic startup advice.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Fundraising AI</h3>
                </div>
                <p className="text-gray-700 mb-4">Research investors matching your profile. Draft personalized outreach emails. Get coaching on pitch strategy and objection handling.</p>
                <div className="text-sm text-gray-600 italic">"Which Series A investors have backed similar SaaS companies?"</div>
              </div>
              <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Sales AI</h3>
                </div>
                <p className="text-gray-700 mb-4">Generate deal-specific proposals. Get coaching on deal progression. AI suggests next steps based on your CRM history and win patterns.</p>
                <div className="text-sm text-gray-600 italic">"Draft a follow-up for Acme Corp based on our last meeting."</div>
              </div>
              <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-2 mb-3">
                  <Handshake className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Partnership AI</h3>
                </div>
                <p className="text-gray-700 mb-4">Identify strategic partnership opportunities. Structure co-marketing campaigns. Generate partnership proposals and track relationship health.</p>
                <div className="text-sm text-gray-600 italic">"What partners serve similar customers we could co-sell with?"</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Three Layers of GTM Excellence</h2>
          <p className="text-xl text-gray-600">Pipeline to manage deals. Execution to get work done. Intelligence to scale smarter.</p>
        </div>

        {/* Pipeline */}
        <div className="mb-16">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 border-2 border-black flex items-center justify-center text-sm font-mono">1</div>
              Pipeline: Track Every Deal
            </h3>
            <p className="text-gray-600">Unified CRM for fundraising, sales, and partnerships. See your entire GTM motion in one view.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="3-in-1 Smart CRM"
              description="Manage investor pipeline, customer deals, and partner relationships in one unified view. Track conversations, stages, and next actions without switching tools."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Deal Flow Analytics"
              description="Visualize pipeline health, conversion rates, and deal velocity. Track MRR, GMV, fundraising progress, and partnership value with interactive charts."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Financial Tracking"
              description="Log revenue, expenses, and runway. Monitor burn rate and forecast growth. Export data for deeper analysis or board reporting."
            />
          </div>
        </div>

        {/* Execution */}
        <div className="mb-16">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 border-2 border-black flex items-center justify-center text-sm font-mono">2</div>
              Execution: Get Work Done
            </h3>
            <p className="text-gray-600">Task management, docs, and calendar—everything your team needs to execute fast.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="GTM Task Management"
              description="Organize work by pipeline, product, or marketing. Assign to teammates, set priorities, and track progress. Gamified XP system keeps teams motivated."
            />
            <FeatureCard
              icon={<Calendar className="w-8 h-8" />}
              title="Unified Calendar"
              description="All tasks, investor meetings, customer calls, and campaign deadlines in one view. Color-coded by module with quick-add and priority filtering."
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="Collaborative Deal Rooms"
              description="Create board decks, sales proposals, and partnership briefs with 24 formatting tools. Export to PDF/Word. Includes 5 GTM templates to start fast."
            />
          </div>
        </div>

        {/* Intelligence */}
        <div>
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 border-2 border-black flex items-center justify-center text-sm font-mono">3</div>
              Intelligence: Scale With AI
            </h3>
            <p className="text-gray-600">Context-aware AI assistants that know your business, not generic ChatGPT responses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI Account Briefs"
              description="Get instant context on any investor, customer, or partner. AI synthesizes your notes, emails, and meeting history into actionable deal intelligence."
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="Automated Outreach"
              description="AI drafts personalized investor emails, sales follow-ups, and partnership proposals based on your CRM data and past successful messages."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Deal Coaching & Strategy"
              description="Module-specific AI for fundraising, sales, and partnerships. Get real-time coaching on deal strategy, next steps, and objection handling tailored to your stage."
            />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Trusted by Seed-Stage Founders</h2>
          <p className="text-lg text-gray-600">Built by operators who've been in your shoes. Used by founders who value speed over enterprise complexity.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 border-2 border-black flex items-center justify-center font-bold text-lg">JD</div>
              <div>
                <div className="font-bold">Jordan Davis</div>
                <div className="text-sm text-gray-600">Founder, TechFlow AI</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Replaced Salesforce, Notion, and Airtable with FounderHQ. Cut our tool spend by 80% and actually use everything we pay for now. The AI investor briefs alone saved me 10 hours last week."</p>
            <div className="text-sm text-gray-600 font-medium">Raised $2.5M seed round using FounderHQ pipeline</div>
          </div>
          
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 border-2 border-black flex items-center justify-center font-bold text-lg">SM</div>
              <div>
                <div className="font-bold">Sarah Martinez</div>
                <div className="text-sm text-gray-600">Head of Sales, DataCore</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Finally, a CRM that doesn't require a PhD to configure. Set up our entire sales process in 30 minutes. The AI coaching helped us close 3 deals in our first month using it."</p>
            <div className="text-sm text-gray-600 font-medium">Closed $150K in new deals first month</div>
          </div>
          
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 border-2 border-black flex items-center justify-center font-bold text-lg">MK</div>
              <div>
                <div className="font-bold">Michael Kim</div>
                <div className="text-sm text-gray-600">GTM Consultant</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Manage 5 client GTM projects in FounderHQ. The templates and AI let me deliver strategies 3x faster. Clients love the collaborative workspace for deal tracking."</p>
            <div className="text-sm text-gray-600 font-medium">Scaled from 2 to 5 concurrent clients</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-black shadow-neo-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Real Outcomes From Real Founders</h3>
            <div className="grid md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">$15M+</div>
                <div className="text-sm text-gray-600">Raised by users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">80%</div>
                <div className="text-sm text-gray-600">Tool cost reduction</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">10hrs/wk</div>
                <div className="text-sm text-gray-600">Time saved per founder</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">3 tools</div>
                <div className="text-sm text-gray-600">Avg. replaced per user</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Trusted by Seed-Stage Founders</h2>
          <p className="text-lg text-gray-600">Built by operators who've been in your shoes. Used by founders who value speed over enterprise complexity.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 border-2 border-black flex items-center justify-center font-bold text-lg">JD</div>
              <div>
                <div className="font-bold">Jordan Davis</div>
                <div className="text-sm text-gray-600">Founder, TechFlow AI</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Replaced Salesforce, Notion, and Airtable with FounderHQ. Cut our tool spend by 80% and actually use everything we pay for now. The AI investor briefs alone saved me 10 hours last week."</p>
            <div className="text-sm text-gray-600 font-medium">Raised $2.5M seed round using FounderHQ pipeline</div>
          </div>
          
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 border-2 border-black flex items-center justify-center font-bold text-lg">SM</div>
              <div>
                <div className="font-bold">Sarah Martinez</div>
                <div className="text-sm text-gray-600">Head of Sales, DataCore</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Finally, a CRM that doesn't require a PhD to configure. Set up our entire sales process in 30 minutes. The AI coaching helped us close 3 deals in our first month using it."</p>
            <div className="text-sm text-gray-600 font-medium">Closed $150K in new deals first month</div>
          </div>
          
          <div className="p-6 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 border-2 border-black flex items-center justify-center font-bold text-lg">MK</div>
              <div>
                <div className="font-bold">Michael Kim</div>
                <div className="text-sm text-gray-600">GTM Consultant</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">"Manage 5 client GTM projects in FounderHQ. The templates and AI let me deliver strategies 3x faster. Clients love the collaborative workspace for deal tracking."</p>
            <div className="text-sm text-gray-600 font-medium">Scaled from 2 to 5 concurrent clients</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-black shadow-neo-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Real Outcomes From Real Founders</h3>
            <div className="grid md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">$15M+</div>
                <div className="text-sm text-gray-600">Raised by users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">80%</div>
                <div className="text-sm text-gray-600">Tool cost reduction</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">10hrs/wk</div>
                <div className="text-sm text-gray-600">Time saved per founder</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">3 tools</div>
                <div className="text-sm text-gray-600">Avg. replaced per user</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Pricing That Scales With You</h2>
            <p className="text-xl text-gray-600">From bootstrapped founder to scaling team—no enterprise sales BS</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="/month"
              description="Start with core GTM tools. Upgrade for AI when ready."
              features={[
                "Unified task management",
                "Basic 3-in-1 CRM (25 contacts)",
                "Calendar & deal tracking",
                "Pipeline analytics",
                "100 MB storage",
                "AI unlocks with paid plans"
              ]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Power"
              price="$49"
              period="/month"
              description="For solo founders orchestrating seed-stage GTM"
              features={[
                "AI account briefs & deal coaching",
                "Automated investor outreach",
                "Unlimited CRM contacts & deals",
                "Collaborative deal rooms",
                "5 GTM document templates",
                "Advanced pipeline analytics",
                "Financial tracking & runway",
                "5 GB storage + unlimited files",
                "CSV export for board reporting",
                "Priority email support"
              ]}
              cta="Get Started"
              highlighted={true}
            />
            <PricingCard
              name="Team Pro"
              price="$99"
              period="/month"
              description="For early sales teams scaling GTM motion"
              additionalPricing="+ $25/user/month"
              features={[
                "All Power features per user",
                "Shared team workspaces",
                "Collaborative pipeline mgmt",
                "Team deal coaching & insights",
                "Role-based CRM permissions",
                "Team performance dashboards",
                "Shared document libraries",
                "10 GB team storage",
                "Multi-user API access",
                "Priority team onboarding"
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
