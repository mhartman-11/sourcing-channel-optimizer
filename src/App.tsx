import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { brand } from './theme';
import { searchSources, SOURCES, type SourceOutcome } from './lib/sources';
import type { Candidate, SearchQuery, SourceId } from './lib/types';
import { buildBoolean, buildDeepLinks, type XRayInput } from './lib/xray';
import { rankChannels, ROLE_FAMILIES, SENIORITIES, type RoleFamily, type Seniority } from './lib/channels';
import {
  deleteSavedSearch,
  exportCsv,
  exportJson,
  isSaved,
  loadPipeline,
  loadSavedSearches,
  saveSearch,
  STAGES,
  toggleSave,
  updateSaved,
  type SavedCandidate,
  type SavedSearch,
  type Stage,
} from './lib/storage';
import { generateOutreach, subjectLine } from './lib/outreach';

type Tab = 'sourcing' | 'xray' | 'channels' | 'pipeline';

const f = "'Inter', system-ui, -apple-system, sans-serif";
const serif = "'Instrument Serif', Georgia, serif";
const mono = "'JetBrains Mono', ui-monospace, monospace";

const card: React.CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: 14,
  padding: 20,
};

/* Which live sources suit technical vs. all-role hiring. Drives the grouped picker. */
const SOURCE_GROUPS: { label: string; note: string; ids: SourceId[] }[] = [
  {
    label: 'Technical roles',
    note: 'Engineers, data & ML — people who build in public.',
    ids: ['github', 'stackoverflow', 'hackernews', 'devto'],
  },
  {
    label: 'All roles',
    note: 'Design, marketing, writing, ops, sales & dev — anyone posting "available for hire".',
    ids: ['reddit'],
  },
];

/* Per-tab "how to use it" copy. Rendered as the intro panel on each tab. */
const TAB_GUIDE: Record<Tab, { purpose: string; steps: string[] }> = {
  sourcing: {
    purpose: 'Pull real, public candidate profiles from live sources. No login, no API keys, no cost.',
    steps: [
      'Pick your sources — technical sites for engineers, or "All roles" for everyone else.',
      'Enter keywords or skills, and optionally a location, technology, or company.',
      'Hit Source candidates, then expand a profile, save it to your pipeline, or generate outreach.',
    ],
  },
  xray: {
    purpose: 'Build a Boolean search string and ready-made search links to find candidates on LinkedIn and the open web. Works for any role.',
    steps: [
      'Enter the job titles, must-have skills, and location you are hiring for.',
      'Copy the Boolean string, or click a search link to run it on Google, LinkedIn, or GitHub.',
      'No Recruiter seat needed — these reach public profiles for free.',
    ],
  },
  channels: {
    purpose: 'Compare sourcing channels and see which gives the best return for a specific role and seniority.',
    steps: [
      'Choose the role family and seniority you are hiring for.',
      'Set your priorities — drag the sliders for quality, speed, cost, and reach.',
      'Read the ranked list: higher fit score means a better channel for this hire.',
    ],
  },
  pipeline: {
    purpose: 'Your saved shortlist. Track every candidate by stage and export the list when you are ready.',
    steps: [
      'Save candidates from the Live Sourcing tab to build your shortlist.',
      'Move each person through stages and add notes on fit or next steps.',
      'Export the whole pipeline to CSV or JSON anytime.',
    ],
  },
};

/* ---------------- Primitives ---------------- */

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    x: <line x1="18" y1="6" x2="6" y2="18" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {name === 'x' ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : paths[name]}
    </svg>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'sco-spin 0.7s linear infinite',
      }}
      aria-hidden="true"
    />
  );
}

function chip(text: string, bg: string, fg: string, key?: string) {
  return (
    <span key={key || text} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 150 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: brand.textMuted, letterSpacing: 0.3 }}>{label.toUpperCase()}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: brand.bgCreamWarm,
  border: `1px solid ${brand.border}`,
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  color: brand.text,
  fontFamily: f,
  outline: 'none',
  minHeight: 44,
};

function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  href,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
  disabled?: boolean;
  href?: string;
  ariaLabel?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: brand.primary, color: '#fff', border: 'none' },
    accent: { background: brand.accent, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: brand.primary, border: `1px solid ${brand.border}` },
  };
  const s: React.CSSProperties = {
    ...styles[variant],
    padding: '10px 16px',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: f,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    transition: 'background 0.2s, opacity 0.2s',
  };
  const cls = `sco-btn${variant === 'ghost' ? ' sco-btn-ghost' : ''}`;
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" style={s} aria-label={ariaLabel} className={cls}>
        {children}
      </a>
    );
  return (
    <button onClick={onClick} disabled={disabled} style={s} aria-label={ariaLabel} className={cls}>
      {children}
    </button>
  );
}

