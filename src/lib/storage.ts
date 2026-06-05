// Pipeline persistence (localStorage) + CSV/JSON export. No backend, fully free.
import type { Candidate } from './types';

export type Stage = 'sourced' | 'contacted' | 'replied' | 'screening' | 'rejected';

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'sourced', label: 'Sourced' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'screening', label: 'Screening' },
  { id: 'rejected', label: 'Passed' },
];

export interface SavedCandidate extends Candidate {
  stage: Stage;
  note: string;
  savedAt: string;
}

const KEY = 'sco_pipeline_v1';

export function loadPipeline(): SavedCandidate[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list: SavedCandidate[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isSaved(list: SavedCandidate[], uid: string): boolean {
  return list.some((x) => x.uid === uid);
}

export function toggleSave(list: SavedCandidate[], c: Candidate): SavedCandidate[] {
  const exists = list.some((x) => x.uid === c.uid);
  const next = exists
    ? list.filter((x) => x.uid !== c.uid)
    : [...list, { ...c, stage: 'sourced' as Stage, note: '', savedAt: new Date().toISOString() }];
  save(next);
  return next;
}

export function updateSaved(list: SavedCandidate[], uid: string, patch: Partial<SavedCandidate>): SavedCandidate[] {
  const next = list.map((x) => (x.uid === uid ? { ...x, ...patch } : x));
  save(next);
  return next;
}

function download(content: string, type: string, ext: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(list: SavedCandidate[]): void {
  const cols: (keyof SavedCandidate | 'email' | 'tags')[] = ['name', 'handle', 'source', 'stage', 'url', 'location', 'company', 'email', 'tags', 'matchScore', 'note'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cell = (p: SavedCandidate, c: string) => {
    if (c === 'email') return esc(p.contact.email);
    if (c === 'tags') return esc(p.tags.join('; '));
    return esc((p as any)[c]);
  };
  const rows = list.map((p) => cols.map((c) => cell(p, c as string)).join(','));
  download([cols.join(','), ...rows].join('\n'), 'text/csv', 'csv');
}

export function exportJson(list: SavedCandidate[]): void {
  download(JSON.stringify(list, null, 2), 'application/json', 'json');
}

/* ---------------- Saved Searches ---------------- */

export interface SavedSearch {
  id: string;
  name: string;
  query: Record<string, unknown>;
  sources: string[];
  createdAt: string;
}

const SEARCHES_KEY = 'sco_saved_searches_v1';

export function loadSavedSearches(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveSearch(name: string, query: Record<string, unknown>, sources: string[]): SavedSearch[] {
  const list = loadSavedSearches();
  const next: SavedSearch[] = [
    { id: Date.now().toString(), name, query, sources, createdAt: new Date().toISOString() },
    ...list,
  ].slice(0, 12);
  localStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedSearch(id: string): SavedSearch[] {
  const next = loadSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
  return next;
}
