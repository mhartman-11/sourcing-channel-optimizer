import { RankedChannel } from '../data/benchmarks';

interface Props {
  roleTitle: string;
  category: string;
  seniority: string;
  channels: RankedChannel[];
  onPrint: () => void;
}

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

export default function ResultsSummary({ roleTitle, category, seniority, channels, onPrint }: Props) {
  const top = channels[0];
  const lowestCph = Math.min(...channels.map(c => c.cphMin));
  const highestYield = Math.max(...channels.map(c => c.yieldRateMax));
  const fastestTtf = Math.min(...channels.map(c => c.timeToFill));
  const meta = [category, seniority].filter(Boolean).join(' · ');

  return (
    <section className="border border-ink bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-6 py-3">
        <span className="label-ink">§ 02 — Sourcing Strategy</span>
        <button onClick={onPrint} className="no-print label hover:text-accent transition-colors">
          ⎙ Export PDF
        </button>
      </div>

      <div className="px-6 pt-8 pb-6">
        <p className="label mb-2">Brief</p>
        <h2 className="font-display text-5xl md:text-6xl tracking-tight leading-[0.95] text-ink">
          {roleTitle}
        </h2>
        {meta && <p className="font-mono text-xs text-muted uppercase tracking-widest mt-3">{meta}</p>}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-ink">
        <Stat label="Top Channel" value={top.name} sub={`${top.yieldRateMin}–${top.yieldRateMax}% yield`} accent />
        <Stat label="Lowest CPH" value={fmt(lowestCph)} sub="floor across mix" />
        <Stat label="Best Yield" value={`${highestYield}%`} sub="ceiling across mix" />
        <Stat label="Fastest TTF" value={`${fastestTtf}d`} sub="time to fill" />
      </div>
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="border-r last:border-r-0 border-ink px-5 py-5">
      <p className="label mb-3">{label}</p>
      <p className={`font-display text-2xl tracking-tight leading-tight ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </p>
      <p className="label mt-2">{sub}</p>
    </div>
  );
}
