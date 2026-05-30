// Dev.to — public API, keyless. Authors writing about a tech = engaged, discoverable practitioners.
import { Candidate, SearchQuery, SourceModule, scoreCandidate, splitTerms } from '../types';

const API = 'https://dev.to/api';

const devto: SourceModule = {
  meta: {
    id: 'devto',
    label: 'Dev.to',
    blurb: 'Practitioners who write about the stack — built-in work samples.',
    strongFor: ['engineering', 'data', 'product'],
  },
  async search(q: SearchQuery) {
    const tag = (q.tech.trim() || splitTerms(q.keywords)[0] || 'javascript').toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = `${API}/articles?tag=${encodeURIComponent(tag)}&per_page=30&page=${q.page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Dev.to ${res.status}: ${res.statusText}`);
    const articles: any[] = await res.json();

    const seen = new Set<string>();
    const candidates: Candidate[] = [];
    for (const a of articles) {
      const u = a.user;
      if (!u || seen.has(u.username)) continue;
      seen.add(u.username);
      const base: Omit<Candidate, 'matchScore'> = {
        uid: `devto:${u.username}`,
        source: 'devto',
        name: u.name || u.username,
        handle: u.username,
        avatar: u.profile_image_90 || u.profile_image || null,
        url: `https://dev.to/${u.username}`,
        bio: `Wrote: "${a.title}"`,
        location: null,
        company: null,
        contact: { email: null, blog: a.url, twitter: u.twitter_username ? `https://x.com/${u.twitter_username}` : null },
        tags: (a.tag_list || []).slice(0, 4),
        metrics: [
          { label: 'reactions', value: String(a.public_reactions_count ?? 0) },
          { label: 'comments', value: String(a.comments_count ?? 0) },
        ],
      };
      candidates.push({ ...base, matchScore: scoreCandidate(base, q, 45) });
    }
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    return { total: candidates.length, candidates };
  },
};

export default devto;
