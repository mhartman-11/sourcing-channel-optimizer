// Reddit sourcing — covers technical AND non-technical talent.
// r/forhire is field-agnostic (writers, designers, marketers, VAs, ops, devs);
// the rest add depth for specific role families. Free JSON API, no auth required.
import { Candidate, SearchQuery, SourceModule, scoreCandidate } from '../types';

const SUBREDDITS =
  'forhire+freelance+jobbit+cscareerquestions+devops+MachineLearning+datascience+webdev+graphic_design+marketing+writingopportunities+VirtualAssistant';

// Skill vocabulary spanning technical and non-technical roles, so tags populate
// for marketers, designers, writers, and ops people — not just engineers.
const SKILL_KEYWORDS = [
  // Engineering / data
  'react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'node', 'nodejs',
  'rust', 'go', 'golang', 'java', 'kotlin', 'swift', 'c#', '.net', 'php', 'ruby',
  'rails', 'django', 'fastapi', 'flask', 'express', 'aws', 'gcp', 'azure', 'docker',
  'kubernetes', 'sql', 'postgres', 'mysql', 'mongodb', 'redis', 'graphql', 'rest',
  'ml', 'ai', 'llm', 'pytorch', 'tensorflow', 'data science', 'analytics', 'devops',
  'ci/cd', 'terraform', 'ios', 'android', 'flutter', 'react native',
  'solidity', 'web3', 'blockchain', 'embedded', 'c++', 'scala', 'elixir',
  // Design
  'figma', 'ux', 'ui', 'photoshop', 'illustrator', 'branding', 'logo', 'graphic design',
  'video editing', 'premiere', 'after effects', 'motion', '3d', 'blender',
  // Marketing / content
  'seo', 'sem', 'ppc', 'content', 'copywriting', 'copywriter', 'social media',
  'email marketing', 'marketing', 'growth', 'paid ads', 'google ads', 'meta ads',
  'community', 'brand', 'pr', 'influencer',
  // Writing
  'writing', 'writer', 'editing', 'proofreading', 'ghostwriting', 'technical writing',
  // Ops / business / support
  'virtual assistant', 'va', 'admin', 'data entry', 'bookkeeping', 'accounting',
  'customer support', 'project management', 'operations', 'recruiting', 'sales',
  'lead generation', 'crm', 'hubspot', 'salesforce', 'excel',
];

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((k) => lower.includes(k)).slice(0, 8);
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m && !m[0].includes('example.com') ? m[0] : null;
}

function extractLocation(title: string): string | null {
  if (/\b(remote|worldwide|global|anywhere)\b/i.test(title)) return 'Remote';
  const parts = title.split(/[|\[\]()]/);
  for (const p of parts) {
    const clean = p.trim();
    if (clean.length > 2 && clean.length < 35 && !extractTags(clean).length && !/^\$/.test(clean)) {
      if (/[A-Z]/.test(clean) && !/^(FOR HIRE|HIRE ME|AVAILABLE|LOOKING|OPEN)/i.test(clean)) {
        return clean;
      }
    }
  }
  return null;
}

const reddit: SourceModule = {
  meta: {
    id: 'reddit',
    label: 'Reddit',
    blurb: 'All roles — r/forhire, r/freelance, design, marketing, writing & dev. Active people posting "available for hire" this month.',
    strongFor: ['engineering', 'data', 'ops', 'design', 'marketing', 'sales', 'product'],
  },
  async search(q: SearchQuery) {
    const queryStr = [q.keywords, q.tech].filter(Boolean).join(' ').trim() || 'hire';
    const after = q.page > 1 ? `&count=${(q.page - 1) * 25}` : '';
    const url = `https://www.reddit.com/r/${SUBREDDITS}/search.json?q=${encodeURIComponent(queryStr)}&sort=new&limit=25&t=month&restrict_sr=on&type=link${after}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Reddit ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const posts: any[] = (json?.data?.children || []).map((c: any) => c.data);

    const candidates: Candidate[] = posts
      .filter((p) => p.author && p.author !== '[deleted]' && p.author !== 'AutoModerator')
      .map((p): Candidate => {
        const text = `${p.title} ${p.selftext || ''}`;
        const tags = extractTags(text);
        const email = extractEmail(p.selftext || '');
        const location = extractLocation(p.title);
        const bio = p.title + (p.selftext?.trim() ? '\n\n' + p.selftext.slice(0, 400) : '');

        const base: Omit<Candidate, 'matchScore'> = {
          uid: `reddit:${p.id}`,
          source: 'reddit',
          name: p.author,
          handle: p.author,
          avatar: null,
          url: `https://reddit.com/u/${encodeURIComponent(p.author)}`,
          bio,
          location,
          company: null,
          contact: { email, blog: null, twitter: null },
          tags,
          metrics: [
            { label: 'upvotes', value: String(p.score) },
            { label: 'comments', value: String(p.num_comments) },
          ],
        };
        return { ...base, matchScore: scoreCandidate(base, q, 25) + (email ? 10 : 0) };
      });

    return { total: json?.data?.dist ?? candidates.length, candidates };
  },
};

export default reddit;
