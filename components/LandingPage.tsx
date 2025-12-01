import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../hooks';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  MessageSquare,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Zap,
  Menu,
  X,
  Bot,
  FileText,
  Building2,
  UserPlus,
  Receipt,
  TrendingUp,
  Globe,
  CheckCircle2,
  Command,
  Mail,
  Megaphone,
  Sparkles
} from 'lucide-react';

// Neo-brutalist feature card
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  bgColor,
  delay = 0 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  bgColor: string;
  delay?: number;
}) => {
  const { ref, isIntersecting: isVisible } = useIntersectionObserver({ triggerOnce: true, threshold: 0.1 });
  
  return (
    <div 
      ref={ref}
      className={`${bgColor} rounded-2xl border border-gray-200 shadow-sm p-6 transition-all duration-500 hover:shadow-md ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

// Neo-brutalist pricing card
const PricingCard = ({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  cta, 
  popular = false,
  bgColor = 'bg-white'
}: { 
  name: string; 
  price: string; 
  period: string; 
  description: string; 
  features: string[]; 
  cta: string; 
  popular?: boolean;
  bgColor?: string;
}) => (
  <div className={`relative ${bgColor} rounded-2xl border border-gray-200 shadow-sm p-6 ${popular ? 'ring-2 ring-blue-500' : ''}`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <span className="bg-blue-500 rounded-full text-white text-xs font-semibold px-4 py-1">
          BEST VALUE
        </span>
      </div>
    )}
    <h3 className="text-2xl font-bold text-slate-900 mb-1">{name}</h3>
    <p className="text-sm text-slate-600 mb-4">{description}</p>
    <div className="mb-6">
      <span className="text-4xl font-bold text-slate-900">{price}</span>
      <span className="text-slate-600">{period}</span>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      to="/app"
      className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${popular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md' : 'bg-white text-slate-900 border border-gray-200 hover:bg-gray-50 hover:shadow-sm'}`}
    >
      {cta}
    </Link>
  </div>
);

// FAQ Item
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left group"
      >
        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}>
        <p className="text-slate-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: MessageSquare,
      title: 'Huddle Team Chat',
      description: 'Real-time messaging with threaded conversations, file sharing, and AI-powered responses.',
      bgColor: 'bg-yellow-100'
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Create contacts, log expenses, track revenue, and manage tasks through natural conversation.',
      bgColor: 'bg-purple-100'
    },
    {
      icon: Users,
      title: 'CRM & Contacts',
      description: 'Manage leads, contacts, and accounts with a unified view. Track every interaction.',
      bgColor: 'bg-blue-100'
    },
    {
      icon: DollarSign,
      title: 'Financial Tracking',
      description: 'Log expenses, track revenue, and monitor cash flow with AI-assisted data entry.',
      bgColor: 'bg-green-100'
    },
    {
      icon: Calendar,
      title: 'Calendar & Events',
      description: 'Built-in calendar to track events, deadlines, and team schedules in one view.',
      bgColor: 'bg-orange-100'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Customizable dashboards, sales forecasts, and performance metrics.',
      bgColor: 'bg-pink-100'
    },
    {
      icon: FileText,
      title: 'Document Library',
      description: 'Store, organize, and share files securely with smart filtering.',
      bgColor: 'bg-cyan-100'
    },
    {
      icon: Mail,
      title: 'Email Integration',
      description: 'Connect Gmail, send and receive emails, and manage communications in one place.',
      bgColor: 'bg-indigo-100'
    },
    {
      icon: Megaphone,
      title: 'Marketing & Campaigns',
      description: 'Plan and track marketing campaigns, content calendars, and outreach initiatives.',
      bgColor: 'bg-rose-100'
    },
    {
      icon: Sparkles,
      title: 'AI Research Agents',
      description: 'Specialized agents for market research, deal strategy, and competitive analysis.',
      bgColor: 'bg-violet-100'
    }
  ];

  const aiCapabilities = [
    { icon: UserPlus, label: 'Create Contacts', description: 'Add contacts through conversation' },
    { icon: Building2, label: 'Manage Accounts', description: 'Create and update company records' },
    { icon: CheckCircle2, label: 'Track Tasks', description: 'Create tasks and set reminders' },
    { icon: Receipt, label: 'Log Expenses', description: 'Record expenses with categorization' },
    { icon: TrendingUp, label: 'Record Revenue', description: 'Track income and deals closed' },
    { icon: Globe, label: 'Web Search', description: 'Research companies and contacts' },
  ];

  const faqs = [
    {
      question: "What is FounderHQ and who is it for?",
      answer: "FounderHQ is an all-in-one GTM hub for founders, sales teams, and GTM consultants. It combines CRM, team chat, financial tracking, and AI assistance into a single platform."
    },
    {
      question: "How does the AI assistant work?",
      answer: "Our AI assistant in Huddle chat understands natural language. Just type what you need—create tasks, log expenses, record revenue, add contacts—and it handles the rest."
    },
    {
      question: "Can I import my existing data?",
      answer: "Yes! FounderHQ supports importing contacts, accounts, and historical data from popular CRMs and spreadsheets."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security with encryption and row-level security policies. Your data is stored in isolated environments."
    },
    {
      question: "What integrations are available?",
      answer: "FounderHQ currently integrates with Gmail for email sync. More integrations are on our roadmap based on user feedback."
    },
    {
      question: "Can I try FounderHQ for free?",
      answer: "Yes! Our Free tier includes full access to core features. Upgrade anytime to unlock team collaboration and AI features."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white border-b-2 border-black' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Command className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl font-mono text-black">FOUNDERHQ</span>
            </Link>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">FEATURES</a>
              <a href="#ai" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">AI</a>
              <a href="#pricing" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">PRICING</a>
              <a href="#faq" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/app" className="text-slate-700 hover:text-blue-600 transition-colors text-sm font-medium">
                LOG IN
              </Link>
              <Link 
                to="/app" 
                className="px-4 py-2 bg-slate-900 rounded-lg text-white font-semibold text-sm hover:bg-slate-800 transition-all"
              >
                GET STARTED FREE
              </Link>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-4">
            <div className="flex flex-col gap-4 px-4">
              <a href="#features" className="text-slate-900 font-semibold py-2">FEATURES</a>
              <a href="#ai" className="text-slate-900 font-semibold py-2">AI</a>
              <a href="#pricing" className="text-slate-900 font-semibold py-2">PRICING</a>
              <a href="#faq" className="text-slate-900 font-semibold py-2">FAQ</a>
              <hr className="border-gray-200" />
              <Link to="/app" className="text-slate-900 font-semibold py-2">LOG IN</Link>
              <Link to="/app" className="px-4 py-3 bg-slate-900 rounded-xl text-white font-semibold text-center">
                GET STARTED FREE
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-yellow-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="mb-8 flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm font-semibold text-sm">
                <Zap className="w-4 h-4" />
                NOW WITH AI-POWERED DATA ENTRY
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
              THE ALL-IN-ONE HUB FOR{' '}
              <span className="bg-slate-900 text-yellow-100 px-4 rounded-lg">
                GTM
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop juggling 10 tools. CRM, team chat, financials, and AI—unified in one workspace. 
              Ship faster. Close more. Scale without the chaos.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/app"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 rounded-xl text-white font-semibold text-lg hover:bg-slate-800 shadow-sm hover:shadow-md transition-all"
              >
                START FREE TODAY
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white rounded-xl text-slate-900 font-semibold text-lg border border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                SEE FEATURES
              </a>
            </div>
          </div>

          {/* Hero Image / App Preview */}
          <div className="mt-16 relative">
            <div className="relative mx-auto max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="aspect-[16/10] bg-gray-900 p-4 sm:p-8">
                {/* Mock dashboard UI */}
                <div className="h-full bg-gray-800 border-2 border-gray-600 overflow-hidden">
                  <div className="flex h-full">
                    {/* Sidebar */}
                    <div className="w-32 sm:w-48 bg-gray-900 border-r-2 border-gray-600 p-2 sm:p-4 hidden sm:block">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-6 h-6 bg-yellow-400" />
                        <span className="text-white font-mono font-bold text-sm">FOUNDERHQ</span>
                      </div>
                      {['Dashboard', 'Pipeline', 'Contacts', 'Huddle', 'Calendar'].map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2 py-2 mb-1 ${i === 3 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                          <div className="w-3 h-3 bg-current opacity-50" />
                          <span className="text-xs font-mono">{item}</span>
                        </div>
                      ))}
                    </div>
                    {/* Main content */}
                    <div className="flex-1 p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-4 h-full">
                        {/* Chat area */}
                        <div className="flex-1 bg-gray-700 p-2 sm:p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 flex-shrink-0" />
                              <div className="bg-gray-600 px-3 py-2 text-xs sm:text-sm text-gray-200 font-mono">Just closed the Acme deal! 🎉</div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 flex-shrink-0 flex items-center justify-center">
                                <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              </div>
                              <div className="bg-blue-600 px-3 py-2 text-xs sm:text-sm text-white font-mono">
                                ✓ Logged as revenue. CRM updated.
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Stats */}
                        <div className="w-full sm:w-48 flex flex-row sm:flex-col gap-2 sm:gap-3">
                          {[
                            { label: 'Revenue', value: '$124,500', bg: 'bg-green-500' },
                            { label: 'Pipeline', value: '$890,000', bg: 'bg-blue-500' },
                            { label: 'Closed', value: '23 deals', bg: 'bg-purple-500' }
                          ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} p-2 sm:p-3 flex-1 sm:flex-none`}>
                              <div className="text-white/70 text-xs font-mono">{stat.label}</div>
                              <div className="font-bold text-white font-mono text-sm sm:text-base">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 font-semibold text-sm mb-6">
              ALL-IN-ONE PLATFORM
            </span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              EVERYTHING YOU NEED TO SCALE
            </h2>
            <p className="text-xl text-slate-600">
              Stop juggling multiple tools. FounderHQ brings your CRM, communications, finances, and workflows into one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 rounded-full font-semibold text-sm mb-6">
                <Bot className="w-4 h-4" />
                AI-POWERED
              </span>
              <h2 className="text-4xl font-bold mb-4">
                YOUR AI ASSISTANT THAT ACTUALLY GETS WORK DONE
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Skip the busywork. Our AI assistant in Huddle chat understands natural language and can create contacts, log expenses, track revenue, and manage tasks—just by asking.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {aiCapabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-purple-500 transition-colors">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <cap.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{cap.label}</p>
                      <p className="text-gray-400 text-xs">{cap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="relative">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">AI Assistant</p>
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      Online in #general
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 rounded-xl px-4 py-2 max-w-xs">
                      <p className="text-white text-sm">@AI log expense $250 for client dinner with Acme Corp</p>
                    </div>
                  </div>
                  
                  {/* AI response */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-700 rounded-xl border border-slate-600 px-4 py-3 max-w-xs">
                      <p className="text-white text-sm mb-2">✓ Done! Expense logged:</p>
                      <div className="bg-slate-800 rounded-lg p-3 text-xs">
                        <p className="text-gray-300"><span className="text-gray-500">Amount:</span> $250.00</p>
                        <p className="text-gray-300"><span className="text-gray-500">Category:</span> Client Entertainment</p>
                        <p className="text-gray-300"><span className="text-gray-500">Account:</span> Acme Corp</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm font-semibold text-sm mb-6">
              <Zap className="w-4 h-4" />
              SIMPLE PRICING
            </span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              START FREE, SCALE WHEN READY
            </h2>
            <p className="text-xl text-slate-600">
              No credit card required. Upgrade when you need more power.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard
              name="FREE"
              price="$0"
              period="/month"
              description="Perfect for solo founders getting started"
              features={[
                '25 AI requests per month',
                'Unlimited contacts & accounts',
                'Basic CRM features',
                'Huddle team chat',
                'Document storage (1GB)',
                'Built-in calendar',
                'Email support'
              ]}
              cta="START FREE"
              bgColor="bg-white"
            />
            <PricingCard
              name="TEAM PRO"
              price="$49"
              period="/month base"
              description="+ $25/month per additional user"
              features={[
                'Everything in Free, plus:',
                'Unlimited AI requests',
                'AI Assistant in Huddle',
                'Advanced analytics & reports',
                'Financial tracking (expenses & revenue)',
                'Custom fields & workflows',
                'API access',
                'Priority support'
              ]}
              cta="GET STARTED"
              popular
              bgColor="bg-blue-100"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-full text-pink-700 font-semibold text-sm mb-6">
              <MessageSquare className="w-4 h-4" />
              FAQ
            </span>
            <h2 className="text-4xl font-bold text-slate-900">
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            {faqs.map((faq, i) => (
              <FAQItem key={i} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            READY TO TRANSFORM YOUR GTM?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start free today—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/app"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white rounded-xl text-slate-900 font-semibold text-lg hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
            >
              GET STARTED FREE
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <Command className="w-5 h-5 text-slate-900" />
                </div>
                <span className="font-bold text-xl">FOUNDERHQ</span>
              </Link>
              <p className="text-gray-400 mb-4 max-w-xs">
                The all-in-one GTM hub for founders, consultants, and small businesses.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">PRODUCT</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to="/api-docs" className="text-gray-400 hover:text-white transition-colors text-sm">
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">LEGAL</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm font-mono">
              © {new Date().getFullYear()} FOUNDERHQ. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
