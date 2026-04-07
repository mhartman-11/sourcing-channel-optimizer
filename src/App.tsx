import { useState } from 'react';
import {
  RoleCategory, Seniority, getRankedChannels, RankedChannel,
  ALL_CATEGORIES, ALL_SENIORITIES,
} from './data/benchmarks';
import { generateXRaySearches, parseSkills } from './data/xray';
import { searchCandidates, Candidate } from './data/candidateSearch';
import RoleInput from './components/RoleInput';
import ResultsSummary from './components/ResultsSummary';
import ChannelCard from './components/ChannelCard';
import CandidateResults from './components/CandidateResults';
import XRayPanel from './components/XRayPanel';

interface Snapshot {
  roleTitle: string;
  category: RoleCategory | null;
  seniority: Seniority | null;
  industry: string;
  skills: string[];
  location: string;
  channels: RankedChannel[];
}

function categoryLabel(c: RoleCategory | null): string {
  return ALL_CATEGORIES.find(x => x.value === c)?.label ?? '';
}
function seniorityLabel(s: Seniority | null): string {
  const found = ALL_SENIORITIES.find(x => x.value === s)?.label;
  return found ? `${found} Level` : '';
}

export default function App() {
  const [roleTitle, setRoleTitle] = useState('');
  const [category, setCategory] = useState<RoleCategory | null>(null);
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!roleTitle.trim()) return;
    const parsedSkills = parseSkills(skills);
    const channels = getRankedChannels(category, seniority);

    const snap: Snapshot = {
      roleTitle: roleTitle.trim(),
      category, seniority, industry,
      skills: parsedSkills,
      location, channels,
    };
    setSnapshot(snap);
    setCandidates([]);
    setCandidateError(null);
    setLoadingCandidates(true);

    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);

    try {
      const results = await searchCandidates({
        roleTitle: snap.roleTitle,
        skills: snap.skills,
        location: snap.location,
        industry: snap.industry,
      });
      setCandidates(results);
    } catch (e) {
      setCandidateError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const xraySearches = snapshot
    ? generateXRaySearches({
        roleTitle: snapshot.roleTitle,
        category: snapshot.category,
        industry: snapshot.industry,
        skills: snapshot.skills,
        location: snapshot.location,
      })
    : [];

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Masthead */}
      <header className="border-b border-ink sticky top-0 bg-paper z-20 no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-2xl tracking-tight">Sourcing Optimizer</span>
            <span className="label hidden sm:inline">A field manual for talent acquisition</span>
          </div>
          <span className="label">Vol. 01 / Edition A</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Hero strip — only visible before results */}
        {!snapshot && (
          <div className="border-b border-ink pb-8">
            <p className="label mb-3">A research instrument for recruiters</p>
            <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.95]">
              The right channel mix,<br />
              <span className="italic text-accent">benchmarked</span> against the market.
            </h1>
            <p className="mt-4 max-w-2xl text-ink/70 text-base leading-relaxed">
              Enter a role brief and receive a ranked sourcing strategy with yield rates,
              cost-per-hire, and time-to-fill — plus a live scrape of qualified candidates
              from the open web. No tools, no credentials, no fees.
            </p>
          </div>
        )}

        <RoleInput
          roleTitle={roleTitle}
          category={category}
          seniority={seniority}
          industry={industry}
          skills={skills}
          location={location}
          loading={loadingCandidates}
          onRoleTitle={setRoleTitle}
          onCategory={setCategory}
          onSeniority={setSeniority}
          onIndustry={setIndustry}
          onSkills={setSkills}
          onLocation={setLocation}
          onAnalyze={handleAnalyze}
        />

        {snapshot && (
          <div id="results" className="space-y-8">
            <ResultsSummary
              roleTitle={snapshot.roleTitle}
              category={categoryLabel(snapshot.category)}
              seniority={seniorityLabel(snapshot.seniority)}
              channels={snapshot.channels}
              onPrint={() => window.print()}
            />

            {/* Channel rankings */}
            <section className="border border-ink bg-paper">
              <div className="flex items-center justify-between border-b border-ink px-6 py-3">
                <span className="label-ink">§ 02.1 — Ranked Channels</span>
                <span className="label">{snapshot.channels.length} ranked</span>
              </div>
              <div>
                {snapshot.channels.map((ch, i) => (
                  <ChannelCard key={ch.id} channel={ch} rank={i + 1} />
                ))}
              </div>
            </section>

            <CandidateResults
              candidates={candidates}
              loading={loadingCandidates}
              error={candidateError}
            />

            <XRayPanel searches={xraySearches} />

            <p className="label text-center pt-8 pb-4">
              Benchmarks · LinkedIn Talent Trends · SHRM Human Capital Report · iCIMS Workforce · Jobvite Recruiter Nation
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
