// Hacker News "Who wants to be hired?" — Algolia API, keyless. Active job-seekers, monthly thread.
import { Candidate, SearchQuery, SourceModule, scoreCandidate, splitTerms } from '../types';

const ALGOLIA = 'https://hn.algolia.com/api/v1';
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x2F;/g, '/').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const hackernews: SourceModule = {
  meta: {
    id: 'hackernews',
    label: 'HN: Who wants to be hired',
    blurb: 'People actively job-seeking in the latest monthly HN thread.',
    strongFor: ['engineering', 'data', 'product', 'design'],
  },
  async search(q: SearchQuery) {
    // Newest monthly "Who wants to be hired?" thread, posted by the whoishiring bot.
    const sRes = await fetch(`${ALGOLIA}/search_by_date?tags=story,author_whoishiring&query=${encodeURIComponent('who wants to be hired')}&hitsPerPage=10`);
    if (!sRes.ok) throw new Error(`Hacker News ${sRes.status}: ${sRes.statusText}`);
    const hits: any[] = (await sRes.json()).hits || [];
    const story = hits.find((h) => /who wants to be hired/i.test(h.title || ''));
    if (!story) throw new Error('No "Who wants to be hired" thread found.');

    const iRes = await fetch(`${ALGOLIA}/items/${story.objectID}`);
    if (!iRes.ok) throw new Error(`Hacker News ${iRes.status}: ${iRes.statusText}`);
    const item = await iRes.json();
    const comments: any[] = (item.children || []).filter((c: any) => c.text && c.author);

    const terms = splitTerms(`${q.keywords} ${q.tech}`).map((t) => t.toLowerCase());
    const loc = q.location.trim().toLowerCase();

    const matched = comments.filter((c) => {
      const text = strip(c.text).toLowerCase();
      const kwOk = terms.length === 0 || terms.some((t) => text.includes(t));
      const locOk = !loc || text.includes(loc);
      return kwOk && locOk;
    });

    const candidates: Candidate[] = matched.slice(0, 25).map((c) => {
      const text = strip(c.text);
      const email = text.match(EMAIL_RE)?.[0] || null;
      const base: Omit<Candidate, 'matchScore'> = {
        uid: `hackernews:${c.id}`,
        source: 'hackernews',
        name: c.author,
        handle: c.author,
        avatar: null,
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        bio: text.slice(0, 320),
        location: null,
        company: null,
        contact: { email, blog: null, twitter: null },
        tags: terms.filter((t) => text.toLowerCase().includes(t)),
        metrics: [{ label: 'self-posted', value: 'job-seeker' }],
      };
      return { ...base, matchScore: scoreCandidate(base, q, 55) };
    });
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    return { total: matched.length, candidates };
  },
};

export default hackernews;
