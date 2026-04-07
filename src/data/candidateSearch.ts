// Free candidate search via Vite-server-side scraping (Bing → DDG fallback).
// Returns top LinkedIn profile candidates matching the role + skills + location.

export interface Candidate {
  name: string;
  headline: string;
  url: string;
  source: 'LinkedIn' | 'GitHub' | 'Other';
  matchScore: number;
}

interface SearchInputs {
  roleTitle: string;
  skills: string[];
  location: string;
  industry: string;
}

interface RawHit {
  title: string;
  url: string;
  snippet: string;
}

function buildLinkedInQuery(inputs: SearchInputs): string {
  const { roleTitle, skills, location, industry } = inputs;
  const parts: string[] = ['site:linkedin.com/in'];
  if (roleTitle.trim()) parts.push(`"${roleTitle.trim()}"`);
  if (location.trim()) parts.push(`"${location.trim()}"`);
  if (industry.trim()) parts.push(`"${industry.trim()}"`);
  if (skills.length) {
    const skillStr = skills.slice(0, 3).map(s => `"${s}"`).join(' OR ');
    parts.push(`(${skillStr})`);
  }
  return parts.join(' ');
}

function cleanLinkedInTitle(rawTitle: string): { name: string; headline: string } {
  // Bing/DDG titles for LinkedIn typically: "Jane Doe - Senior Engineer at Acme | LinkedIn"
  let cleaned = rawTitle
    .replace(/\s*[-|·]\s*LinkedIn\s*$/i, '')
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .trim();
  const splitMatch = cleaned.match(/^([^-|·]+?)\s*[-|·]\s*(.+)$/);
  if (!splitMatch) return { name: cleaned, headline: '' };
  return { name: splitMatch[1].trim(), headline: splitMatch[2].trim() };
}

function scoreMatch(text: string, skills: string[], roleTitle: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  const roleWords = roleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (roleWords.length) {
    const hits = roleWords.filter(w => lower.includes(w)).length;
    score += (hits / roleWords.length) * 50;
  }

  if (skills.length) {
    const hits = skills.filter(s => lower.includes(s.toLowerCase())).length;
    score += (hits / skills.length) * 50;
  } else {
    score += 25;
  }

  return Math.min(Math.round(score), 100);
}

export async function searchCandidates(inputs: SearchInputs): Promise<Candidate[]> {
  const query = buildLinkedInQuery(inputs);
  const url = `/api/search?q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Search failed (${res.status}): ${body.slice(0, 100)}`);
  }

  const data = await res.json() as { results?: RawHit[]; error?: string };
  if (data.error) throw new Error(data.error);

  const hits = data.results || [];
  const candidates: Candidate[] = [];

  for (const hit of hits) {
    if (!hit.url.includes('linkedin.com/in/')) continue;
    const { name, headline } = cleanLinkedInTitle(hit.title);
    if (!name) continue;

    const matchText = `${headline} ${hit.snippet}`;
    const matchScore = scoreMatch(matchText, inputs.skills, inputs.roleTitle);

    candidates.push({
      name,
      headline: headline || hit.snippet.slice(0, 120),
      url: hit.url,
      source: 'LinkedIn',
      matchScore,
    });
  }

  // Dedupe by URL, sort by score, take top 10
  const seen = new Set<string>();
  const deduped = candidates.filter(c => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  return deduped.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}
