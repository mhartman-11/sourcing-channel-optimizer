// GitHub live sourcing — public REST API, no key (60 req/hr unauth, ~10 search/min).
import { Candidate, SearchQuery, SourceModule, scoreCandidate } from '../types';

const API = 'https://api.github.com';

async function gh(path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 403) {
    const reset = res.headers.get('x-ratelimit-reset');
    const when = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'shortly';
    throw new Error(`GitHub rate limit hit (free 60/hr). Resets ~${when}. Try other sources meanwhile.`);
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`);
  return res.json();
}

function buildQuery(q: SearchQuery): string {
  const parts: string[] = [];
  if (q.keywords.trim()) parts.push(q.keywords.trim());
  if (q.location.trim()) parts.push(`location:"${q.location.trim()}"`);
  if (q.tech.trim()) parts.push(`language:${q.tech.trim()}`);
  if (q.minSignal > 0) parts.push(`followers:>=${q.minSignal}`);
  return parts.join(' ') || 'followers:>=50';
}

async function topLanguages(login: string): Promise<string[]> {
  try {
    const repos: any[] = await gh(`/users/${login}/repos?per_page=100&sort=pushed`);
    const counts = new Map<string, number>();
    for (const r of repos) if (!r.fork && r.language) counts.set(r.language, (counts.get(r.language) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map((e) => e[0]);
  } catch {
    return [];
  }
}

// Mine a public commit email from the user's recent push events — the recruiter goldmine.
async function commitEmail(login: string): Promise<string | null> {
  try {
    const events: any[] = await gh(`/users/${login}/events/public?per_page=30`);
    for (const e of events) {
      if (e.type !== 'PushEvent') continue;
      for (const c of e.payload?.commits || []) {
        const email: string | undefined = c.author?.email;
        if (email && !email.endsWith('users.noreply.github.com') && !email.includes('noreply')) return email;
      }
    }
  } catch {
    /* ignore — enrichment is best-effort */
  }
  return null;
}

const github: SourceModule = {
  meta: {
    id: 'github',
    label: 'GitHub',
    blurb: 'Builders who ship in public. Live profiles + mined commit emails.',
    strongFor: ['engineering', 'data'],
  },
  async search(q: SearchQuery) {
    const per = 12;
    const search = encodeURIComponent(buildQuery(q));
    const data = await gh(`/search/users?q=${search}&per_page=${per}&page=${q.page}&sort=followers&order=desc`);
    const raw: { login: string }[] = data.items || [];

    const candidates = await Promise.all(
      raw.map(async (u): Promise<Candidate> => {
        const d = await gh(`/users/${u.login}`);
        const [tags, mined] = await Promise.all([topLanguages(u.login), commitEmail(u.login)]);
        const base: Omit<Candidate, 'matchScore'> = {
          uid: `github:${d.login}`,
          source: 'github',
          name: d.name || d.login,
          handle: d.login,
          avatar: d.avatar_url,
          url: d.html_url,
          bio: d.bio,
          location: d.location,
          company: d.company,
          contact: {
            email: d.email || mined,
            blog: d.blog || null,
            twitter: d.twitter_username ? `https://x.com/${d.twitter_username}` : null,
          },
          tags,
          metrics: [
            { label: 'followers', value: String(d.followers ?? 0) },
            { label: 'repos', value: String(d.public_repos ?? 0) },
            ...(d.hireable ? [{ label: 'status', value: 'hireable' }] : []),
          ],
        };
        return { ...base, matchScore: scoreCandidate(base, q) + (d.hireable ? 8 : 0) };
      }),
    );
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    return { total: data.total_count || candidates.length, candidates };
  },
};

export default github;
