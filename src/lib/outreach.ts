// Personalized outreach generator — pure template logic, no API, no keys.
import type { Candidate } from './types';

export interface OutreachOptions {
  senderName: string;
  role: string;
  company: string;
}

export function generateOutreach(c: Candidate, opts: OutreachOptions): string {
  const { senderName, role, company } = opts;
  const firstName = c.name.split(/\s+/)[0];
  const top = c.tags.slice(0, 3);

  let hook = '';
  if (c.source === 'github') {
    const followers = c.metrics.find((m) => m.label === 'followers')?.value;
    hook = `I came across your GitHub profile${followers && Number(followers) > 100 ? ` (${followers} followers)` : ''}${top.length ? ` — your ${top.join(', ')} work stood out` : ''}.`;
  } else if (c.source === 'stackoverflow') {
    const rep = c.metrics.find((m) => m.label === 'reputation')?.value;
    hook = `I found your Stack Overflow profile${rep ? ` (${Number(rep).toLocaleString()} reputation)` : ''}${top.length ? ` — your depth in ${top.join(', ')} caught my attention` : ''}.`;
  } else if (c.source === 'reddit') {
    hook = `I saw your post on Reddit${top.length ? ` — your ${top.join(', ')} background is exactly what we're looking for` : ''}.`;
  } else if (c.source === 'hackernews') {
    hook = `I came across your Hacker News profile${top.length ? ` — your experience with ${top.join(', ')} looks very relevant` : ''}.`;
  } else {
    hook = `I came across your profile${top.length ? ` — your ${top.join(', ')} background caught my eye` : ''}.`;
  }

  const isRemote = c.location?.toLowerCase().includes('remote');
  const locationNote = c.location
    ? isRemote
      ? ' We support fully remote work.'
      : ` We're open to candidates in ${c.location} or remote.`
    : '';

  const companyPart = company ? ` at ${company}` : '';

  return `Hi ${firstName},

${hook}

I'm ${senderName || 'reaching out'}${companyPart} — we're hiring a ${role || 'talented person'} and I think you could be a strong fit.${locationNote}

Would you be open to a quick 20-minute call? No pitch, just a conversation to see if there's mutual interest.

Best,
${senderName}`.trim();
}

export function subjectLine(c: Candidate, role: string): string {
  const firstName = c.name.split(/\s+/)[0];
  const tag = c.tags[0];
  const lines = [
    `${role} opportunity — thought of you, ${firstName}`,
    `Quick question for you, ${firstName}`,
    tag ? `Your ${tag} background caught my eye` : `Opportunity that matches your profile`,
    `${role} role — open to a quick chat, ${firstName}?`,
    `${firstName} — worth a 20-minute conversation?`,
  ];
  const idx = Math.abs(c.uid.charCodeAt(c.uid.length - 1)) % lines.length;
  return lines[idx];
}
