// Industry benchmark data sourced from:
// LinkedIn Talent Trends, SHRM Human Capital Benchmarking, iCIMS Workforce Report,
// Jobvite Recruiter Nation Report, DHI Group Hiring Indicators

export type RoleCategory =
  | 'tech'
  | 'corporate'
  | 'sales'
  | 'supplychain'
  | 'healthcare'
  | 'finance'
  | 'creative'
  | 'marketing'
  | 'legal'
  | 'hr'
  | 'executive';

export type Seniority = 'entry' | 'mid' | 'senior' | 'director';
export type EffortLevel = 'Low' | 'Medium' | 'High';

export interface ChannelBenchmark {
  id: string;
  name: string;
  yieldRateMin: number;
  yieldRateMax: number;
  cphMin: number;
  cphMax: number;
  timeToFill: number;
  effortLevel: EffortLevel;
  bestFor: string;
  notes: string;
  excludeCategories?: RoleCategory[];
  excludeSeniorities?: Seniority[];
  isFree: boolean;
  rankScore: number;
}

export const ALL_CATEGORIES: { value: RoleCategory; label: string }[] = [
  { value: 'tech', label: 'Tech / Engineering' },
  { value: 'corporate', label: 'Corporate / G&A' },
  { value: 'sales', label: 'Sales / Commercial' },
  { value: 'supplychain', label: 'Supply Chain / Mfg' },
  { value: 'healthcare', label: 'Healthcare / Clinical' },
  { value: 'finance', label: 'Finance / Accounting' },
  { value: 'creative', label: 'Creative / Design' },
  { value: 'marketing', label: 'Marketing / Comms' },
  { value: 'legal', label: 'Legal' },
  { value: 'hr', label: 'HR / People Ops' },
  { value: 'executive', label: 'Executive Leadership' },
];

export const ALL_SENIORITIES: { value: Seniority; label: string }[] = [
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'director', label: 'Director+' },
];

export const INDUSTRIES = [
  'Technology / SaaS',
  'Financial Services',
  'Healthcare / Pharma',
  'Manufacturing / Industrial',
  'Retail / CPG',
  'Energy / Utilities',
  'Media / Entertainment',
  'Education',
  'Government / Public Sector',
  'Professional Services',
  'Real Estate',
  'Transportation / Logistics',
  'Hospitality',
  'Nonprofit',
];

