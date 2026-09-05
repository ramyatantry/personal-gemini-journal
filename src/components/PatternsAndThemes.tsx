import { useState, useMemo, useRef, useEffect } from 'react';
import { JournalSession, PatternsThemesAnalysis } from '../types';
import { analyzePatternsAndThemesOnServer } from '../services/geminiService';
import {
  TrendingUp,
  Sparkles,
  Layers,
  HeartPulse,
  Compass,
  HelpCircle,
  Copy,
  Check,
  Download,
  ArrowRight,
  RefreshCw,
  Clock,
  Tag,
  Activity,
  Zap,
  BrainCircuit,
  Calendar
} from 'lucide-react';

interface PatternsAndThemesProps {
  sessions: JournalSession[];
  onOpenJournal: (id: string) => void;
  onNewJournalWithPrompt: (prompt: string) => void;
}

type TimeframeOption = '30-days' | '3-months' | '6-months' | 'all';

export function PatternsAndThemes({
  sessions,
  onOpenJournal,
  onNewJournalWithPrompt,
}: PatternsAndThemesProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('30-days');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisMap, setAnalysisMap] = useState<Record<TimeframeOption, PatternsThemesAnalysis | null>>({
    '30-days': null,
    '3-months': null,
    '6-months': null,
    all: null,
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Helper to filter sessions based on timeframe
  const getFilteredSessions = (tf: TimeframeOption): JournalSession[] => {
    if (tf === 'all') return sessions;

    const now = new Date();
    const daysMap: Record<TimeframeOption, number> = {
      '30-days': 30,
      '3-months': 90,
      '6-months': 180,
      all: 999999,
    };
    const cutoff = new Date(now.getTime() - daysMap[tf] * 24 * 60 * 60 * 1000);

    return sessions.filter((s) => {
      const parsed = new Date(s.date);
      if (!isNaN(parsed.getTime())) {
        return parsed >= cutoff;
      }
      return true; // include if date cannot be strictly parsed
    });
  };

  const timeframeSessions = useMemo(() => {
    return getFilteredSessions(selectedTimeframe);
  }, [sessions, selectedTimeframe]);

  const timeframeLabels: Record<TimeframeOption, string> = {
    '30-days': 'Last 30 Days',
    '3-months': 'Last 3 Months',
    '6-months': 'Last 6 Months',
    all: 'All Time',
  };

  const timeframeDateRanges: Record<TimeframeOption, string> = {
    '30-days': 'Past 30 days of reflections',
    '3-months': 'Past 90 days of reflections',
    '6-months': 'Past 180 days of reflections',
    all: 'Complete recorded journal history',
  };

  const currentAnalysis = analysisMap[selectedTimeframe];

  const handleAnalyze = async () => {
    if (timeframeSessions.length === 0) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await analyzePatternsAndThemesOnServer(
        selectedTimeframe,
        timeframeLabels[selectedTimeframe],
        timeframeDateRanges[selectedTimeframe],
        timeframeSessions
      );
      setAnalysisMap((prev) => ({
        ...prev,
        [selectedTimeframe]: result,
      }));
    } catch (err) {
      console.error('Failed to analyze patterns:', err);
      setErrorMsg('Failed to analyze patterns and themes. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!currentAnalysis) return;
    const text = `# Patterns & Themes Analysis: ${currentAnalysis.timeframeLabel}
Total Entries Analyzed: ${currentAnalysis.totalEntriesAnalyzed}
Date Range: ${currentAnalysis.dateRange}
Generated: ${currentAnalysis.generatedAt}

## 1. Recurring Themes & Focus Areas
${currentAnalysis.recurringThemes
  .map(
    (t) =>
      `### ${t.name} [Prominence: ${t.prominence}]\n${t.description}\n*Reference:* ${t.dateRangeOrEntries || 'Across entries'}`
  )
  .join('\n\n')}

## 2. Behavioral & Emotional Patterns
${currentAnalysis.behavioralAndEmotionalPatterns
  .map((p) => `- **${p.title}** (${p.category}): ${p.insight}`)
  .join('\n')}

## 3. Growth & Perspective Evolution
${currentAnalysis.growthAndEvolution}

## 4. Deep Reflection Questions
${currentAnalysis.reflectionQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentAnalysis) return;
    const text = `# Patterns & Themes Analysis: ${currentAnalysis.timeframeLabel}
Total Entries Analyzed: ${currentAnalysis.totalEntriesAnalyzed}
Date Range: ${currentAnalysis.dateRange}
Generated: ${currentAnalysis.generatedAt}

=== 1. RECURRING THEMES & FOCUS AREAS ===
${currentAnalysis.recurringThemes
  .map(
    (t, idx) =>
      `${idx + 1}. ${t.name} (${t.prominence} Prominence)\n${t.description}\nObserved: ${t.dateRangeOrEntries || 'Across entries'}`
  )
  .join('\n\n')}

=== 2. BEHAVIORAL & EMOTIONAL PATTERNS ===
${currentAnalysis.behavioralAndEmotionalPatterns
  .map((p, idx) => `${idx + 1}. [${p.category}] ${p.title}: ${p.insight}`)
  .join('\n')}

=== 3. GROWTH & EVOLUTION ===
${currentAnalysis.growthAndEvolution}

=== 4. DEEP REFLECTION QUESTIONS ===
${currentAnalysis.reflectionQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patterns-and-themes-${selectedTimeframe}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProminenceBadge = (prominence: string) => {
    const pLower = prominence.toLowerCase();
    if (pLower.includes('high')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    if (pLower.includes('med')) {
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  };

  const getCategoryIcon = (category: string) => {
    const cLower = category.toLowerCase();
    if (cLower.includes('emotion')) {
      return <HeartPulse className="h-3.5 w-3.5 text-pink-400" />;
    }
    if (cLower.includes('behavior')) {
      return <Activity className="h-3.5 w-3.5 text-amber-400" />;
    }
    if (cLower.includes('habit')) {
      return <Zap className="h-3.5 w-3.5 text-emerald-400" />;
    }
    return <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />;
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-40 lg:px-8">
      <div className="w-full space-y-6">
        {/* Header Title Section */}
        <div className="relative z-20 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Thematic Evolution</span>
            </div>
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Patterns & Themes
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm max-w-xl">
              Discover recurring narrative threads, emotional dynamics, habit shifts, and personal growth across your journaling journey.
            </p>
          </div>

          {/* Timeframe Selector & Trigger */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1 backdrop-blur-md">
              {(['30-days', '3-months', '6-months', 'all'] as TimeframeOption[]).map((tf) => {
                const isSelected = selectedTimeframe === tf;
                const count = getFilteredSessions(tf).length;
                return (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{timeframeLabels[tf]}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-purple-700/80 text-white' : 'bg-white/10 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              id="analyze-patterns-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || timeframeSessions.length === 0}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold text-white shadow-xl transition-all active:scale-95 border ${
                timeframeSessions.length === 0
                  ? 'cursor-not-allowed bg-white/5 text-slate-500 border-white/5'
                  : isAnalyzing
                  ? 'cursor-wait bg-purple-600/70 border-purple-400/40 text-purple-200'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400/30 shadow-purple-600/25'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  <span>Analyze Patterns</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Ref Anchor */}
        <div ref={resultsRef} className="scroll-mt-6" />

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 backdrop-blur-md">
            {errorMsg}
          </div>
        )}

        {/* Loading Radar Animation */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-2xl shadow-2xl">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20 duration-1000" />
              <div className="absolute inset-2 animate-pulse rounded-full bg-indigo-500/25 duration-1500" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-600/30">
                <Layers className="h-7 w-7 animate-spin duration-3000 text-purple-200" />
              </div>
            </div>

            <h3 className="font-editorial mt-6 text-xl font-medium text-white">
              Analyzing {timeframeLabels[selectedTimeframe]}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
              Gemini is reviewing {timeframeSessions.length} journal sessions, correlating topics, identifying recurring behavioral loops, and mapping your emotional progression.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                Clustering thematic topics
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Evaluating behavioral patterns
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                Generating deep reflection prompts
              </span>
            </div>
          </div>
        )}

        {/* Empty state when 0 entries in selected timeframe */}
        {!isAnalyzing && timeframeSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-2xl shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <TrendingUp className="h-8 w-8 text-purple-400/60" />
            </div>
            <h3 className="font-editorial mt-5 text-xl font-medium text-white">
              No Entries in {timeframeLabels[selectedTimeframe]}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
              You haven&apos;t recorded any journal sessions in this timeframe. Write a new journal entry or select &quot;All Time&quot; to review your full archive.
            </p>
            <button
              onClick={() => onNewJournalWithPrompt('')}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-purple-600/25 border border-purple-400/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Start a New Journal Session</span>
            </button>
          </div>
        )}

        {/* Ready to analyze state when entries exist but not yet analyzed */}
        {!isAnalyzing && timeframeSessions.length > 0 && !currentAnalysis && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-500/20 bg-slate-900/60 p-10 text-center backdrop-blur-2xl shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-lg">
              <Layers className="h-7 w-7 text-purple-400" />
            </div>
            <h3 className="font-editorial mt-4 text-xl font-medium text-white">
              {timeframeSessions.length} {timeframeSessions.length === 1 ? 'Entry' : 'Entries'} Ready for Pattern Analysis
            </h3>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm">
              Discover which focus areas took priority, how your emotional reactions evolved, and what habits helped you overcome friction over the {timeframeLabels[selectedTimeframe].toLowerCase()}.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {timeframeSessions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpenJournal(s.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Clock className="h-3 w-3 text-purple-400" />
                  <span className="max-w-[140px] truncate">{s.title}</span>
                </button>
              ))}
              {timeframeSessions.length > 5 && (
                <span className="text-xs text-slate-500 px-2">+{timeframeSessions.length - 5} more</span>
              )}
            </div>
            <button
              onClick={handleAnalyze}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-purple-600/30 border border-purple-400/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Analyze Patterns & Themes for {timeframeLabels[selectedTimeframe]}</span>
            </button>
          </div>
        )}

        {/* Render Generated Patterns & Themes Analysis */}
        {!isAnalyzing && currentAnalysis && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
                  {currentAnalysis.timeframeLabel}
                </span>
                <span className="text-xs text-slate-400">
                  {currentAnalysis.totalEntriesAnalyzed} {currentAnalysis.totalEntriesAnalyzed === 1 ? 'entry' : 'entries'} analyzed
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">•</span>
                <span className="hidden text-xs text-slate-400 sm:inline">
                  Generated {currentAnalysis.generatedAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
                  title="Copy markdown analysis"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
                  title="Download Markdown analysis"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>

                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition"
                  title="Re-run analysis"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Section 1: Recurring Themes & Focus Areas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-white tracking-tight sm:text-base">
                    Recurring Themes & Focus Areas
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Core subjects, values, and life topics that appeared frequently across this timeframe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentAnalysis.recurringThemes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl hover:border-purple-400/30 transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-medium text-xs text-white tracking-tight group-hover:text-purple-200 transition">
                          {theme.name}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getProminenceBadge(
                            theme.prominence
                          )}`}
                        >
                          {theme.prominence}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {theme.description}
                      </p>
                    </div>

                    {theme.dateRangeOrEntries && (
                      <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-purple-400 shrink-0" />
                        <span className="truncate">{theme.dateRangeOrEntries}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Behavioral & Emotional Patterns */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-white tracking-tight sm:text-base">
                    Behavioral & Emotional Dynamics
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Observed emotional rhythms, habit triggers, energy fluctuations, and mindset patterns.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {currentAnalysis.behavioralAndEmotionalPatterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl flex items-start gap-3.5"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      {getCategoryIcon(pattern.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {pattern.title}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300 border border-white/10">
                          {pattern.category}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {pattern.insight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Growth & Perspective Evolution */}
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-slate-900/70 to-purple-950/40 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
              <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-purple-500/15 blur-3xl" />
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Compass className="h-4 w-4" />
                </div>
                <h2 className="font-editorial text-lg font-semibold text-white sm:text-xl">
                  Growth & Perspective Evolution
                </h2>
              </div>
              <div className="mt-4 text-xs leading-relaxed text-slate-200 sm:text-sm whitespace-pre-line space-y-3">
                {currentAnalysis.growthAndEvolution}
              </div>
            </div>

            {/* Section 4: Deep Reflection Questions */}
            <div className="rounded-3xl border border-purple-500/30 bg-slate-900/70 p-6 backdrop-blur-2xl shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-base font-semibold text-purple-200 tracking-tight">
                    Deep Reflection Inquiries
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Click any inquiry below to begin a new journal entry focused on exploring that pattern.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                {currentAnalysis.reflectionQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNewJournalWithPrompt(q)}
                    className="flex flex-col justify-between text-left rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 hover:bg-purple-500/10 hover:border-purple-400/40 transition group active:scale-[0.98]"
                  >
                    <p className="text-xs font-medium text-slate-200 group-hover:text-purple-200 transition leading-relaxed">
                      &ldquo;{q}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-purple-300 pt-2 border-t border-purple-500/10">
                      <span>Explore this in Journal</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
