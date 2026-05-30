// Boolean / X-ray search string builder + live deep-links to real search engines.
// Every link below opens a real, executable search — no mock data.

export interface XRayInput {
  titles: string[];      // job titles / synonyms
  skills: string[];      // must-have skills
  location: string;
  excludeRecruiters: boolean;
}

const quote = (s: string) => (s.includes(' ') ? `"${s.trim()}"` : s.trim());

function orGroup(items: string[]): string {
  const cleaned = items.map((i) => i.trim()).filter(Boolean).map(quote);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  return `(${cleaned.join(' OR ')})`;
}

// Core boolean string usable in LinkedIn Recruiter / search bars.
export function buildBoolean(input: XRayInput): string {
  const parts: string[] = [];
  const t = orGroup(input.titles);
  const s = input.skills.map((x) => x.trim()).filter(Boolean).map(quote);
  if (t) parts.push(t);
  if (s.length) parts.push(s.join(' AND '));
  if (input.location.trim()) parts.push(quote(input.location));
  let str = parts.join(' AND ');
  if (input.excludeRecruiters) str += ' NOT (recruiter OR "talent acquisition" OR sourcer OR headhunter)';
  return str.trim();
}

export interface DeepLink {
  label: string;
  url: string;
  note: string;
}

// Google X-ray strings target a site's public profile pages.
function googleXray(site: string, input: XRayInput): string {
  const titles = orGroup(input.titles);
  const skills = input.skills.map((x) => x.trim()).filter(Boolean).map(quote).join(' ');
  const loc = input.location.trim() ? quote(input.location) : '';
  const exclude = input.excludeRecruiters ? ' -recruiter -"talent acquisition" -sourcer' : '';
  return `site:${site} ${titles} ${skills} ${loc}${exclude}`.replace(/\s+/g, ' ').trim();
}

const g = (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query)}`;

export function buildDeepLinks(input: XRayInput): DeepLink[] {
  const links: DeepLink[] = [];

  links.push({
    label: 'Google X-ray · LinkedIn',
    url: g(googleXray('linkedin.com/in', input)),
    note: 'Public LinkedIn profiles via Google — no Recruiter seat needed.',
  });
  links.push({
    label: 'Google X-ray · GitHub',
    url: g(googleXray('github.com', input)),
    note: 'Developer profiles indexed on GitHub.',
  });
  links.push({
    label: 'Google X-ray · Stack Overflow',
    url: g(googleXray('stackoverflow.com/users', input)),
    note: 'Active answerers — strong signal of real expertise.',
  });

  // Native GitHub user search (also powers the live Sourcing tab).
  const ghParts: string[] = [];
  if (input.skills[0]) ghParts.push(input.skills[0].trim());
  if (input.location.trim()) ghParts.push(`location:${input.location.trim()}`);
  links.push({
    label: 'GitHub · native user search',
    url: `https://github.com/search?type=users&q=${encodeURIComponent(ghParts.join(' '))}`,
    note: 'GitHub’s own people search.',
  });

  // LinkedIn native keyword search (logged-in users land on results).
  links.push({
    label: 'LinkedIn · native people search',
    url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(buildBoolean(input))}`,
    note: 'Runs your boolean directly inside LinkedIn.',
  });
  links.push({
    label: 'Google X-ray · X / Twitter',
    url: g(googleXray('twitter.com', input)),
    note: 'Public X/Twitter bios — great for active practitioners.',
  });
  links.push({
    label: 'Google X-ray · Kaggle',
    url: g(googleXray('kaggle.com', input)),
    note: 'Data scientists with ranked, verifiable work.',
  });
  links.push({
    label: 'Google X-ray · Behance',
    url: g(googleXray('behance.net', input)),
    note: 'Portfolio-first sourcing for design talent.',
  });
  links.push({
    label: 'Google Scholar',
    url: `https://scholar.google.com/scholar?q=${encodeURIComponent([...input.skills, ...input.titles].join(' '))}`,
    note: 'Researchers & ML/AI authors by topic.',
  });
  links.push({
    label: 'Wellfound (AngelList)',
    url: `https://wellfound.com/search?q=${encodeURIComponent([orGroup(input.titles), input.location].filter(Boolean).join(' '))}`,
    note: 'Startup-leaning candidates open to new roles.',
  });

  return links;
}
