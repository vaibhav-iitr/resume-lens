'use client';

import { useState, useEffect } from 'react';
import ResumeInput from '@/components/ResumeInput';
import JDInput from '@/components/JDInput';
import EngineSelector from '@/components/EngineSelector';
import AuthModal from '@/components/AuthModal';
import { AnalysisResult } from '@/lib/types';

type ResumeState =
  | { type: 'text'; text: string }
  | { type: 'file'; file: File }
  | null;

type AuthUser = { id: string; email: string; llmUsesRemaining: number } | null;
type Engine = 'algorithm' | 'llm' | 'byok';
type ByokProvider = 'anthropic' | 'openai' | 'groq';

const PERSONAS = [
  { id: 'ats', label: 'ATS', description: 'Keyword match and parseability' },
  { id: 'recruiter', label: 'Recruiter', description: '5-second scan, signal and brevity' },
  { id: 'interviewer', label: 'Interviewer', description: 'Bullet depth and defensibility' },
  { id: 'hiring_manager', label: 'Hiring Manager', description: 'Business impact and fit' },
];

export default function Home() {
  const [resume, setResume] = useState<ResumeState>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [user, setUser] = useState<AuthUser>(null);
  const [engine, setEngine] = useState<Engine>('algorithm');
  const [byokKey, setByokKey] = useState('');
  const [byokProvider, setByokProvider] = useState<ByokProvider>('anthropic');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {/* ignore */});
  }, []);

  const canAnalyze =
    !loading &&
    jobDescription.trim().length >= 50 &&
    resume !== null &&
    (resume.type === 'file' || resume.text.trim().length >= 50) &&
    (engine !== 'byok' || byokKey.trim().length > 0);

  async function handleAnalyze() {
    if (!canAnalyze || !resume) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response: Response;

      if (resume.type === 'file') {
        const formData = new FormData();
        formData.append('resume', resume.file);
        formData.append('jobDescription', jobDescription);
        formData.append('engine', engine);
        formData.append('apiKey', byokKey);
        formData.append('provider', byokProvider);
        response = await fetch('/api/analyze', { method: 'POST', body: formData });
      } else {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: resume.text,
            jobDescription,
            engine,
            apiKey: byokKey,
            provider: byokProvider,
          }),
        });
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.result);
        if (typeof data.llmUsesRemaining === 'number' && user) {
          setUser({ ...user, llmUsesRemaining: data.llmUsesRemaining });
        }
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setEngine('algorithm');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Resume Lens</h1>
            <p className="text-xs text-gray-400 mt-0.5">Four readers. One pass. Real feedback.</p>
          </div>
          {/* User bar */}
          {user && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="hidden sm:block">{user.email}</span>
              <span className="text-gray-300">·</span>
              <span>{user.llmUsesRemaining} AI {user.llmUsesRemaining === 1 ? 'analysis' : 'analyses'} left</span>
              <span className="text-gray-300">·</span>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Framework explainer */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 max-w-2xl">
            Your resume passes through four readers before a human sees it. Most feedback tools ignore this.
            Resume Lens evaluates your resume through each one — ATS, Recruiter, Interviewer, and Hiring Manager — and tells you exactly where you&apos;re getting filtered out.
          </p>
          <div className="flex gap-2 mt-4 flex-wrap items-center">
            {PERSONAS.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  {p.label}
                </span>
                {i < PERSONAS.length - 1 && (
                  <span className="text-gray-300 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <ResumeInput onResumeChange={setResume} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <JDInput value={jobDescription} onChange={setJobDescription} />
          </div>
        </div>

        {/* Engine selector */}
        <EngineSelector
          engine={engine}
          onEngineChange={setEngine}
          byokKey={byokKey}
          onByokKeyChange={setByokKey}
          byokProvider={byokProvider}
          onByokProviderChange={setByokProvider}
          user={user}
          onLoginRequest={() => {
            setAuthModalMode('signup');
            setShowAuthModal(true);
          }}
        />

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Analyze button */}
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all ${
              canAnalyze
                ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Resume'
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div id="results" className="mt-14">
            <ResultsView result={result} onReset={handleReset} />
          </div>
        )}
      </div>

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          defaultMode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => {
            setUser(u);
            setEngine('llm');
            setShowAuthModal(false);
          }}
        />
      )}
    </main>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600';
  if (score >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number) {
  if (score >= 75) return 'bg-green-50 border-green-100';
  if (score >= 55) return 'bg-yellow-50 border-yellow-100';
  return 'bg-red-50 border-red-100';
}

function ResultsView({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  return (
    <div className="space-y-8">
      {/* Overall score */}
      <div className={`rounded-xl border p-6 ${scoreBg(result.overallScore)}`}>
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Overall Score</p>
            <p className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
            <p className="text-sm text-gray-700 mt-2 max-w-xl">{result.verdict}</p>
          </div>
        </div>
      </div>

      {/* Persona cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Reader Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {result.personas.map((persona, i) => (
            <div key={persona.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{persona.label}</span>
                </div>
                <span className={`text-xl font-bold ${scoreColor(persona.score)}`}>{persona.score}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1.5">Strengths</p>
                  <ul className="space-y-1">
                    {persona.finding.strengths.map((s, j) => (
                      <li key={j} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1.5">Issues</p>
                  <ul className="space-y-1">
                    {persona.finding.issues.map((issue, j) => (
                      <li key={j} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority fixes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Top 5 Priority Fixes</h3>
        <div className="space-y-3">
          {result.priorityFixes.map((fix) => (
            <div key={fix.rank} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex gap-4">
              <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {fix.rank}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{fix.issue}</p>
                <p className="text-xs text-gray-600 mt-0.5">{fix.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing keywords + red flags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.missingKeywords.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Missing Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {result.missingKeywords.map((kw, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.redFlags.length > 0 && (
          <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">Red Flags</h3>
            <ul className="space-y-1.5">
              {result.redFlags.map((flag, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">!</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reset CTA */}
      <div className="flex justify-center pt-4 pb-10">
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          Analyze another resume
        </button>
      </div>
    </div>
  );
}
