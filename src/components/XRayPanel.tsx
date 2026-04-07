import { useState } from 'react';
import { XRaySearch, buildGoogleUrl } from '../data/xray';

interface Props {
  searches: XRaySearch[];
}

function XRayRow({ search }: { search: XRaySearch }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(search.query);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = search.query;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="border-b border-ink/20 last:border-b-0 px-6 py-5">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
        <div>
          <h4 className="font-display text-lg text-ink leading-tight">{search.platform}</h4>
          <p className="label mt-1">{search.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="btn-ghost py-1.5 px-3">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <a
            href={buildGoogleUrl(search.query)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-widest bg-ink text-paper px-3 py-1.5 hover:bg-accent transition-colors"
          >
            Run →
          </a>
        </div>
      </div>
      <pre className="font-mono text-xs text-ink/80 leading-relaxed whitespace-pre-wrap break-all bg-soft/60 p-3 border-l-2 border-ink">
        {search.query}
      </pre>
    </div>
  );
}

export default function XRayPanel({ searches }: Props) {
  return (
    <section className="border border-ink bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-6 py-3">
        <span className="label-ink">§ 04 — X-Ray Search Strings</span>
        <span className="label">{searches.length} platforms</span>
      </div>

      <div className="px-6 py-5">
        <h3 className="font-display text-2xl tracking-tight">Free Boolean queries — ready to run</h3>
        <p className="text-sm text-muted mt-1">
          Use <span className="font-mono">Run</span> to fire the search instantly, or copy and customize before searching.
        </p>
      </div>

      <div className="border-t border-ink">
        {searches.map(s => <XRayRow key={s.platform} search={s} />)}
      </div>
    </section>
  );
}
