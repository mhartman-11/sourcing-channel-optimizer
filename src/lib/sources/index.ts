// Source registry + parallel multi-source aggregation. Each source fails independently.
import { Candidate, SearchQuery, SourceId, SourceModule } from '../types';
import github from './github';
import stackoverflow from './stackoverflow';
import hackernews from './hackernews';
import devto from './devto';

export const SOURCES: SourceModule[] = [github, stackoverflow, hackernews, devto];
export const SOURCE_BY_ID: Record<SourceId, SourceModule> = Object.fromEntries(
  SOURCES.map((s) => [s.meta.id, s]),
) as Record<SourceId, SourceModule>;

export interface SourceOutcome {
  id: SourceId;
  ok: boolean;
  total: number;
  error?: string;
}

export interface AggregateResult {
  candidates: Candidate[];      // merged + sorted by matchScore
  outcomes: SourceOutcome[];    // per-source status for transparent UI
}

export async function searchSources(ids: SourceId[], q: SearchQuery): Promise<AggregateResult> {
  const settled = await Promise.all(
    ids.map(async (id): Promise<{ outcome: SourceOutcome; candidates: Candidate[] }> => {
      try {
        const r = await SOURCE_BY_ID[id].search(q);
        return { outcome: { id, ok: true, total: r.total }, candidates: r.candidates };
      } catch (e: any) {
        return { outcome: { id, ok: false, total: 0, error: e?.message || 'failed' }, candidates: [] };
      }
    }),
  );

  // Dedupe by uid, keep highest score.
  const map = new Map<string, Candidate>();
  for (const s of settled) {
    for (const c of s.candidates) {
      const prev = map.get(c.uid);
      if (!prev || c.matchScore > prev.matchScore) map.set(c.uid, c);
    }
  }
  const candidates = [...map.values()].sort((a, b) => b.matchScore - a.matchScore);
  return { candidates, outcomes: settled.map((s) => s.outcome) };
}
