import { ALL_CATEGORIES, ALL_SENIORITIES, INDUSTRIES, RoleCategory, Seniority } from '../data/benchmarks';

interface Props {
  roleTitle: string;
  category: RoleCategory | null;
  seniority: Seniority | null;
  industry: string;
  skills: string;
  location: string;
  loading: boolean;
  onRoleTitle: (v: string) => void;
  onCategory: (v: RoleCategory | null) => void;
  onSeniority: (v: Seniority | null) => void;
  onIndustry: (v: string) => void;
  onSkills: (v: string) => void;
  onLocation: (v: string) => void;
  onAnalyze: () => void;
}

export default function RoleInput(p: Props) {
  return (
    <section className="border border-ink bg-paper">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-ink px-6 py-3">
        <span className="label-ink">§ 01 — Role Brief</span>
        <span className="label">All filters optional except role title</span>
      </div>

      {/* Role title — hero input */}
      <div className="px-6 pt-8 pb-6">
        <label className="label block mb-2">Role Title *</label>
        <input
          type="text"
          value={p.roleTitle}
          onChange={e => p.onRoleTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && p.onAnalyze()}
          placeholder="Senior Data Engineer"
          className="w-full bg-transparent border-0 border-b border-ink py-2 text-3xl font-display tracking-tight text-ink placeholder:text-muted/60 placeholder:font-display focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Category */}
      <div className="border-t border-ink px-6 py-5">
        <div className="flex items-baseline justify-between mb-3">
          <label className="label">Function</label>
          {p.category && (
            <button onClick={() => p.onCategory(null)} className="label hover:text-accent transition-colors">
              ✕ Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => p.onCategory(p.category === c.value ? null : c.value)}
              className={`chip ${p.category === c.value ? 'chip-active' : 'chip-inactive'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seniority */}
      <div className="border-t border-ink px-6 py-5">
        <div className="flex items-baseline justify-between mb-3">
          <label className="label">Seniority</label>
          {p.seniority && (
            <button onClick={() => p.onSeniority(null)} className="label hover:text-accent transition-colors">
              ✕ Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_SENIORITIES.map(s => (
            <button
              key={s.value}
              onClick={() => p.onSeniority(p.seniority === s.value ? null : s.value)}
              className={`chip ${p.seniority === s.value ? 'chip-active' : 'chip-inactive'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skills + Industry + Location grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-ink">
        <div className="border-b md:border-b-0 md:border-r border-ink px-6 py-5">
          <label className="label block mb-2">Must-Have Skills</label>
          <textarea
            value={p.skills}
            onChange={e => p.onSkills(e.target.value)}
            placeholder="Python, Snowflake, dbt, Airflow"
            rows={2}
            className="w-full bg-transparent border-0 border-b border-ink/40 py-2 text-base resize-none placeholder:text-muted focus:outline-none focus:border-ink transition-colors font-mono text-sm"
          />
          <p className="label mt-2">Comma-separated. Drives x-ray strings + match scores.</p>
        </div>

        <div className="grid grid-rows-2">
          <div className="border-b border-ink px-6 py-5">
            <label className="label block mb-2">Industry</label>
            <select
              value={p.industry}
              onChange={e => p.onIndustry(e.target.value)}
              className="field-input font-mono text-sm bg-paper"
            >
              <option value="">— Any —</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="px-6 py-5">
            <label className="label block mb-2">Location / Market</label>
            <input
              type="text"
              value={p.location}
              onChange={e => p.onLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && p.onAnalyze()}
              placeholder="Chicago, IL"
              className="field-input font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-ink">
        <button
          onClick={p.onAnalyze}
          disabled={!p.roleTitle.trim() || p.loading}
          className="w-full font-mono text-xs uppercase tracking-widest bg-ink text-paper py-5 hover:bg-accent disabled:bg-soft disabled:text-muted disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
        >
          {p.loading ? (
            <>
              <span className="inline-block w-2 h-2 bg-paper animate-pulse" />
              Sourcing candidates…
            </>
          ) : (
            <>
              Run Analysis <span className="text-accent">→</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
