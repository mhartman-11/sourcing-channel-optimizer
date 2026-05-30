// Stack Overflow — Stack Exchange API, keyless (~300 req/day/IP). Top answerers per tag = deep expertise.
import { Candidate, SearchQuery, SourceModule, scoreCandidate, splitTerms } from '../types';

const API = 'https://api.stackexchange.com/2.3';

function tagFor(q: SearchQuery): string {
  const t = q.tech.trim() || splitTerms(q.keywords)[0] || 'javascript';
  return t.toLowerCase().replace(/\s+/g, '-');
}

const stackoverflow: SourceModule = {
  meta: {
    id: 'stackoverflow',
    label: 'Stack Overflow',
    blurb: 'Top answerers for a technology — high-precision technical signal.',
    strongFor: ['engineering', 'data'],
  },
  async search(q: SearchQuery) {
    const tag = encodeURIComponent(tagFor(q));
    const url = `${API}/tags/${tag}/top-answerers/all_time?site=stackoverflow&pagesize=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Stack Overflow ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.error_message) throw new Error(`Stack Overflow: ${data.error_message}`);
    const items: any[] = (data.items || []).filter((i: any) => i.user);

    const candidates: Candidate[] = items.map((i) => {
      const u = i.user;
      const base: Omit<Candidate, 'matchScore'> = {
        uid: `stackoverflow:${u.user_id}`,
        source: 'stackoverflow',
        name: u.display_name,
        handle: String(u.user_id),
        avatar: u.profile_image || null,
        url: u.link,
        bio: null,
        location: null,
        company: null,
        contact: { email: null, blog: u.website_url || null, twitter: null },
        tags: [tagFor(q)],
        metrics: [
          { label: 'reputation', value: Number(u.reputation || 0).toLocaleString() },
          { label: 'tag score', value: String(i.score ?? 0) },
          { label: 'answers', value: String(i.post_count ?? 0) },
        ],
      };
      return { ...base, matchScore: scoreCandidate(base, q, 50) };
    });
    return { total: candidates.length, candidates };
  },
};

export default stackoverflow;
