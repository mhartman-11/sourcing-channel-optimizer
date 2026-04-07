import { RoleCategory } from './benchmarks';

export interface XRayInputs {
  roleTitle: string;
  category: RoleCategory | null;
  industry: string;
  skills: string[];      // parsed from comma-separated input
  location: string;
}

export interface XRaySearch {
  platform: string;
  query: string;
  description: string;
  // Categories where this platform is irrelevant — empty means show for all
  excludeCategories?: RoleCategory[];
}

const quote = (s: string) => `"${s.trim()}"`;

function joinSkillsOr(skills: string[], max = 4): string {
  const slice = skills.filter(Boolean).slice(0, max);
  if (slice.length === 0) return '';
  return slice.map(quote).join(' OR ');
}

function locationClause(location: string): string {
  return location.trim() ? ` ${quote(location)}` : '';
}

function industryClause(industry: string): string {
  return industry.trim() ? ` ${quote(industry)}` : '';
}

export function generateXRaySearches(inputs: XRayInputs): XRaySearch[] {
  const { roleTitle, category, industry, skills, location } = inputs;
  const role = roleTitle.trim();
  const skillsClause = skills.length ? ` (${joinSkillsOr(skills)})` : '';
  const loc = locationClause(location);
  const ind = industryClause(industry);

  const searches: XRaySearch[] = [
    {
      platform: 'LinkedIn — Title Match',
      query: `site:linkedin.com/in ${quote(role)}${loc}${ind} -intitle:"jobs" -intitle:"hiring"`,
      description: 'Profiles where the headline / current title matches your role exactly',
    },
    {
      platform: 'LinkedIn — Skills Match',
      query: `site:linkedin.com/in${skillsClause || ` ${quote(role)}`}${loc}${ind} -"open to work" -"looking for"`,
      description: skills.length
        ? 'Broader profile match using your must-have skills'
        : 'Add skills above to refine this search',
    },
    {
      platform: 'Indeed Resumes',
      query: `site:indeed.com/r ${quote(role)}${loc}${skillsClause}`,
      description: 'Publicly posted resumes on Indeed',
    },
    {
      platform: 'Resume Files (PDF / DOC)',
      query: `${quote(role)} resume (filetype:pdf OR filetype:doc OR filetype:docx)${loc}${skillsClause} -job -apply -hire`,
      description: 'Public resume documents indexed by Google',
    },
    {
      platform: 'GitHub Profiles',
      query: `site:github.com${skillsClause || ` ${quote(role)}`} "followers"${loc} -gist -issues`,
      description: 'Active GitHub developers matching skills',
      excludeCategories: ['corporate', 'sales', 'supplychain', 'healthcare', 'finance', 'creative', 'marketing', 'legal', 'hr', 'executive'],
    },
    {
      platform: 'Stack Overflow Users',
      query: `site:stackoverflow.com/users ${quote(role)}${skillsClause}`,
      description: 'Top contributors with technical depth signal',
      excludeCategories: ['corporate', 'sales', 'supplychain', 'healthcare', 'finance', 'creative', 'marketing', 'legal', 'hr', 'executive'],
    },
    {
      platform: 'Dribbble / Behance',
      query: `(site:dribbble.com OR site:behance.net) ${quote(role)}${skillsClause}${loc}`,
      description: 'Designers with public portfolios',
      excludeCategories: ['tech', 'corporate', 'sales', 'supplychain', 'healthcare', 'finance', 'legal', 'hr', 'executive'],
    },
    {
      platform: 'Twitter / X Bios',
      query: `site:twitter.com ${quote(role)}${skillsClause} bio${loc}`,
      description: 'Public bios that identify with this role',
    },
  ];

  return searches.filter(s => !category || !s.excludeCategories?.includes(category));
}

export function buildGoogleUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function parseSkills(input: string): string[] {
  return input.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}