const sourceColor: Record<SourceId, string> = {
  github: '#1C3329',
  stackoverflow: '#C5533A',
  hackernews: '#2E5243',
  devto: '#4A3F35',
  reddit: '#7B3F1E',
};

/* Small uppercase eyebrow label used to title sections. */
function SectionLabel({ children, color = brand.textMuted }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
      {children}
    </div>
  );
}

/* "How to use this tab" intro panel. Purpose line + numbered steps. */
function TabIntro({ title, guide }: { title: string; guide: { purpose: string; steps: string[] } }) {
  return (
    <div
      className="sco-rise"
      style={{
        background: brand.primaryLight,
        border: `1px solid ${brand.border}`,
        borderRadius: 16,
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <SectionLabel color={brand.primaryMid}>How to use this</SectionLabel>
        <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.1, color: brand.primary, marginTop: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: brand.textMid, lineHeight: 1.55, marginTop: 8, maxWidth: '68ch' }}>{guide.purpose}</div>
      </div>
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
        {guide.steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, color: brand.textMid, lineHeight: 1.5 }}>
            <span
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: 8,
                background: brand.primary,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: mono,
              }}
            >
              {i + 1}
            </span>
            <span style={{ paddingTop: 2 }}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Candidate Modal ---------------- */

interface OutreachSettings {
  senderName: string;
  role: string;
  company: string;
}

