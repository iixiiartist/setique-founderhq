import type { ResearchMode, YouSearchImageResult, YouSearchResponse } from './youSearch.types';

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'insight';

const buildMockHits = (topic: string, slug: string, year: number): YouSearchResponse['hits'] => [
  {
    title: `${topic} adoption benchmarks ${year}`,
    description: `${topic} adoption is accelerating across venture-backed teams. Operators report a ${Math.floor(
      20 + Math.random() * 30
    )}% efficiency lift after standardizing their GTM rituals.`,
    url: `https://brief.founderhq.local/${slug}/benchmarks`,
    snippets: [
      'Benchmark your weekly rituals, CRM hygiene, and runway guardrails.',
      'Teams that institutionalize founder updates see faster follow-on funding.',
    ],
  },
  {
    title: `${topic} investor sentiment tracker`,
    description:
      'Recent investor memos highlight durable demand for workflow automation with human-in-the-loop guardrails. Key funds expect disciplined capital plans tied to revenue-quality metrics.',
    url: `https://signal.setique.dev/${slug}/investor-sentiment`,
    snippets: [
      'Investors reward consistent, bottom-up instrumentation of leading indicators.',
      'Gross retention above 90% offsets slower net-new ARR in current climate.',
    ],
  },
  {
    title: `${topic} playbook: 5 measurable quick wins`,
    description:
      'Operators shared five evidence-backed motions to unblock revenue, consolidate tooling, and protect bandwidth. Each playbook segment maps to the "Source, Runway, and Ritual" framework.',
    url: `https://ops.founder.playbooks/${slug}/quick-wins`,
    snippets: [
      'Codify weekly exec check-ins with a single source of truth.',
      'Pressure-test pricing with founder-led customer roundtables.',
    ],
  },
];

const buildMockNews = (topic: string, year: number): YouSearchResponse['news'] => [
  {
    title: `${topic} partners with strategic operators to unify GTM data`,
    description: 'New enablement programs stitch marketing, product, and finance signals into one canvas for founders.',
    url: 'https://newsroom.setique.com/press/gtm-data-collab',
    source: 'Setique Newswire',
    age: `${year} coverage`,
  },
  {
    title: `Analysts highlight ${topic} style workflows as default for modern founder ops`,
    description:
      'Analyst brief notes that lightweight canvases paired with curated AI copilots reduce context switching by 35%.',
    url: 'https://research.operatingsystem.report/insight/ai-workflows',
    source: 'Operating System Weekly',
    age: 'Last 14 days',
  },
];

const buildMockQa = (topic: string, year: number): YouSearchResponse['qa'] => ({
  answer: `Here is a synthesized recap for ${topic}:
- Demand signals: founders prioritize durable revenue instrumentation in ${year}.
- GTM ritual health: weekly cadences, customer councils, and pricing retros give the clearest ROI.
- Capital efficiency: teams combining automation plus human review see ${25 + Math.floor(Math.random() * 10)}% faster runway extensions.
- Next steps: align metrics, publish founder updates, and convert research into citeable slides.`,
  sources: [
    'Setique Field Notes',
    'FounderHQ GTM Observatory',
  ],
});

const buildMockImages = (topic: string): YouSearchImageResult[] => [
  {
    title: `${topic} leadership retreat visual`,
    url: 'https://studio.setique.com/assets/research/leadership-retreat',
    imageUrl: `https://dummyimage.com/960x540/0f172a/ffffff&text=${encodeURIComponent(topic)}+Ops`,
    thumbnail: `https://dummyimage.com/480x270/0f172a/ffffff&text=${encodeURIComponent('Ops')}`,
    source: 'Setique Studio',
  },
  {
    title: `${topic} growth flywheel diagram`,
    url: 'https://briefs.setique.com/patterns/growth-flywheel',
    imageUrl: `https://dummyimage.com/960x540/1f2937/ffffff&text=${encodeURIComponent('Growth Flywheel')}`,
    thumbnail: `https://dummyimage.com/480x270/1f2937/ffffff&text=${encodeURIComponent('Flywheel')}`,
    source: 'Founder Playbooks',
  },
  {
    title: `${topic} sentiment heatmap`,
    url: 'https://signal.setique.dev/insights/customer-sentiment',
    imageUrl: `https://dummyimage.com/960x540/111827/ffffff&text=${encodeURIComponent('Sentiment Map')}`,
    thumbnail: `https://dummyimage.com/480x270/111827/ffffff&text=${encodeURIComponent('Heatmap')}`,
    source: 'Operator Signal',
  },
];

export const generateMockYouSearchResponse = (
  query: string,
  mode: ResearchMode,
): YouSearchResponse => {
  const topic = toTitleCase(query || 'FounderHQ');
  const slug = slugify(topic);
  const year = new Date().getFullYear();

  const hits = buildMockHits(topic, slug, year);
  const news = buildMockNews(topic, year);
  const qa = buildMockQa(topic, year);
  const images = buildMockImages(topic);

  switch (mode) {
    case 'news':
  return { news, hits, metadata: { provider: 'mock', mode, query, fetchedAt: new Date().toISOString() } };
    case 'images':
  return { images, hits, metadata: { provider: 'mock', mode, query, fetchedAt: new Date().toISOString() } };
    case 'rag':
      return { hits, news, qa, metadata: { provider: 'mock', mode, query, fetchedAt: new Date().toISOString() } };
    default:
      return { hits, news, images, metadata: { provider: 'mock', mode, query, fetchedAt: new Date().toISOString() } };
  }
};
