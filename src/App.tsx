import { useEffect, useMemo, useState } from 'react';
import { brand } from './theme';
import { searchSources, SOURCES, type SourceOutcome } from './lib/sources';
import type { Candidate, SearchQuery, SourceId } from './lib/types';
import { buildBoolean, buildDeepLinks, type XRayInput } from './lib/xray';
import { rankChannels, ROLE_FAMILIES, SENIORITIES, type RoleFamily, type Seniority } from './lib/channels';
import {
  exportCsv,
  exportJson,
  isSaved,
  loadPipeline,
  STAGES,
  toggleSave,
  updateSaved,
  type SavedCandidate,
  type Stage,
} from './lib/storage';

type Tab = 'sourcing' | 'xray' | 'channels' | 'pipeline';

const f = "'Inter', system-ui, -apple-system, sans-serif";

const card: React.CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: 14,
  padding: 20,
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
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" style={s} aria-label={ariaLabel}>
        {children}
      </a>
    );
  return (
    <button onClick={onClick} disabled={disabled} style={s} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

const sourceColor: Record<SourceId, string> = {
  github: '#1C3329',
  stackoverflow: '#C5533A',
  hackernews: '#2E5243',
  devto: '#4A3F35',
};

/* ---------------- Live Sourcing ---------------- */

function Sourcing({
  pipeline,
  onToggle,
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
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: brand.textMuted, marginBottom: 10 }}>SOURCES</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {SOURCES.map((s) => {
            const on = active.includes(s.meta.id);
            return (
              <button
                key={s.meta.id}
                onClick={() => toggleSource(s.meta.id)}
                aria-pressed={on}
                title={s.meta.blurb}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1.5px solid ${on ? sourceColor[s.meta.id] : brand.border}`,
                  background: on ? sourceColor[s.meta.id] : 'transparent',
                  color: on ? '#fff' : brand.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: f,
                  minHeight: 40,
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
              >
                {on && <Icon name="check" size={14} color="#fff" />}
                {s.meta.label}
              </button>
            );
          })}
        </div>

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
          <Field label="Min signal">
            <input id="min-signal" style={inputStyle} type="number" value={query.minSignal} onChange={(e) => setQuery({ ...query, minSignal: +e.target.value })} title="Min followers (GitHub) — ignored by sources without a follower metric" />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={() => run(true)} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="search" color="#fff" />}
            {loading ? 'Sourcing live…' : 'Source candidates'}
          </Btn>
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
          <CandidateCard key={p.uid} c={p} saved={isSaved(pipeline, p.uid)} onToggle={onToggle} />
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
        <div style={{ ...card, textAlign: 'center', color: brand.textFaint }}>
          Pick sources, enter criteria, and pull real live candidates — free, no login, no keys.
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
        <a key={it.href} href={it.href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: brand.accentDark, fontWeight: 600, textDecoration: 'none', maxWidth: '100%' }}>
          <Icon name={it.icon} size={13} color={brand.accentDark} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
        </a>
      ))}
    </div>
  );
}

function CandidateCard({ c, saved, onToggle }: { c: Candidate; saved: boolean; onToggle: (c: Candidate) => void }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <Btn href={c.url} variant="ghost" ariaLabel={`View ${c.name} profile`}>
          <Icon name="external" size={14} color={brand.primary} /> Profile
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
      <div style={card}>
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

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: brand.textMuted, marginBottom: 8 }}>BOOLEAN STRING</div>
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
          <div key={l.label} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      <div style={card}>
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
          <div key={c.id} style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
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
      <div style={{ ...card, textAlign: 'center', color: brand.textFaint }}>
        No saved candidates yet. Save profiles from the Live Sourcing tab.
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
                <div key={p.uid} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
  const [query, setQuery] = useState<SearchQuery>({ keywords: 'react', location: '', tech: 'TypeScript', minSignal: 20, page: 1 });
  const [active, setActive] = useState<SourceId[]>(['github', 'stackoverflow']);
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
      <header style={{ background: brand.primary, color: '#fff', padding: '28px 24px', borderBottom: `4px solid ${brand.accent}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Sourcing Channel Optimizer</div>
          <div style={{ color: brand.primaryLight, fontSize: 14, marginTop: 4 }}>
            4 live talent sources · contact enrichment · X-ray builder · channel ROI — 100% free, real data, no keys.
          </div>
        </div>
      </header>

      <nav style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 4, padding: '0 24px', overflowX: 'auto' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? `3px solid ${brand.accent}` : '3px solid transparent',
                color: tab === t.id ? brand.primary : brand.textFaint,
                fontWeight: 700,
                fontSize: 14,
                padding: '16px 14px',
                cursor: 'pointer',
                fontFamily: f,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {tab === 'sourcing' && (
          <Sourcing
            pipeline={pipeline}
            onToggle={onToggle}
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

      <footer style={{ textAlign: 'center', padding: 24, color: brand.textFaint, fontSize: 12 }}>
        Free sources: GitHub · Stack Overflow · Hacker News · Dev.to · Google X-ray · localStorage. No keys, no backend.
      </footer>
    </div>
  );
}
