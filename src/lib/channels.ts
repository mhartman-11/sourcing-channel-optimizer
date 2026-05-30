// Channel recommendation + ROI model. Pure functions over an editable benchmark set.
// Benchmarks are industry-typical defaults the user can tune in the UI.

export type RoleFamily = 'engineering' | 'data' | 'design' | 'product' | 'sales' | 'marketing' | 'ops' | 'other';
export type Seniority = 'junior' | 'mid' | 'senior' | 'lead' | 'exec';

export interface Channel {
  id: string;
  name: string;
  // Base scores 0-100 for a generic role; modifiers refine per role/seniority.
  reach: number;        // volume of candidates
  quality: number;      // typical quality of inbound/sourced
  cost: number;         // 0 = free, 100 = very expensive
  speed: number;        // time-to-first-response (higher = faster)
  effort: number;       // recruiter effort required (higher = more effort)
  strongFor: RoleFamily[];
  free: boolean;
  notes: string;
}

export const CHANNELS: Channel[] = [
  { id: 'github', name: 'GitHub Sourcing', reach: 70, quality: 85, cost: 0, speed: 55, effort: 70, strongFor: ['engineering', 'data'], free: true, notes: 'Live, free, real profiles. Best for builders who ship in public.' },
  { id: 'linkedin-xray', name: 'LinkedIn X-ray (Google)', reach: 85, quality: 75, cost: 0, speed: 50, effort: 75, strongFor: ['engineering', 'product', 'sales', 'marketing', 'ops', 'design', 'data'], free: true, notes: 'Reach LinkedIn profiles without a Recruiter seat.' },
  { id: 'linkedin-recruiter', name: 'LinkedIn Recruiter', reach: 95, quality: 80, cost: 90, speed: 70, effort: 60, strongFor: ['engineering', 'product', 'sales', 'marketing', 'ops', 'design', 'data'], free: false, notes: 'Broadest reach, highest cost. Pays off at volume.' },
  { id: 'referrals', name: 'Employee Referrals', reach: 35, quality: 95, cost: 15, speed: 65, effort: 40, strongFor: ['engineering', 'product', 'sales', 'marketing', 'ops', 'design', 'data'], free: false, notes: 'Highest quality + retention. Limited by network size.' },
  { id: 'stackoverflow', name: 'Stack Overflow', reach: 45, quality: 88, cost: 0, speed: 45, effort: 65, strongFor: ['engineering', 'data'], free: true, notes: 'Deep technical signal. Niche but high precision.' },
  { id: 'job-boards', name: 'Job Boards (Indeed/etc.)', reach: 90, quality: 55, cost: 40, speed: 80, effort: 30, strongFor: ['sales', 'marketing', 'ops'], free: false, notes: 'High volume inbound, more screening required.' },
  { id: 'dribbble', name: 'Dribbble / Behance', reach: 40, quality: 90, cost: 10, speed: 50, effort: 60, strongFor: ['design'], free: true, notes: 'Portfolio-first sourcing for design talent.' },
  { id: 'communities', name: 'Slack/Discord Communities', reach: 50, quality: 80, cost: 5, speed: 55, effort: 70, strongFor: ['engineering', 'product', 'data', 'design'], free: true, notes: 'Warm, niche, passive talent. Relationship-driven.' },
  { id: 'events', name: 'Meetups & Conferences', reach: 30, quality: 85, cost: 50, speed: 35, effort: 80, strongFor: ['engineering', 'data', 'design', 'product'], free: false, notes: 'Strong for senior/passive. Slow but high trust.' },
];

const seniorityWeight: Record<Seniority, { quality: number; cost: number }> = {
  junior: { quality: 0.8, cost: 0.9 },
  mid: { quality: 1.0, cost: 1.0 },
  senior: { quality: 1.15, cost: 1.1 },
  lead: { quality: 1.2, cost: 1.2 },
  exec: { quality: 1.25, cost: 1.4 },
};

export interface ScoredChannel extends Channel {
  fitScore: number;     // 0-100 overall recommendation
  roi: number;          // quality per cost unit
}

// Weighted recommendation. Priorities are 0-100 sliders the user controls.
export function rankChannels(
  family: RoleFamily,
  seniority: Seniority,
  priorities: { quality: number; speed: number; cost: number; reach: number },
  freeOnly: boolean,
): ScoredChannel[] {
  const sw = seniorityWeight[seniority];
  const total = priorities.quality + priorities.speed + priorities.cost + priorities.reach || 1;

  const scored = CHANNELS.filter((c) => (freeOnly ? c.free : true)).map((c): ScoredChannel => {
    const q = Math.min(100, c.quality * sw.quality);
    const adjCost = Math.min(100, c.cost * sw.cost);
    const cheapness = 100 - adjCost; // higher = cheaper = better
    const familyBonus = c.strongFor.includes(family) ? 15 : 0;

    const fit =
      (priorities.quality * q +
        priorities.speed * c.speed +
        priorities.cost * cheapness +
        priorities.reach * c.reach) /
        total +
      familyBonus;

    const roi = q / Math.max(5, adjCost); // quality per cost; free channels score very high
    return { ...c, fitScore: Math.min(100, Math.round(fit)), roi: Math.round(roi * 10) / 10 };
  });

  return scored.sort((a, b) => b.fitScore - a.fitScore);
}

export const ROLE_FAMILIES: { id: RoleFamily; label: string }[] = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'data', label: 'Data / ML' },
  { id: 'design', label: 'Design' },
  { id: 'product', label: 'Product' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'ops', label: 'Operations' },
  { id: 'other', label: 'Other' },
];

export const SENIORITIES: { id: Seniority; label: string }[] = [
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid' },
  { id: 'senior', label: 'Senior' },
  { id: 'lead', label: 'Lead / Staff' },
  { id: 'exec', label: 'Exec' },
];
