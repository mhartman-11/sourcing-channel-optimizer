// Unified, source-agnostic candidate model. Every live source normalizes to this.
// 100% free, keyless, in-browser. No backend.

export type SourceId = 'github' | 'stackoverflow' | 'hackernews' | 'devto' | 'reddit';

export interface SourceMeta {
  id: SourceId;
  label: string;
  blurb: string;
  // signal strength by role family — used to hint "best source for X"
  strongFor: string[];
}

export interface SearchQuery {
  keywords: string;   // role / skill keywords, e.g. "react typescript"
  location: string;   // free text, e.g. "Berlin"
  tech: string;       // primary language / tag, e.g. "TypeScript"
  orgName: string;    // GitHub org/company filter, e.g. "stripe"
  minSignal: number;  // source-specific floor (followers / reputation / etc.)
  page: number;       // 1-based, for load-more
}

export interface ContactSignal {
  email: string | null;   // public email (profile or commit author)
  blog: string | null;
  twitter: string | null;
}

export interface Candidate {
  uid: string;            // stable cross-source id: `${source}:${handle}`
  source: SourceId;
  name: string;
  handle: string;
  avatar: string | null;
  url: string;            // public profile / contact link
  bio: string | null;
  location: string | null;
  company: string | null;
  contact: ContactSignal;
  tags: string[];         // languages / topics / skills
  metrics: { label: string; value: string }[]; // followers, repos, reputation…
  matchScore: number;     // 0-100 relevance to query
}

export interface SourceResult {
  total: number;          // approximate total matches (0 if unknown)
  candidates: Candidate[];
}

export interface SourceModule {
  meta: SourceMeta;
  search: (q: SearchQuery) => Promise<SourceResult>;
}

export const splitTerms = (s: string): string[] =>
  s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

// Shared relevance scorer over normalized fields. Sources may add their own boosts.
export function scoreCandidate(c: Omit<Candidate, 'matchScore'>, q: SearchQuery, base = 35): number {
  let s = base;
  const kw = splitTerms(q.keywords.toLowerCase());
  const tech = q.tech.trim().toLowerCase();
  const tags = c.tags.map((t) => t.toLowerCase());
  const hay = `${c.bio || ''} ${c.tags.join(' ')} ${c.company || ''} ${c.name}`.toLowerCase();

  if (tech && tags.includes(tech)) s += 22;
  s += Math.min(24, kw.filter((k) => hay.includes(k)).length * 8);
  if (c.contact.email) s += 8;
  if (q.location && c.location && c.location.toLowerCase().includes(q.location.toLowerCase())) s += 6;
  if (c.bio) s += 3;
  return Math.max(0, Math.min(100, Math.round(s)));
}
