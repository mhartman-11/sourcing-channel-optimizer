import { RankedChannel, EffortLevel } from '../data/benchmarks';

interface Props {
  channel: RankedChannel;
  rank: number;
}

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

const EFFORT_TONE: Record<EffortLevel, string> = {
  Low: 'text-ink',
  Medium: 'text-muted',
  High: 'text-accent',
};

export default function ChannelCard({ channel: ch, rank }: Props) {
  // Yield bar width — normalized vs theoretical max of 45
  const avgYield = (ch.yieldRateMin + ch.yieldRateMax) / 2;
  const yieldPct = Math.min(Math.round((avgYield / 45) * 100), 100);

  return (
    <article className="border-b border-ink/20 last:border-b-0 px-6 py-5 hover:bg-soft/40 transition-colors group">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Rank */}
        <div className="col-span-1">
          <div className="font-display text-4xl text-ink leading-none">
            {String(rank).padStart(2, '0')}
          </div>
        </div>

        {/* Title + meta */}
        <div className="col-span-11 md:col-span-5">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-display text-2xl tracking-tight text-ink group-hover:text-accent transition-colors">
              {ch.name}
            </h3>
            {ch.isFree && <span className="label-ink border border-accent text-accent px-1.5 py-0.5">FREE</span>}
          </div>
          <p className="text-sm text-ink/80 mt-1 leading-snug">{ch.bestFor}</p>
          <p className="text-xs text-muted mt-2 italic leading-snug">{ch.notes}</p>
        </div>

        {/* Metrics */}
        <div className="col-span-12 md:col-span-6 grid grid-cols-4 gap-3 mt-3 md:mt-0">
          <Metric label="Yield" value={`${ch.yieldRateMin}–${ch.yieldRateMax}%`}>
            <div className="h-[2px] bg-ink/15 mt-2 w-full">
              <div className="h-full bg-accent" style={{ width: `${yieldPct}%` }} />
            </div>
          </Metric>
          <Metric label="Cost/Hire" value={`${fmt(ch.cphMin)}–${fmt(ch.cphMax)}`} />
          <Metric label="Time" value={`${ch.timeToFill}d`} />
          <Metric label="Effort">
            <span className={`font-display text-xl ${EFFORT_TONE[ch.effortLevel]}`}>{ch.effortLevel}</span>
          </Metric>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {value && <p className="font-display text-xl text-ink mt-1 leading-none">{value}</p>}
      {children}
    </div>
  );
}