function CandidateModal({
  c,
  saved,
  onToggle,
  onClose,
  outreach,
  setOutreach,
}: {
  c: Candidate;
  saved: boolean;
  onToggle: (c: Candidate) => void;
  onClose: () => void;
  outreach: OutreachSettings;
  setOutreach: (o: OutreachSettings) => void;
}) {
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const msg = generateOutreach(c, outreach);
  const subject = subjectLine(c, outreach.role || 'this role');

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,51,41,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${c.name} profile`}
    >
      <div style={{ background: brand.surface, borderRadius: 18, width: '100%', maxWidth: 680, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, background: brand.bgAlt, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand.textMuted }}
        >
          <Icon name="x" size={16} color={brand.textMuted} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {c.avatar
            ? <img src={c.avatar} alt="" width={72} height={72} style={{ borderRadius: 16, border: `2px solid ${brand.border}` }} />
            : <div style={{ width: 72, height: 72, borderRadius: 16, background: sourceColor[c.source], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28 }}>{c.name.charAt(0).toUpperCase()}</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: brand.text }}>{c.name}</div>
            <div style={{ color: brand.textFaint, fontSize: 14, marginTop: 2 }}>@{c.handle}{c.location ? ` · ${c.location}` : ''}{c.company ? ` · ${c.company}` : ''}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {chip(SOURCES.find((s) => s.meta.id === c.source)!.meta.label, sourceColor[c.source], '#fff')}
              <span style={{ fontWeight: 800, fontSize: 18, color: brand.primary }}>{c.matchScore}</span>
              <span style={{ fontSize: 11, color: brand.textFaint, fontWeight: 700 }}>MATCH</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {c.bio && (
          <div style={{ fontSize: 14, color: brand.textMid, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: brand.bgCreamWarm, borderRadius: 10, padding: '12px 14px' }}>
            {c.bio}
          </div>
        )}

        {/* Tags + Metrics */}
        {c.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.tags.map((t, i) => chip(t, brand.primaryLight, brand.primary, `${c.uid}-m${i}`))}
          </div>
        )}
        {c.metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 18, fontSize: 13, color: brand.textFaint, flexWrap: 'wrap' }}>
            {c.metrics.map((m) => <span key={m.label}><strong style={{ color: brand.text }}>{m.value}</strong> {m.label}</span>)}
          </div>
        )}

        {/* Contact */}
        <ContactRow c={c} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn href={c.url} variant="ghost" ariaLabel={`View ${c.name} profile`}>
            <Icon name="external" size={14} color={brand.primary} /> View profile
          </Btn>
          <Btn onClick={() => onToggle(c)} variant={saved ? 'accent' : 'primary'}>
            <Icon name={saved ? 'check' : 'bookmark'} size={14} color="#fff" /> {saved ? 'Saved' : 'Save to pipeline'}
          </Btn>
        </div>

        {/* Outreach generator */}
        <div style={{ borderTop: `1px solid ${brand.border}`, paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: brand.textMuted, letterSpacing: 0.5, marginBottom: 14 }}>OUTREACH GENERATOR</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <Field label="Your name">
              <input id="outreach-name" style={{ ...inputStyle, minWidth: 140 }} value={outreach.senderName} onChange={(e) => setOutreach({ ...outreach, senderName: e.target.value })} placeholder="Alex Chen" />
            </Field>
            <Field label="Role you're hiring for">
              <input id="outreach-role" style={{ ...inputStyle, minWidth: 180 }} value={outreach.role} onChange={(e) => setOutreach({ ...outreach, role: e.target.value })} placeholder="Senior React Engineer" />
            </Field>
            <Field label="Company">
              <input id="outreach-company" style={{ ...inputStyle, minWidth: 140 }} value={outreach.company} onChange={(e) => setOutreach({ ...outreach, company: e.target.value })} placeholder="Acme Inc" />
            </Field>
          </div>

          {/* Subject line */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: brand.textFaint, marginBottom: 4 }}>SUBJECT LINE</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 13, color: brand.text, background: brand.bgCreamWarm, padding: '8px 12px', borderRadius: 8, fontStyle: 'italic' }}>{subject}</div>
              <button
                onClick={() => copy(subject, setCopiedSubject)}
                style={{ background: copiedSubject ? brand.primaryLight : brand.bgAlt, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copiedSubject ? brand.primary : brand.textMuted, whiteSpace: 'nowrap' }}
              >
                {copiedSubject ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Message */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: brand.textFaint, marginBottom: 4 }}>MESSAGE</div>
            <div style={{ position: 'relative' }}>
              <pre style={{ background: brand.bgCreamWarm, borderRadius: 10, padding: '14px 16px', fontSize: 13, lineHeight: 1.65, color: brand.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: f, maxHeight: 220, overflowY: 'auto' }}>
                {msg}
              </pre>
            </div>
            <div style={{ marginTop: 10 }}>
              <Btn variant="accent" onClick={() => copy(msg, setCopiedMsg)}>
                <Icon name={copiedMsg ? 'check' : 'link'} size={14} color="#fff" /> {copiedMsg ? 'Copied!' : 'Copy message'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Live Sourcing ---------------- */

function Sourcing({
  pipeline,
  onToggle,
  onOpenModal,
  query,
  setQuery,
  active,
  setActive,
  results,
  setResults,
  outcomes,
  setOutcomes,
}: {
  pipeline: SavedCandidate[];
  onToggle: (c: Candidate) => void;
  onOpenModal: (c: Candidate) => void;
  query: SearchQuery;
  setQuery: (q: SearchQuery) => void;
  active: SourceId[];
  setActive: (s: SourceId[]) => void;
  results: Candidate[];
  setResults: (c: Candidate[]) => void;
  outcomes: SourceOutcome[];
  setOutcomes: (o: SourceOutcome[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'match' | 'name'>('match');
  const [sourceFilter, setSourceFilter] = useState<SourceId | 'all'>('all');
  const [emailOnly, setEmailOnly] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  async function run(reset: boolean) {
    if (active.length === 0) {
      setErr('Select at least one source.');
      return;
    }
    const nextPage = reset ? 1 : page + 1;
    setLoading(true);
    setErr('');
    try {
      const { candidates, outcomes: oc } = await searchSources(active, { ...query, page: nextPage });
      setOutcomes(oc);
      if (reset) {
        setResults(candidates);
        setPage(1);
      } else {
        const byUid = new Map(results.map((c) => [c.uid, c]));
        for (const c of candidates) if (!byUid.has(c.uid)) byUid.set(c.uid, c);
        setResults([...byUid.values()].sort((a, b) => b.matchScore - a.matchScore));
        setPage(nextPage);
      }
      if (candidates.length === 0 && oc.every((o) => o.ok)) setErr('No matches. Loosen filters or try other sources.');
    } catch (e: any) {
      setErr(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  const toggleSource = (id: SourceId) =>
    setActive(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);

  const view = useMemo(() => {
    let v = results;
    if (sourceFilter !== 'all') v = v.filter((c) => c.source === sourceFilter);
    if (emailOnly) v = v.filter((c) => c.contact.email);
    v = [...v].sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : b.matchScore - a.matchScore));
    return v;
  }, [results, sourceFilter, emailOnly, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card} className="sco-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <SectionLabel>Choose your sources</SectionLabel>
          <span style={{ fontSize: 12, color: brand.textFaint }}>Tap to toggle · pick one or many</span>
        </div>

        {SOURCE_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: gi === SOURCE_GROUPS.length - 1 ? 18 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: brand.text }}>{group.label}</span>
              <span style={{ fontSize: 12, color: brand.textFaint }}>{group.note}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {group.ids.map((id) => {
                const s = SOURCES.find((x) => x.meta.id === id)!;
                const on = active.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleSource(id)}
                    aria-pressed={on}
                    title={s.meta.blurb}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 13px',
                      borderRadius: 999,
                      border: `1.5px solid ${on ? sourceColor[id] : brand.border}`,
                      background: on ? sourceColor[id] : brand.surface,
                      color: on ? '#fff' : brand.textMuted,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: f,
                      minHeight: 40,
                      boxShadow: on ? '0 2px 8px rgba(28,51,41,0.18)' : 'none',
                      transition: 'background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {on && <Icon name="check" size={14} color="#fff" />}
                    {s.meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ fontSize: 12.5, color: brand.textMid, background: brand.bgCreamWarm, border: `1px solid ${brand.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 18, lineHeight: 1.5 }}>
          <strong style={{ color: brand.text }}>Hiring a non-technical role?</strong> Use <strong>Reddit</strong> for live "available for hire" posts across design, marketing, writing and ops, then open the <strong>X-Ray Builder</strong> tab to reach LinkedIn profiles for any role.
        </div>

        {/* Saved searches */}
        {savedSearches.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: brand.textFaint, alignSelf: 'center', marginRight: 4 }}>SAVED:</span>
            {savedSearches.map((ss) => (
              <div key={ss.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button
                  onClick={() => {
                    setQuery(ss.query as unknown as SearchQuery);
                    setActive(ss.sources as SourceId[]);
                  }}
                  style={{ background: brand.primaryLight, color: brand.primary, border: 'none', borderRadius: '999px 0 0 999px', padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f }}
                >
                  {ss.name}
                </button>
                <button
                  onClick={() => setSavedSearches(deleteSavedSearch(ss.id))}
                  aria-label={`Delete ${ss.name}`}
                  style={{ background: brand.primaryLight, color: brand.primary, border: 'none', borderRadius: '0 999px 999px 0', padding: '5px 8px', fontSize: 12, cursor: 'pointer', fontFamily: f, borderLeft: `1px solid ${brand.border}` }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <Field label="Keywords / skills">
            <input id="keywords-/-skills" style={inputStyle} value={query.keywords} onChange={(e) => setQuery({ ...query, keywords: e.target.value })} placeholder="react, ml, rust" />
          </Field>
          <Field label="Location">
            <input id="location" style={inputStyle} value={query.location} onChange={(e) => setQuery({ ...query, location: e.target.value })} placeholder="Berlin" />
          </Field>
          <Field label="Technology / tag">
            <input id="technology-/-tag" style={inputStyle} value={query.tech} onChange={(e) => setQuery({ ...query, tech: e.target.value })} placeholder="TypeScript" />
          </Field>
          <Field label="GitHub org / company">
            <input id="github-org" style={inputStyle} value={query.orgName} onChange={(e) => setQuery({ ...query, orgName: e.target.value })} placeholder="stripe" title="Search employees of a specific GitHub org" />
          </Field>
          <Field label="Min signal">
            <input id="min-signal" style={inputStyle} type="number" value={query.minSignal} onChange={(e) => setQuery({ ...query, minSignal: +e.target.value })} title="Min followers (GitHub) — ignored by sources without a follower metric" />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={() => run(true)} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="search" color="#fff" />}
            {loading ? 'Sourcing live…' : 'Source candidates'}
          </Btn>
          {!saveDialog && (
            <Btn variant="ghost" onClick={() => { setSaveName(''); setSaveDialog(true); }} disabled={loading}>
              <Icon name="bookmark" size={14} color={brand.primary} /> Save search
            </Btn>
          )}
          {saveDialog && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                style={{ ...inputStyle, minWidth: 160, padding: '8px 12px' }}
                placeholder="Search name…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveName.trim()) {
                    setSavedSearches(saveSearch(saveName.trim(), query as unknown as Record<string, unknown>, active));
                    setSaveDialog(false);
                  }
                  if (e.key === 'Escape') setSaveDialog(false);
                }}
              />
              <Btn
                variant="primary"
                onClick={() => {
                  if (saveName.trim()) {
                    setSavedSearches(saveSearch(saveName.trim(), query as unknown as Record<string, unknown>, active));
                    setSaveDialog(false);
                  }
                }}
                disabled={!saveName.trim()}
              >
                Save
              </Btn>
              <Btn variant="ghost" onClick={() => setSaveDialog(false)}>Cancel</Btn>
            </div>
          )}
          {results.length > 0 && <span style={{ color: brand.textFaint, fontSize: 13 }}>{view.length} shown · {results.length} sourced</span>}
        </div>

        {outcomes.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {outcomes.map((o) => (
              <span
                key={o.id}
                title={o.error || `${o.total} matches`}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: o.ok ? brand.primaryLight : brand.accentLight,
                  color: o.ok ? brand.primary : brand.accentDark,
                }}
              >
                {SOURCES.find((s) => s.meta.id === o.id)?.meta.label}: {o.ok ? `${o.total || '—'}` : 'unavailable'}
              </span>
            ))}
          </div>
        )}

        {err && <div role="alert" style={{ marginTop: 12, color: brand.accentDark, fontSize: 13, fontWeight: 600 }}>{err}</div>}
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Field label="Sort by">
            <select id="sort-by" style={inputStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="match">Match score</option>
              <option value="name">Name</option>
            </select>
          </Field>
          <Field label="Source">
            <select id="source" style={inputStyle} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)}>
              <option value="all">All sources</option>
              {SOURCES.map((s) => (
                <option key={s.meta.id} value={s.meta.id}>{s.meta.label}</option>
              ))}
            </select>
          </Field>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: brand.textMid, alignSelf: 'flex-end', minHeight: 44 }}>
            <input type="checkbox" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} />
            Has contact email
          </label>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {view.map((p) => (
          <CandidateCard key={p.uid} c={p} saved={isSaved(pipeline, p.uid)} onToggle={onToggle} onOpenModal={onOpenModal} />
        ))}
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Btn variant="ghost" onClick={() => run(false)} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </Btn>
        </div>
      )}

      {!loading && results.length === 0 && !err && (
        <div className="sco-card" style={{ ...card, textAlign: 'center', padding: '44px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: brand.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search" size={24} color={brand.primary} />
          </div>
          <div style={{ fontFamily: serif, fontSize: 22, color: brand.text }}>Ready when you are</div>
          <div style={{ fontSize: 14, color: brand.textFaint, maxWidth: '46ch', lineHeight: 1.55 }}>
            Pick your sources above, add a keyword or skill, and hit <strong style={{ color: brand.textMid }}>Source candidates</strong> to pull real, live profiles.
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({ c }: { c: Candidate }) {
  const items: { icon: string; href: string; label: string }[] = [];
  if (c.contact.email) items.push({ icon: 'mail', href: `mailto:${c.contact.email}`, label: c.contact.email });
  if (c.contact.blog) items.push({ icon: 'link', href: c.contact.blog.startsWith('http') ? c.contact.blog : `https://${c.contact.blog}`, label: 'Website' });
  if (c.contact.twitter) items.push({ icon: 'external', href: c.contact.twitter, label: 'X / Twitter' });
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {items.map((it) => (
        <a key={it.href} href={it.href} target="_blank" rel="noreferrer" className="sco-link-underline" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: brand.accentDark, fontWeight: 600, textDecoration: 'none', maxWidth: '100%' }}>
          <Icon name={it.icon} size={13} color={brand.accentDark} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
        </a>
      ))}
    </div>
  );
}

function CandidateCard({ c, saved, onToggle, onOpenModal }: { c: Candidate; saved: boolean; onToggle: (c: Candidate) => void; onOpenModal: (c: Candidate) => void }) {
  return (
    <div className="sco-card sco-card-hover sco-rise" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {c.avatar ? (
          <img src={c.avatar} alt="" width={52} height={52} loading="lazy" style={{ borderRadius: 12, border: `1px solid ${brand.border}` }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 12, background: sourceColor[c.source], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
            {c.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: brand.text, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
          <div style={{ color: brand.textFaint, fontSize: 13 }}>@{c.handle}{c.location ? ` · ${c.location}` : ''}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: brand.primary }}>{c.matchScore}</div>
          <div style={{ fontSize: 10, color: brand.textFaint, fontWeight: 700 }}>MATCH</div>
        </div>
      </div>

      <div>{chip(SOURCES.find((s) => s.meta.id === c.source)!.meta.label, sourceColor[c.source], '#fff')}</div>

      {c.bio && <div style={{ fontSize: 13, color: brand.textMid, lineHeight: 1.45 }}>{c.bio}</div>}

      {c.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.tags.map((t, i) => chip(t, brand.primaryLight, brand.primary, `${c.uid}-${i}`))}
        </div>
      )}

      {c.metrics.length > 0 && (
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: brand.textFaint, flexWrap: 'wrap' }}>
          {c.metrics.map((m) => (
            <span key={m.label}>{m.value} {m.label}</span>
          ))}
        </div>
      )}

      <ContactRow c={c} />

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
        <Btn onClick={() => onOpenModal(c)} variant="ghost" ariaLabel={`Expand ${c.name}`}>
          <Icon name="external" size={14} color={brand.primary} /> Expand
        </Btn>
        <Btn onClick={() => onToggle(c)} variant={saved ? 'accent' : 'primary'} ariaLabel={saved ? `Remove ${c.name}` : `Save ${c.name}`}>
          <Icon name={saved ? 'check' : 'bookmark'} size={14} color="#fff" /> {saved ? 'Saved' : 'Save'}
        </Btn>
      </div>
    </div>
  );
}

