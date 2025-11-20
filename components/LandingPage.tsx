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
  Sparkles,
  PlayCircle
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono">FounderHQ</h1>
                <span className="px-2 py-0.5 bg-green-400 border border-black text-xs font-bold uppercase">Live Beta</span>
              </div>
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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase font-mono text-gray-700 mb-6">
              <span className="px-3 py-1 bg-yellow-300 border-2 border-black shadow-neo">Seed & Series A founders</span>
              <span className="px-3 py-1 bg-white border-2 border-black shadow-neo-sm">RevOps & Sales leads</span>
              <span className="px-3 py-1 bg-blue-100 border-2 border-black shadow-neo-sm">Boutique GTM agencies</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              One GTM Command Center for Sellers, Founders, and Consultants
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-6 leading-relaxed">
              FounderHQ replaces the spreadsheet circus with a single workspace where sales leaders forecast, founders share investor updates, and agencies orchestrate client plays. Keep every pipeline conversation, campaign brief, and follow-up tied to the same source of truth.
            </p>
            <ul className="space-y-3 text-gray-900 mb-8">
              <li className="flex items-start gap-3">
                <Target className="w-5 h-5 mt-0.5" />
                <span>Deal rooms, notes, and tasks stitched together so every account team knows exactly what’s closing this week and what needs attention.</span>
              </li>
              <li className="flex items-start gap-3">
                <Handshake className="w-5 h-5 mt-0.5" />
                <span>Investor, customer, and partner pipelines in one board—no more toggling between five CRMs or forwarding screenshots before a call.</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 mt-0.5" />
                <span>Optional AI copilots summarize deal health, prep call briefs, and pull market intel—but the workflows still make sense without them.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/app"
                className="px-8 py-4 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg flex items-center gap-2"
              >
                Launch FounderHQ <ArrowRight size={20} />
              </Link>
              <a
                href="#features"
                className="px-8 py-4 border-2 border-black bg-white hover:bg-gray-100 font-medium text-lg transition-all flex items-center gap-2"
              >
                <PlayCircle className="w-5 h-5" /> Watch 2-min tour
              </a>
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 border-2 border-black bg-white shadow-neo-sm animate-pulse-slow">
                <p className="text-3xl font-bold">82h</p>
                <p className="text-xs font-mono uppercase text-gray-500">Hours saved / founder / month</p>
              </div>
              <div className="p-4 border-2 border-black bg-white shadow-neo-sm animate-pulse-slow [animation-delay:0.3s]">
                <p className="text-3xl font-bold">3️⃣-in-1</p>
                <p className="text-xs font-mono uppercase text-gray-500">Investor • Sales • Partner CRM</p>
              </div>
              <div className="p-4 border-2 border-black bg-white shadow-neo-sm animate-pulse-slow [animation-delay:0.6s]">
                <p className="text-3xl font-bold">15+</p>
                <p className="text-xs font-mono uppercase text-gray-500">Automations your ops team needs</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Start free with core GTM tools • Unlock AI briefings & automations when ready • No credit card required
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-blue-200/60 via-purple-200/40 to-pink-100/60 -z-10 rounded-full"></div>
            <div className="space-y-6">
              <div className="floating-card">
                <p className="text-xs font-mono text-gray-500">AI DAILY INTELLIGENCE</p>
                <h3 className="text-xl font-bold mb-2">Investor + Revenue Briefing</h3>
                <p className="text-sm text-gray-700 mb-3">“Apollo Ventures just led a $25M SaaS round. Queue outreach with updated pitch deck + attach traction dashboard.”</p>
                <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                  <span>Powered by live data + web search</span>
                  <span>Updated 6:05 AM</span>
                </div>
              </div>
              <div className="floating-card delay-1">
                <p className="text-xs font-mono text-gray-500">GTM TASK GRAPH</p>
                <div className="space-y-2">
                  {['Prep Seed Update', 'Revive Acme Deal', 'Spin up co-marketing draft'].map((task, idx) => (
                    <div key={task} className="flex items-center justify-between border border-black px-3 py-2 bg-white">
                      <span className="text-sm font-medium">{task}</span>
                      <span className="text-xs text-gray-500">{idx === 0 ? 'Investor' : idx === 1 ? 'Sales' : 'Partner'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="floating-card delay-2">
                <p className="text-xs font-mono text-gray-500">LIVE DASHBOARD</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-black bg-white p-3">
                    <p className="text-xs text-gray-500">Pipeline Momentum</p>
                    <p className="text-2xl font-bold">+38%</p>
                  </div>
                  <div className="border border-black bg-white p-3">
                    <p className="text-xs text-gray-500">Runway</p>
                    <p className="text-2xl font-bold">17 mo</p>
                  </div>
                  <div className="col-span-2 border border-black bg-black text-white p-4">
                    <p className="text-xs uppercase font-mono text-gray-200">Next best action</p>
                    <p className="text-lg font-semibold">Send 3-slide update to Tier 1 investors before Friday standup.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for the Three GTM Heroes Keeping the Lights On</h2>
            <p className="text-lg text-gray-600">FounderHQ speaks the language of fundraising founders, revenue operators, and boutique agencies that moonlight as fractional CROs.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UseCase
              title="Founders & CROs"
              description="Share a single dashboard for investor updates, pipeline commits, and partner experiments. Replace late-night deck edits with live metrics everyone trusts."
              icon={<Rocket className="w-8 h-8" />}
            />
            <UseCase
              title="Sales & RevOps Leaders"
              description="Coach reps with actual context, not screenshots. Forecast, inspect deal hygiene, and trigger structured follow-ups across territories from one workspace."
              icon={<TrendingUp className="w-8 h-8" />}
            />
            <UseCase
              title="Consultants & GTM Agencies"
              description="Spin up client workspaces in minutes, templatize deliverables, and give stakeholders a branded portal for status, docs, and next actions."
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
    <div className="p-6 border-2 border-black shadow-neo bg-white text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 bg-blue-100 border-2 border-black flex items-center justify-center animate-pulse-slow">
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