export const CHANNELS: ChannelBenchmark[] = [
  {
    id: 'referrals',
    name: 'Employee Referrals',
    yieldRateMin: 30, yieldRateMax: 45,
    cphMin: 1000, cphMax: 3500,
    timeToFill: 29,
    effortLevel: 'Low',
    bestFor: 'Highest quality hires + best retention (46% 2yr vs 33% avg)',
    notes: 'Should anchor every sourcing strategy. Lowest CPH, fastest TTF.',
    isFree: false,
    rankScore: 95,
  },
  {
    id: 'linkedin-recruiter',
    name: 'LinkedIn Recruiter',
    yieldRateMin: 12, yieldRateMax: 22,
    cphMin: 3500, cphMax: 8000,
    timeToFill: 42,
    effortLevel: 'Medium',
    bestFor: 'Mid-to-senior passive candidates with documented careers',
    notes: 'InMail response rates ~18–25% with personalization. Weak for hourly/operational roles.',
    excludeCategories: ['supplychain'],
    excludeSeniorities: ['entry'],
    isFree: false,
    rankScore: 88,
  },
  {
    id: 'internal-mobility',
    name: 'Internal Mobility / ATS Reactivation',
    yieldRateMin: 20, yieldRateMax: 35,
    cphMin: 500, cphMax: 2000,
    timeToFill: 25,
    effortLevel: 'Low',
    bestFor: 'Lateral moves, promotions, silver-medalist reactivation',
    notes: 'ATS reactivation can fill 10–15% of open roles at near-zero cost.',
    isFree: true,
    rankScore: 90,
  },
  {
    id: 'xray-boolean',
    name: 'Google X-Ray / Boolean',
    yieldRateMin: 5, yieldRateMax: 10,
    cphMin: 200, cphMax: 800,
    timeToFill: 55,
    effortLevel: 'Medium',
    bestFor: 'Budget-constrained sourcing, passive candidates not on job boards',
    notes: 'Zero tool cost. Excellent ROI when recruiter has strong Boolean skill.',
    excludeSeniorities: ['entry'],
    isFree: true,
    rankScore: 72,
  },
  {
    id: 'indeed',
    name: 'Indeed / ZipRecruiter',
    yieldRateMin: 3, yieldRateMax: 8,
    cphMin: 1500, cphMax: 4500,
    timeToFill: 38,
    effortLevel: 'Low',
    bestFor: 'High-volume active applicants, entry/mid, hourly + operational roles',
    notes: 'Highest applicant volume. Best signal for ops, supply chain, healthcare support, retail.',
    excludeCategories: ['executive'],
    isFree: false,
    rankScore: 65,
  },
  {
    id: 'github',
    name: 'GitHub / Dev Communities',
    yieldRateMin: 6, yieldRateMax: 14,
    cphMin: 1000, cphMax: 3000,
    timeToFill: 58,
    effortLevel: 'High',
    bestFor: 'Software engineers, data scientists, OSS contributors',
    notes: 'Signals real technical skill. Combine with Stack Overflow + Dev.to.',
    excludeCategories: ['corporate', 'sales', 'supplychain', 'healthcare', 'creative', 'marketing', 'legal', 'hr', 'executive', 'finance'],
    isFree: true,
    rankScore: 78,
  },
  {
    id: 'niche-boards',
    name: 'Niche Job Boards',
    yieldRateMin: 8, yieldRateMax: 18,
    cphMin: 500, cphMax: 3000,
    timeToFill: 44,
    effortLevel: 'Medium',
    bestFor: 'Specialized roles: Dice (tech), Wellfound (startup), Health eCareers, Dribbble (design)',
    notes: 'Better signal-to-noise than broad boards when matched to vertical.',
    isFree: false,
    rankScore: 70,
  },
  {
    id: 'conferences',
    name: 'Conferences / Meetups',
    yieldRateMin: 8, yieldRateMax: 18,
    cphMin: 2000, cphMax: 6000,
    timeToFill: 60,
    effortLevel: 'High',
    bestFor: 'Senior+ passive talent, technical thought leaders, vertical specialists',
    notes: 'Long lead time but builds durable pipeline for hard-to-fill roles.',
    excludeSeniorities: ['entry'],
    isFree: false,
    rankScore: 62,
  },
  {
    id: 'agency-rpo',
    name: 'Staffing Agency / RPO',
    yieldRateMin: 20, yieldRateMax: 35,
    cphMin: 15000, cphMax: 30000,
    timeToFill: 32,
    effortLevel: 'Low',
    bestFor: 'Urgent fills, niche specializations, thin talent markets, volume surges',
    notes: 'Highest CPH but fastest for hard roles. Fees typically 15–25% of first-year salary.',
    excludeSeniorities: ['entry'],
    isFree: false,
    rankScore: 58,
  },
  {
    id: 'linkedin-organic',
    name: 'LinkedIn Organic / Easy Apply',
    yieldRateMin: 4, yieldRateMax: 10,
    cphMin: 800, cphMax: 2500,
    timeToFill: 40,
    effortLevel: 'Low',
    bestFor: 'Active candidates, brand-aware applicants, white-collar roles',
    notes: 'Free posts average ~34 applicants. Lower yield than paid Recruiter seats.',
    excludeSeniorities: ['director'],
    isFree: false,
    rankScore: 68,
  },
  {
    id: 'university',
    name: 'University / Campus Recruiting',
    yieldRateMin: 15, yieldRateMax: 28,
    cphMin: 1500, cphMax: 5000,
    timeToFill: 90,
    effortLevel: 'High',
    bestFor: 'Entry-level, internships, early-career rotational programs',
    notes: '6–9 month runway but builds durable early-career pipeline.',
    excludeSeniorities: ['mid', 'senior', 'director'],
    isFree: false,
    rankScore: 74,
  },
  {
    id: 'executive-search',
    name: 'Retained Executive Search',
    yieldRateMin: 25, yieldRateMax: 40,
    cphMin: 60000, cphMax: 150000,
    timeToFill: 75,
    effortLevel: 'Low',
    bestFor: 'C-suite, VP+, board-level placements requiring confidentiality',
    notes: 'Fee typically 33% of first-year cash comp. Use only when true confidentiality or scarcity demands.',
    excludeSeniorities: ['entry', 'mid', 'senior'],
    isFree: false,
    rankScore: 82,
  },
];