/* ---------------- X-Ray Builder ---------------- */

function XRay() {
  const [titlesRaw, setTitlesRaw] = useState('Software Engineer, Backend Developer');
  const [skillsRaw, setSkillsRaw] = useState('Python, Kubernetes');
  const [location, setLocation] = useState('London');
  const [excludeRecruiters, setExclude] = useState(true);
  const [copied, setCopied] = useState(false);

  const input: XRayInput = useMemo(
    () => ({
      titles: titlesRaw.split(',').map((s) => s.trim()).filter(Boolean),
      skills: skillsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      location,
      excludeRecruiters,
    }),
    [titlesRaw, skillsRaw, location, excludeRecruiters],
  );

  const boolean = buildBoolean(input);
  const links = buildDeepLinks(input);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card} className="sco-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Titles (comma-separated)">
            <input id="titles-(comma-separated)" style={inputStyle} value={titlesRaw} onChange={(e) => setTitlesRaw(e.target.value)} />
          </Field>
          <Field label="Must-have skills">
            <input id="must-have-skills" style={inputStyle} value={skillsRaw} onChange={(e) => setSkillsRaw(e.target.value)} />
          </Field>
          <Field label="Location">
            <input id="location-xray" style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 14, color: brand.textMid }}>
          <input type="checkbox" checked={excludeRecruiters} onChange={(e) => setExclude(e.target.checked)} />
          Exclude recruiters / sourcers
        </label>
      </div>

      <div style={card} className="sco-card">
        <div style={{ marginBottom: 8 }}><SectionLabel>Boolean string</SectionLabel></div>
        <div style={{ background: brand.primary, color: brand.primaryLight, padding: 14, borderRadius: 10, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {boolean}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn
            variant="accent"
            onClick={() => {
              navigator.clipboard.writeText(boolean);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Icon name={copied ? 'check' : 'link'} size={14} color="#fff" /> {copied ? 'Copied' : 'Copy string'}
          </Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {links.map((l) => (
          <div key={l.label} className="sco-card sco-card-hover" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800, color: brand.text, fontSize: 15 }}>{l.label}</div>
            <div style={{ fontSize: 13, color: brand.textFaint, flex: 1 }}>{l.note}</div>
            <Btn href={l.url} variant="primary">
              <Icon name="external" size={14} color="#fff" /> Run search
            </Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Channel ROI ---------------- */

function Channels() {
  const [family, setFamily] = useState<RoleFamily>('engineering');
  const [seniority, setSeniority] = useState<Seniority>('senior');
  const [freeOnly, setFreeOnly] = useState(false);
  const [pri, setPri] = useState({ quality: 70, speed: 40, cost: 60, reach: 50 });

  const ranked = rankChannels(family, seniority, pri, freeOnly);

  const slider = (key: keyof typeof pri, label: string) => (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: brand.textMuted, marginBottom: 4 }}>
        <span>{label.toUpperCase()}</span>
        <span style={{ color: brand.accent }}>{pri[key]}</span>
      </div>
      <input type="range" min={0} max={100} value={pri[key]} onChange={(e) => setPri({ ...pri, [key]: +e.target.value })} style={{ width: '100%', accentColor: brand.primary }} aria-label={label} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card} className="sco-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <Field label="Role family">
            <select id="role-family" style={inputStyle} value={family} onChange={(e) => setFamily(e.target.value as RoleFamily)}>
              {ROLE_FAMILIES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Seniority">
            <select id="seniority" style={inputStyle} value={seniority} onChange={(e) => setSeniority(e.target.value as Seniority)}>
              {SENIORITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {slider('quality', 'Quality')}
          {slider('speed', 'Speed')}
          {slider('cost', 'Cost sensitivity')}
          {slider('reach', 'Reach')}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 14, color: brand.textMid }}>
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
          Free channels only
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ranked.map((c, i) => (
          <div key={c.id} className="sco-card sco-card-hover" style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: brand.textFaint, width: 28 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: brand.text, fontSize: 16 }}>{c.name}</span>
                {c.free && chip('FREE', brand.primaryLight, brand.primary)}
              </div>
              <div style={{ fontSize: 13, color: brand.textFaint, marginTop: 3 }}>{c.notes}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: brand.textMuted }}>
                <span>Quality {c.quality}</span>
                <span>Speed {c.speed}</span>
                <span>Reach {c.reach}</span>
                <span>ROI {c.roi}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: brand.primary }}>{c.fitScore}</div>
              <div style={{ fontSize: 10, color: brand.textFaint, fontWeight: 700 }}>FIT SCORE</div>
              <div style={{ height: 6, background: brand.bgAlt, borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ width: `${c.fitScore}%`, height: '100%', background: brand.accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Pipeline ---------------- */

function Pipeline({
  list,
  onToggle,
  onUpdate,
}: {
  list: SavedCandidate[];
  onToggle: (c: Candidate) => void;
  onUpdate: (uid: string, patch: Partial<SavedCandidate>) => void;
}) {
  if (list.length === 0)
    return (
      <div className="sco-card" style={{ ...card, textAlign: 'center', padding: '44px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: brand.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={22} color={brand.primary} />
        </div>
        <div style={{ fontFamily: serif, fontSize: 22, color: brand.text }}>Your pipeline is empty</div>
        <div style={{ fontSize: 14, color: brand.textFaint, maxWidth: '46ch', lineHeight: 1.55 }}>
          Head to <strong style={{ color: brand.textMid }}>Live Sourcing</strong>, find some candidates, and hit Save. They will show up here, sorted by stage.
        </div>
      </div>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ color: brand.textMuted, fontWeight: 700 }}>{list.length} candidates saved</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => exportJson(list)}>
            <Icon name="download" size={14} color={brand.primary} /> JSON
          </Btn>
          <Btn variant="accent" onClick={() => exportCsv(list)}>
            <Icon name="download" size={14} color="#fff" /> CSV
          </Btn>
        </div>
      </div>

      {STAGES.map((stage) => {
        const inStage = list.filter((p) => p.stage === stage.id);
        if (inStage.length === 0) return null;
        return (
          <div key={stage.id}>
            <div style={{ fontSize: 12, fontWeight: 800, color: brand.textMuted, letterSpacing: 0.4, margin: '6px 0 10px' }}>
              {stage.label.toUpperCase()} · {inStage.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inStage.map((p) => (
                <div key={p.uid} className="sco-card sco-card-hover" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', rowGap: 10 }}>
                    {p.avatar ? (
                      <img src={p.avatar} alt="" width={44} height={44} loading="lazy" style={{ borderRadius: 10, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: sourceColor[p.source], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{p.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 800, color: brand.text }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: brand.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>@{p.handle} · {SOURCES.find((s) => s.meta.id === p.source)?.meta.label}{p.contact.email ? ` · ${p.contact.email}` : ''}</div>
                    </div>
                    <select
                      value={p.stage}
                      onChange={(e) => onUpdate(p.uid, { stage: e.target.value as Stage })}
                      aria-label={`Stage for ${p.name}`}
                      style={{ ...inputStyle, minWidth: 130, minHeight: 40, padding: '8px 10px' }}
                    >
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <Btn href={p.url} variant="ghost" ariaLabel={`View ${p.name}`}>
                      <Icon name="external" size={14} color={brand.primary} />
                    </Btn>
                    <Btn onClick={() => onToggle(p)} variant="accent" ariaLabel={`Remove ${p.name}`}>
                      <Icon name="x" size={14} color="#fff" />
                    </Btn>
                  </div>
                  <textarea
                    value={p.note}
                    onChange={(e) => onUpdate(p.uid, { note: e.target.value })}
                    placeholder="Notes — outreach status, fit, next step…"
                    aria-label={`Notes for ${p.name}`}
                    rows={2}
                    style={{ ...inputStyle, minHeight: 0, resize: 'vertical', lineHeight: 1.4 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const [tab, setTab] = useState<Tab>('sourcing');
  const [pipeline, setPipeline] = useState<SavedCandidate[]>([]);

  // Lifted sourcing state so results survive tab switches.
  const [query, setQuery] = useState<SearchQuery>({ keywords: 'react', location: '', tech: 'TypeScript', orgName: '', minSignal: 20, page: 1 });
  const [active, setActive] = useState<SourceId[]>(['github', 'stackoverflow']);
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [outreach, setOutreach] = useState<OutreachSettings>({ senderName: '', role: '', company: '' });
  const onOpenModal = useCallback((c: Candidate) => setModalCandidate(c), []);
  const [results, setResults] = useState<Candidate[]>([]);
  const [outcomes, setOutcomes] = useState<SourceOutcome[]>([]);

  useEffect(() => setPipeline(loadPipeline()), []);
  const onToggle = (c: Candidate) => setPipeline((cur) => toggleSave(cur, c));
  const onUpdate = (uid: string, patch: Partial<SavedCandidate>) => setPipeline((cur) => updateSaved(cur, uid, patch));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'sourcing', label: 'Live Sourcing' },
    { id: 'xray', label: 'X-Ray Builder' },
    { id: 'channels', label: 'Channel ROI' },
    { id: 'pipeline', label: `Pipeline${pipeline.length ? ` (${pipeline.length})` : ''}` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: brand.bg, fontFamily: f, color: brand.text }}>
      {modalCandidate && (
        <CandidateModal
          c={modalCandidate}
          saved={isSaved(pipeline, modalCandidate.uid)}
          onToggle={onToggle}
          onClose={() => setModalCandidate(null)}
          outreach={outreach}
          setOutreach={setOutreach}
        />
      )}
      <header
        style={{
          color: '#fff',
          padding: '44px 24px 40px',
          borderBottom: `4px solid ${brand.accent}`,
          background: `radial-gradient(120% 140% at 0% 0%, ${brand.primaryMid} 0%, ${brand.primary} 55%, #14261E 100%)`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel color={brand.accentLight}>Talent sourcing toolkit</SectionLabel>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.02, margin: '10px 0 0', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Sourcing Channel Optimizer
          </h1>
          <p style={{ color: brand.primaryLight, fontSize: 16, lineHeight: 1.55, marginTop: 14, maxWidth: '60ch' }}>
            Find candidates for any role, technical or not. Pull live profiles, build search strings, compare channels, and track your shortlist. Completely free, no logins or API keys.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            {['Live sourcing', 'Outreach generator', 'X-Ray builder', 'Channel ROI', 'Saved pipeline'].map((p) => (
              <span
                key={p}
                style={{
                  fontFamily: mono,
                  fontSize: 11.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: brand.primaryLight,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 999,
                  padding: '5px 11px',
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </header>

      <nav style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}`, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 rgba(24,18,14,0.02)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 4, padding: '0 24px', overflowX: 'auto' }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={on ? 'page' : undefined}
                className={on ? undefined : 'sco-tab'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: on ? `3px solid ${brand.accent}` : '3px solid transparent',
                  color: on ? brand.primary : brand.textFaint,
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '16px 14px',
                  cursor: 'pointer',
                  fontFamily: f,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.18s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main key={tab} style={{ maxWidth: 1100, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TabIntro title={tabs.find((t) => t.id === tab)!.label} guide={TAB_GUIDE[tab]} />
        {tab === 'sourcing' && (
          <Sourcing
            pipeline={pipeline}
            onToggle={onToggle}
            onOpenModal={onOpenModal}
            query={query}
            setQuery={setQuery}
            active={active}
            setActive={setActive}
            results={results}
            setResults={setResults}
            outcomes={outcomes}
            setOutcomes={setOutcomes}
          />
        )}
        {tab === 'xray' && <XRay />}
        {tab === 'channels' && <Channels />}
        {tab === 'pipeline' && <Pipeline list={pipeline} onToggle={onToggle} onUpdate={onUpdate} />}
      </main>

      <footer style={{ textAlign: 'center', padding: '28px 24px 36px', color: brand.textFaint, fontSize: 12, lineHeight: 1.6 }}>
        Free sources: GitHub · Stack Overflow · Hacker News · Dev.to · Reddit · Google X-Ray. Saved locally in your browser — no keys, no backend.
      </footer>
    </div>
  );
}
