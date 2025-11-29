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
  PlayCircle,
  Mail,
  PieChart,
  Layers,
  Webhook,
  Terminal,
  Key,
  Plug
} from 'lucide-react';

type FeatureCluster = {
  id: string;
  badge: string;
  title: string;
  description: string;
  accent: string;
  tagline: string;
  metric: string;
  features: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
};

const FEATURE_CLUSTERS: FeatureCluster[] = [
  {
    id: 'developer',
    badge: '⚡',
    title: 'Developer API: Build & Integrate',
    description: 'Premium REST API with full CRUD operations, real-time webhooks, and AI agent access. Build custom integrations or automate your GTM workflows programmatically.',
    accent: 'from-orange-100/70 via-white to-amber-50/60',
    tagline: 'Full REST API',
    metric: '$0.001/call',
    features: [
      {
        title: '6 RESTful Endpoints',
        description: 'Contacts, Tasks, Deals, Documents, CRM, and AI Agents—all accessible via simple HTTP calls with JSON responses.',
        icon: <Terminal className="w-8 h-8" />,
      },
      {
        title: '22 Webhook Events',
        description: 'Real-time notifications for creates, updates, deletes, stage changes, and AI completions. Never poll for changes again.',
        icon: <Webhook className="w-8 h-8" />,
      },
      {
        title: 'Secure API Keys',
        description: 'Granular scopes, rate limiting, and usage tracking. Create multiple keys for different integrations with full audit logs.',
        icon: <Key className="w-8 h-8" />,
      },
      {
        title: 'AI Agents via API',
        description: 'Run AI research queries programmatically. Get structured responses with sources—perfect for automated workflows.',
        icon: <Brain className="w-8 h-8" />,
      },
    ],
  },
  {
    id: 'pipeline',
    badge: '1',
    title: 'Pipeline: Track Every Deal',
    description: 'Unified CRM for fundraising, sales, and partnerships with email integration so every convo, doc, and metric lives in one view.',
    accent: 'from-blue-100/70 via-white to-blue-50/60',
    tagline: 'Live pipeline sync',
    metric: '82% fewer manual updates',
    features: [
      {
        title: '3-in-1 Smart CRM',
        description: 'Investor, customer, and partner boards stay perfectly in sync with shared notes, tags, and automations.',
        icon: <Users className="w-8 h-8" />,
      },
      {
        title: 'Gmail Integration',
        description: 'Connect your Gmail inbox and sync conversations directly to CRM accounts. Never lose track of deal communications again.',
        icon: <Mail className="w-8 h-8" />,
      },
      {
        title: 'Deal Flow Analytics',
        description: 'Velocity, conversion, and forecast dashboards refresh in real time so updates never require spreadsheet wrangling.',
        icon: <BarChart3 className="w-8 h-8" />,
      },
      {
        title: 'Financial Tracking',
        description: 'Log revenue, burn, and runway alongside every account, ready for board packets or investor notes with a click.',
        icon: <TrendingUp className="w-8 h-8" />,
      },
    ],
  },
  {
    id: 'execution',
    badge: '2',
    title: 'Execution: Ship Revenue Work Fast',
    description: 'Docs, tasks, products, and meetings aligned to the same source of truth keep every GTM lane moving in sync.',
    accent: 'from-green-100/70 via-white to-teal-50/60',
    tagline: 'Workflow clarity',
    metric: '12 hrs saved weekly',
    features: [
      {
        title: 'Products & Services Hub',
        description: 'Manage your complete product catalog with pricing, descriptions, and categories. Link offerings directly to deals and proposals.',
        icon: <Store className="w-8 h-8" />,
      },
      {
        title: 'GTM Task Graph',
        description: 'Assign owners, priorities, and XP rewards so teams know what is urgent without pinging ops leads.',
        icon: <Target className="w-8 h-8" />,
      },
      {
        title: 'Unified Calendar',
        description: 'Investor standups, customer calls, and campaign launches stack in one color-coded, filterable view.',
        icon: <Calendar className="w-8 h-8" />,
      },
      {
        title: 'Professional Document Canvas',
        description: 'Create stunning proposals with shapes, text boxes, signatures, charts, and frames. Export to PDF with one click.',
        icon: <Layers className="w-8 h-8" />,
      },
    ],
  },
  {
    id: 'intelligence',
    badge: '3',
    title: 'Intelligence: Scale With AI Agents',
    description: 'Autonomous AI Agents research competitors, analyze markets, and execute multi-step GTM tasks. Context-aware copilots summarize pipelines, prep meetings, and suggest next plays.',
    accent: 'from-purple-100/70 via-white to-fuchsia-50/60',
    tagline: 'Autonomous AI agents',
    metric: '25 copilots/day free',
    features: [
      {
        title: 'AI Research Agent',
        description: 'Autonomous agent researches competitors, analyzes markets, and generates comprehensive reports with charts—all while you focus on closing deals.',
        icon: <Brain className="w-8 h-8" />,
      },
      {
        title: 'AI Market Intelligence',
        description: 'Get real-time competitive intel, industry trends, and prospect insights with AI-powered web search built right in.',
        icon: <PieChart className="w-8 h-8" />,
      },
      {
        title: 'AI Chart Generation',
        description: 'Ask for visualizations in plain English and get real bar, line, pie, or area charts inserted directly into documents.',
        icon: <BarChart3 className="w-8 h-8" />,
      },
      {
        title: 'Deal Coaching & Strategy',
        description: 'Module-specific AI recommends next steps, objections to prep for, and talking points pulled from past wins.',
        icon: <Shield className="w-8 h-8" />,
      },
    ],
  },
];

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
                <span>Autonomous AI Agents research competitors, analyze markets, generate reports with charts, and execute multi-step GTM tasks—while you focus on closing.</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5" />
                <span>Gmail integration syncs email conversations directly to your CRM accounts, plus a full product catalog to link to deals.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/app"
                className="px-8 py-4 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-medium text-lg flex items-center gap-2"
              >
                Launch FounderHQ <ArrowRight size={20} />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-4 gap-2 sm:gap-3 text-left">
              <div className="p-3 sm:p-4 border-2 border-black bg-white shadow-neo-sm">
                <p className="text-xl sm:text-2xl font-bold">82h</p>
                <p className="text-[10px] sm:text-xs font-mono uppercase text-gray-500 leading-tight">Hours saved / mo</p>
              </div>
              <div className="p-3 sm:p-4 border-2 border-black bg-white shadow-neo-sm">
                <p className="text-xl sm:text-2xl font-bold">3-in-1</p>
                <p className="text-[10px] sm:text-xs font-mono uppercase text-gray-500 leading-tight">CRM pipelines</p>
              </div>
              <div className="p-3 sm:p-4 border-2 border-black bg-white shadow-neo-sm">
                <p className="text-xl sm:text-2xl font-bold">10</p>
                <p className="text-[10px] sm:text-xs font-mono uppercase text-gray-500 leading-tight">API endpoints</p>
              </div>
              <div className="p-3 sm:p-4 border-2 border-black bg-white shadow-neo-sm">
                <p className="text-xl sm:text-2xl font-bold">34</p>
                <p className="text-[10px] sm:text-xs font-mono uppercase text-gray-500 leading-tight">Webhook events</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Start free with core GTM tools + 25 Copilot requests • Unlimited storage included • No credit card required
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-blue-200/60 via-purple-200/40 to-pink-100/60 -z-10 rounded-full"></div>
            <div className="space-y-6">
              <div className="floating-card p-5 border-2 border-black bg-white shadow-neo">
                <p className="text-xs font-mono text-gray-500 mb-2">AI DAILY INTELLIGENCE</p>
                <h3 className="text-lg font-bold mb-2">Investor + Revenue Briefing</h3>
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">"Apollo Ventures just led a $25M SaaS round. Queue outreach with updated pitch deck + attach traction dashboard."</p>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-t border-gray-200 pt-2">
                  <span>Powered by live data + web search</span>
                  <span>Updated 6:05 AM</span>
                </div>
              </div>
              <div className="floating-card delay-1 p-5 border-2 border-black bg-white shadow-neo">
                <p className="text-xs font-mono text-gray-500 mb-3">GTM TASK GRAPH</p>
                <div className="space-y-2">
                  {['Prep Seed Update', 'Revive Acme Deal', 'Spin up co-marketing draft'].map((task, idx) => (
                    <div key={task} className="flex items-center justify-between border border-black px-3 py-2 bg-gray-50">
                      <span className="text-sm font-medium">{task}</span>
                      <span className="text-xs font-mono text-gray-500 px-2 py-0.5 bg-white border border-gray-300">{idx === 0 ? 'Investor' : idx === 1 ? 'Sales' : 'Partner'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="floating-card delay-2 p-5 border-2 border-black bg-white shadow-neo">
                <p className="text-xs font-mono text-gray-500 mb-3">LIVE DASHBOARD</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-black bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Pipeline Momentum</p>
                    <p className="text-2xl font-bold text-green-600">+38%</p>
                  </div>
                  <div className="border border-black bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Runway</p>
                    <p className="text-2xl font-bold">17 mo</p>
                  </div>
                  <div className="col-span-2 border-2 border-black bg-black text-white p-4">
                    <p className="text-xs uppercase font-mono text-gray-400 mb-1">Next best action</p>
                    <p className="text-base font-semibold leading-snug">Send 3-slide update to Tier 1 investors before Friday standup.</p>
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
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Fundraising AI</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">Research investors matching your profile. Draft personalized outreach emails. Get coaching on pitch strategy and objection handling.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">"Which Series A investors have backed similar SaaS companies?"</div>
              </div>
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Sales AI</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">Generate deal-specific proposals. Get coaching on deal progression. AI suggests next steps based on your CRM history and win patterns.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">"Draft a follow-up for Acme Corp based on our last meeting."</div>
              </div>
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Partnership AI</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">Identify strategic partnership opportunities. Structure co-marketing campaigns. Generate partnership proposals and track relationship health.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">"What partners serve similar customers we could co-sell with?"</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer API Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-black shadow-neo-lg p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-orange-300 border-2 border-black shadow-neo font-mono text-sm font-bold">
              <Code className="w-4 h-4" />
              DEVELOPER API
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Build Custom Integrations</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Full REST API access to your GTM data. Sync contacts with your marketing tools, automate deal updates from your product, 
              or build custom dashboards—all with simple HTTP calls.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">6 Endpoints</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">Contacts, Tasks, Deals, Documents, CRM Items, and AI Agents—all via simple REST calls.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">GET, POST, PATCH, DELETE</div>
              </div>
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Webhook className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">22 Webhooks</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">Real-time notifications for creates, updates, deletes, and stage changes. Never poll again.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">Instant event delivery</div>
              </div>
              <div className="h-full flex flex-col bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Pay-Per-Call</h3>
                </div>
                <p className="text-gray-700 mb-4 flex-grow leading-relaxed">$0.001 per API call. 1,000 calls for just $1. No monthly minimums or commitments.</p>
                <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-3">Scale as you grow</div>
              </div>
            </div>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-black text-white border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold"
            >
              View API Documentation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-20 overflow-hidden bg-gradient-to-b from-white via-indigo-50 to-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-8 w-56 h-56 bg-purple-200/50 blur-3xl animate-pulse" />
          <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-blue-200/40 blur-3xl animate-pulse [animation-delay:2s]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white shadow-neo-sm text-xs font-mono uppercase tracking-[0.2em]">
              <Clock className="w-4 h-4" /> Live GTM system preview
            </p>
            <h2 className="mt-4 text-4xl font-bold mb-4">Three Layers of GTM Excellence</h2>
            <p className="text-xl text-gray-600">Pipeline to manage deals. Execution to get work done. Intelligence to scale smarter.</p>
          </div>

          <div className="space-y-10">
            {FEATURE_CLUSTERS.map((cluster, clusterIdx) => (
              <div
                key={cluster.id}
                className="group relative border-2 border-black rounded-3xl shadow-neo bg-white/90 backdrop-blur overflow-hidden px-6 py-8 sm:px-10"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${cluster.accent} opacity-40 blur-3xl animate-pulse`}
                  style={{ animationDuration: `${6 + clusterIdx}s` }}
                />
                <div className="absolute -right-12 -top-12 w-32 h-32 border-2 border-dashed border-black/20 rounded-full animate-[spin_18s_linear_infinite]" />
                <div className="absolute -left-10 bottom-6 w-24 h-24 border border-black/20 rounded-full animate-[spin_26s_linear_infinite]" />

                <div className="relative z-10 flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 flex items-center justify-center border-2 border-black bg-black text-white font-mono text-sm">
                      {cluster.badge}
                    </span>
                    <div>
                      <h3 className="text-2xl font-bold">{cluster.title}</h3>
                      <p className="text-sm text-gray-600 max-w-xl">{cluster.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-[0.2em] text-gray-600">
                    <span className="px-3 py-1 border-2 border-black bg-white shadow-neo-sm">{cluster.tagline}</span>
                    <span className="px-3 py-1 border border-dashed border-black">{cluster.metric}</span>
                  </div>
                </div>

                <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {cluster.features.map((feature, featureIdx) => (
                    <FeatureCard
                      key={feature.title}
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                      delayMs={featureIdx * 120}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you're ready—no enterprise sales BS</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="/month"
              description="Start with core GTM tools plus 25 Copilot requests every month."
              features={[
                "25 Copilot requests per month (resets monthly)",
                "Unlimited documents & storage",
                "Unified task management",
                "3-in-1 CRM",
                "Calendar & deal tracking",
                "Pipeline analytics",
                "Read-only API access"
              ]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Team Pro"
              price="$49"
              period="/month"
              description="For founders and teams scaling their GTM motion"
              additionalPricing="+ $25/extra user/month"
              features={[
                "Unlimited Copilot requests & automations",
                "AI account briefs & deal coaching",
                "Full Developer API access (pay-per-call)",
                "22 real-time webhook events",
                "AI Agents via API",
                "Unlimited CRM contacts & deals",
                "Collaborative deal rooms",
                "All GTM document templates",
                "Advanced pipeline analytics",
                "Financial tracking & runway",
                "Shared team workspaces",
                "Priority support"
              ]}
              cta="Get Started"
              highlighted={true}
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
            answer="Team Pro is $49/month base (includes you as owner), plus $25/month for each additional team member. Add or remove seats anytime."
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
                <li><Link to="/docs" className="hover:text-black">API Docs</Link></li>
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
    <div className="h-full flex flex-col p-6 border-2 border-black shadow-neo bg-white text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-blue-100 border-2 border-black flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed flex-grow">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, delayMs = 0 }: { icon: React.ReactNode; title: string; description: string; delayMs?: number }) {
  return (
    <div
      className="h-full flex flex-col p-5 border-2 border-black shadow-neo hover:-translate-y-1 hover:shadow-none transition-transform duration-500 bg-white"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="w-11 h-11 bg-blue-100 border-2 border-black flex items-center justify-center mb-3 flex-shrink-0">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2 leading-tight">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed flex-grow">{description}</p>
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