// Multipliers adjust rank score based on category fit
const CATEGORY_MULTIPLIERS: Partial<Record<RoleCategory, Partial<Record<string, number>>>> = {
  tech: {
    'github': 1.3, 'linkedin-recruiter': 1.2, 'xray-boolean': 1.2,
    'niche-boards': 1.15, 'conferences': 1.1, 'indeed': 0.6,
  },
  corporate: {
    'linkedin-recruiter': 1.25, 'linkedin-organic': 1.2, 'niche-boards': 1.1, 'indeed': 1.1,
  },
  sales: {
    'linkedin-recruiter': 1.3, 'referrals': 1.2, 'niche-boards': 1.1, 'indeed': 1.1,
  },
  supplychain: {
    'indeed': 1.4, 'agency-rpo': 1.2, 'referrals': 1.15, 'university': 1.1, 'conferences': 0.7,
  },
  healthcare: {
    'niche-boards': 1.35, 'indeed': 1.25, 'referrals': 1.2, 'agency-rpo': 1.15,
  },
  finance: {
    'linkedin-recruiter': 1.25, 'niche-boards': 1.15, 'agency-rpo': 1.1, 'referrals': 1.1,
  },
  creative: {
    'niche-boards': 1.4, 'linkedin-recruiter': 1.05, 'xray-boolean': 1.15,
  },
  marketing: {
    'linkedin-recruiter': 1.2, 'linkedin-organic': 1.15, 'niche-boards': 1.15, 'referrals': 1.1,
  },
  legal: {
    'agency-rpo': 1.3, 'linkedin-recruiter': 1.2, 'niche-boards': 1.15, 'referrals': 1.1,
  },
  hr: {
    'linkedin-recruiter': 1.2, 'referrals': 1.2, 'conferences': 1.1, 'niche-boards': 1.1,
  },
  executive: {
    'executive-search': 1.5, 'referrals': 1.3, 'conferences': 1.25, 'linkedin-recruiter': 1.1,
    'indeed': 0.2, 'linkedin-organic': 0.4,
  },
};

const SENIORITY_MULTIPLIERS: Partial<Record<Seniority, Partial<Record<string, number>>>> = {
  entry: {
    'university': 1.5, 'indeed': 1.3, 'linkedin-organic': 1.2, 'referrals': 1.1,
  },
  mid: {
    'linkedin-recruiter': 1.1, 'xray-boolean': 1.1, 'niche-boards': 1.1,
  },
  senior: {
    'referrals': 1.2, 'linkedin-recruiter': 1.2, 'xray-boolean': 1.15,
    'conferences': 1.3, 'indeed': 0.7,
  },
  director: {
    'referrals': 1.3, 'conferences': 1.4, 'agency-rpo': 1.25, 'linkedin-recruiter': 1.15,
    'xray-boolean': 1.1, 'indeed': 0.4, 'executive-search': 1.3,
  },
};

export interface RankedChannel extends ChannelBenchmark {
  adjustedScore: number;
}

export function getRankedChannels(
  category: RoleCategory | null,
  seniority: Seniority | null
): RankedChannel[] {
  const catMults = (category && CATEGORY_MULTIPLIERS[category]) || {};
  const senMults = (seniority && SENIORITY_MULTIPLIERS[seniority]) || {};

  return CHANNELS
    .filter(ch => {
      if (category && ch.excludeCategories?.includes(category)) return false;
      if (seniority && ch.excludeSeniorities?.includes(seniority)) return false;
      return true;
    })
    .map(ch => {
      const catMult = catMults[ch.id] ?? 1;
      const senMult = senMults[ch.id] ?? 1;
      return { ...ch, adjustedScore: Math.round(ch.rankScore * catMult * senMult) };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}
