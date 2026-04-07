import { Candidate } from '../data/candidateSearch';

interface Props {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
}

export default function CandidateResults({ candidates, loading, error }: Props) {
  return (
    <section className="border border-ink bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-6 py-3">
        <span className="label-ink">§ 03 — Initial Candidate Pool</span>
        <span className="label">
          {loading ? 'Scraping…' : error ? 'Error' : `${candidates.length} matched`}
        </span>
      </div>

      <div className="px-6 py-5">
        <h3 className="font-display text-2xl tracking-tight mb-1">
          Top candidates from the open web
        </h3>
        <p className="text-sm text-muted">
          Live scrape via Brave Search. Match scores reflect role-title and skill keyword overlap. No login required.
        </p>
      </div>

      {loading && (
        <div className="border-t border-ink px-6 py-12 text-center">
          <div className="inline-flex items-center gap-3 label-ink">
            <span className="inline-block w-2 h-2 bg-ink animate-pulse" />
            Searching the open web for matches…
          </div>
        </div>
      )}

      {error && (
        <div className="border-t border-ink px-6 py-8">
          <p className="font-mono text-xs text-accent uppercase tracking-widest mb-1">Search blocked</p>
          <p className="text-sm text-muted">{error}</p>
          <p className="text-sm text-muted mt-2">
            Use the x-ray strings below to search manually — they will work in any browser.
          </p>
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="border-t border-ink px-6 py-12 text-center">
          <p className="label">No candidates found. Try broadening your skills or removing location.</p>
        </div>
      )}

      {!loading && candidates.length > 0 && (
        <ul className="divide-y divide-ink/20 border-t border-ink">
          {candidates.map((c, i) => (
            <li key={c.url} className="px-6 py-4 hover:bg-soft/50 transition-colors group">
              <div className="flex items-start gap-5">
                <span className="font-mono text-xs text-muted pt-1 w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-xl text-ink hover:text-accent transition-colors"
                    >
                      {c.name}
                    </a>
                    <div className="flex items-center gap-3">
                      <span className="label">{c.source}</span>
                      <span className={`font-mono text-xs px-2 py-0.5 border ${
                        c.matchScore >= 70 ? 'border-accent text-accent' : 'border-ink/40 text-muted'
                      }`}>
                        {c.matchScore}% match
                      </span>
                    </div>
                  </div>
                  {c.headline && (
                    <p className="text-sm text-ink/80 mt-1 leading-snug">{c.headline}</p>
                  )}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-muted hover:text-accent uppercase tracking-widest mt-2 inline-block"
                  >
                    Open profile →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
