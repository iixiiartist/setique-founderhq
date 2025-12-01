import React, { useMemo } from 'react';
import { useCopyToClipboard } from '../../hooks';
import { Globe, Copy, Download, Sparkles, Check } from 'lucide-react';

interface MarketResearchPanelProps {
  query: string;
  rawReport: string | null;
  isLoading?: boolean;
  onClose: () => void;
}

const sanitizeReport = (raw: string) =>
  raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/```/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const stripMarkdownTokens = (value: string) =>
  value
    .replace(/^[#>*\s|]+/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+\|\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractKeyFacts = (normalized: string) => {
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.includes('|') && !/^[-]{3,}$/.test(line));

  const facts: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const cleaned = line.replace(/^[•\-*\t]+/g, '').trim();
    const colonIndex = cleaned.indexOf(':');

    if (colonIndex > 2 && colonIndex < 60) {
      const label = cleaned.slice(0, colonIndex).trim();
      const value = cleaned.slice(colonIndex + 1).trim();

      const cleanLabel = stripMarkdownTokens(label);
      const cleanValue = stripMarkdownTokens(value);
      const isPricingFact = /\$|price|pricing|cost/i.test(cleanLabel) || /\$|price|pricing|cost/i.test(cleanValue);

      const key = `${cleanLabel}|${cleanValue}`;
      if (cleanLabel && cleanValue && !isPricingFact && !cleanLabel.match(/^(Aspect|Details)$/i) && !seen.has(key)) {
        facts.push({ label: cleanLabel, value: cleanValue });
        seen.add(key);
      }
    }
  }

  return facts.slice(0, 8);
};

const extractPricingHighlights = (normalized: string) => {
  const seen = new Set<string>();
  return normalized
    .split('\n')
    .map((line) => stripMarkdownTokens(line))
    .map((line) => line.replace(/^[-•*\s]+/, ''))
    .filter((line) => /\$|%/.test(line) && !line.includes('|'))
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
};

interface InsightSection {
  title: string;
  bullets: string[];
}

const buildInsightSections = (normalized: string): InsightSection[] => {
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;
  const seenBullets = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.includes('|') || /^[-]{3,}$/.test(line)) continue;

    const headingMatch = line.match(/^#{1,4}\s+(.*)/);
    if (headingMatch) {
      const title = stripMarkdownTokens(headingMatch[1]);
      current = { title: title || 'Insights', bullets: [] };
      sections.push(current);
      continue;
    }

    const bulletText = stripMarkdownTokens(line.replace(/^(?:[-•*]|[0-9]+\.)\s+/, ''));
    if (!current) {
      current = { title: 'Insights', bullets: [] };
      sections.push(current);
    }
    if (bulletText) {
      const key = bulletText.toLowerCase();
      if (!seenBullets.has(key)) {
        current.bullets.push(bulletText);
        seenBullets.add(key);
      }
    }
  }

  const seenTitles = new Set<string>();

  return sections
    .map((section) => {
      let title = section.title || 'Insights';
      if (seenTitles.has(title)) {
        let suffix = 2;
        while (seenTitles.has(`${title} ${suffix}`)) suffix++;
        title = `${title} ${suffix}`;
      }
      seenTitles.add(title);
      return {
        title,
        bullets: section.bullets.filter(Boolean).slice(0, 5),
      };
    })
    .filter((section) => section.bullets.length > 0)
    .slice(0, 3);
};

export const MarketResearchPanel: React.FC<MarketResearchPanelProps> = ({
  query,
  rawReport,
  isLoading,
  onClose,
}) => {
  const normalized = useMemo(() => sanitizeReport(rawReport ?? ''), [rawReport]);
  const keyFacts = useMemo(() => extractKeyFacts(normalized), [normalized]);
  const pricingHighlights = useMemo(() => extractPricingHighlights(normalized), [normalized]);
  const insightSections = useMemo(() => buildInsightSections(normalized), [normalized]);

  const heroLine = useMemo(() => {
    const firstMeaningful = normalized
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('Aspect') && !line.includes('Market Research'));

    const cleaned = firstMeaningful ? stripMarkdownTokens(firstMeaningful) : '';
    return cleaned || 'Fresh insights generated from live sources and product context.';
  }, [normalized]);

  const { isCopied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    if (!rawReport) return;
    await copy(rawReport);
  };

  const handleDownload = () => {
    if (!rawReport) return;
    const blob = new Blob([rawReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${query.replace(/\s+/g, '_')}_market_research.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative rounded-2xl border border-gray-200 shadow-lg bg-white overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-600 text-white px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Market Research Brief</p>
          <h3 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">{query}</h3>
          <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
            <Globe className="w-4 h-4" /> {heroLine}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading && !rawReport && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 animate-pulse" /> Running market scan...
            </div>
            <p className="text-xs mt-2">We search real distributor data, analyst notes and news before summarizing.</p>
          </div>
        )}

        {rawReport && isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
            Updating this brief with the freshest data...
          </div>
        )}

        {(!isLoading || !!rawReport) && (
          <>
            {keyFacts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {keyFacts.map((fact) => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner"
                  >
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{fact.label}</p>
                    <p className="text-base font-medium text-slate-800 mt-2 leading-snug">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
                We’ll add brand snapshots here once we detect non-pricing facts.
              </div>
            )}

            {pricingHighlights.length > 0 ? (
              <div className="rounded-3xl border border-black/10 bg-gradient-to-r from-amber-50 to-rose-50 p-5 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Pricing Signals</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-800">
                  {pricingHighlights.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-amber-200 p-5 text-center text-sm text-amber-700">
                No live pricing trends detected yet. Try refining the query with a SKU or retailer.
              </div>
            )}

            {insightSections.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insightSections.map((section) => (
                  <div key={section.title} className="rounded-3xl border-2 border-slate-900/5 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{section.title}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-800">
                      {section.bullets.map((bullet, idx) => (
                        <li key={`${section.title}-${idx}`} className="flex gap-3">
                          <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-slate-400" />
                          <span className="leading-relaxed text-slate-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center text-slate-500">
                {rawReport ? 'Insights ready, but the formatter could not extract highlighted sections.' : 'No findings yet. Ask another question to build a research brief.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
