import { useState, useMemo, useRef, useEffect } from 'react';
import { JournalSession, MonthlyReflection as MonthlyReflectionType } from '../types';
import { generateMonthlyReflectionOnServer } from '../services/geminiService';
import {
  Calendar,
  Sparkles,
  Sun,
  CloudRain,
  Trophy,
  Heart,
  HelpCircle,
  Copy,
  Check,
  Download,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronDown
} from 'lucide-react';

interface MonthlyReflectionProps {
  sessions: JournalSession[];
  onOpenJournal: (id: string) => void;
  onNewJournal: () => void;
}

export function parseYearMonth(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const match = dateStr.toLowerCase().match(/([a-z]{3})[a-z]*[\s,]+(\d{1,2})[\s,]+(\d{4})/);
  if (match && months[match[1]]) {
    return `${match[3]}-${months[match[1]]}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatYearMonthDisplay(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function MonthlyReflection({
  sessions,
  onOpenJournal,
  onNewJournal,
}: MonthlyReflectionProps) {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reflection, setReflection] = useState<MonthlyReflectionType | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Generate available months list (past 12 months + any month present in sessions)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentYearMonth);

    // Add past 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(ym);
    }

    // Add months from sessions
    sessions.forEach((s) => {
      if (s.date) {
        const ym = parseYearMonth(s.date);
        monthsSet.add(ym);
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [sessions, currentYearMonth]);

  // Filter sessions matching the selected month
  const monthSessions = useMemo(() => {
    return sessions.filter((s) => {
      const ym = parseYearMonth(s.date);
      return ym === selectedMonth;
    });
  }, [sessions, selectedMonth]);

  const selectedMonthDisplay = formatYearMonthDisplay(selectedMonth);

  const handleGenerateReflection = async () => {
    if (monthSessions.length === 0) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const result = await generateMonthlyReflectionOnServer(
        selectedMonth,
        selectedMonthDisplay,
        monthSessions
      );
      setReflection(result);
    } catch (err) {
      console.error('Failed to generate monthly reflection:', err);
      setErrorMsg('Failed to generate reflection. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!reflection) return;
    const text = `# Monthly Reflection: ${reflection.monthDisplay}
Total Entries Analyzed: ${reflection.totalEntries}
Generated: ${reflection.generatedAt}

## Summary Overview
${reflection.summaryOverview || ''}

## 1. What Stood Out
${reflection.whatStoodOut.map((item) => `- ${item}`).join('\n')}

## 2. Moments of Joy
${reflection.momentsOfJoy.map((item) => `- ${item}`).join('\n')}

## 3. Recurring Concerns
${reflection.recurringConcerns.map((item) => `- ${item}`).join('\n')}

## 4. Accomplishments
${reflection.accomplishments.map((item) => `- ${item}`).join('\n')}

## 5. What I Cared About
${reflection.whatICaredAbout.map((item) => `- ${item}`).join('\n')}

## 6. Question to Carry Forward
> "${reflection.questionToCarryForward}"
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!reflection) return;
    const text = `# Monthly Reflection: ${reflection.monthDisplay}
Total Entries Analyzed: ${reflection.totalEntries}
Generated: ${reflection.generatedAt}

=== SUMMARY OVERVIEW ===
${reflection.summaryOverview || ''}

=== 1. WHAT STOOD OUT ===
${reflection.whatStoodOut.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== 2. MOMENTS OF JOY ===
${reflection.momentsOfJoy.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== 3. RECURRING CONCERNS ===
${reflection.recurringConcerns.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== 4. ACCOMPLISHMENTS ===
${reflection.accomplishments.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== 5. WHAT I CARED ABOUT ===
${reflection.whatICaredAbout.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== 6. QUESTION TO CARRY FORWARD ===
"${reflection.questionToCarryForward}"
`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-reflection-${selectedMonth}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-40 lg:px-8">
      <div className="w-full space-y-6">
        {/* Header Title Section */}
        <div className="relative z-20 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <Calendar className="h-3.5 w-3.5" />
              <span>Retrospective Intelligence</span>
            </div>
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Monthly Reflection
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm max-w-xl">
              Synthesize an entire month of journal entries into thoughtful insights, emotional patterns, and guidance forward.
            </p>
          </div>

          {/* Month Selector & Trigger */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative">
              <select
                id="month-selector"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setReflection(null);
                }}
                className="appearance-none rounded-2xl border border-white/15 bg-white/5 py-2.5 pl-4 pr-10 text-xs font-medium text-white shadow-inner backdrop-blur-md focus:border-indigo-400 focus:outline-hidden"
              >
                {availableMonths.map((ym) => {
                  const count = sessions.filter((s) => parseYearMonth(s.date) === ym).length;
                  return (
                    <option key={ym} value={ym} className="bg-slate-900 text-white">
                      {formatYearMonthDisplay(ym)} ({count} {count === 1 ? 'entry' : 'entries'})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              id="generate-monthly-reflection-btn"
              onClick={handleGenerateReflection}
              disabled={isGenerating || monthSessions.length === 0}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold text-white shadow-xl transition-all active:scale-95 border ${
                monthSessions.length === 0
                  ? 'cursor-not-allowed bg-white/5 text-slate-500 border-white/5'
                  : isGenerating
                  ? 'cursor-wait bg-indigo-600/70 border-indigo-400/40 text-indigo-200'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-indigo-400/30 shadow-indigo-600/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                  <span>Generate Monthly Reflection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Ref Anchor */}
        <div ref={resultsRef} className="scroll-mt-6" />

        {/* Error message if any */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 backdrop-blur-md">
            {errorMsg}
          </div>
        )}

        {/* Loading Radar Animation */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-2xl shadow-2xl">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 duration-1000" />
              <div className="absolute inset-2 animate-pulse rounded-full bg-purple-500/25 duration-1500" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30">
                <Sparkles className="h-7 w-7 animate-spin duration-3000 text-indigo-200" />
              </div>
            </div>

            <h3 className="font-editorial mt-6 text-xl font-medium text-white">
              Synthesizing {selectedMonthDisplay}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
              Gemini is retrieving and reading your private journal entries for {selectedMonthDisplay}, extracting standout experiences, moments of joy, recurring concerns, accomplishments, and carrying questions.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Filtering {monthSessions.length} entries
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                Isolating emotional patterns
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                Formulating forward inquiry
              </span>
            </div>
          </div>
        )}

        {/* Empty state when 0 entries in selected month */}
        {!isGenerating && monthSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-2xl shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <Calendar className="h-8 w-8 text-indigo-400/60" />
            </div>
            <h3 className="font-editorial mt-5 text-xl font-medium text-white">
              No Journal Entries for {selectedMonthDisplay}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
              You don&apos;t have any recorded journal sessions in {selectedMonthDisplay}. Start a new reflective dialogue or choose a different month above to view insights.
            </p>
            <button
              onClick={onNewJournal}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-indigo-600/25 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Start a Journal for Today</span>
            </button>
          </div>
        )}

        {/* Ready to generate prompt state when entries exist but reflection not yet generated */}
        {!isGenerating && monthSessions.length > 0 && !reflection && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-indigo-500/20 bg-slate-900/60 p-10 text-center backdrop-blur-2xl shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-lg">
              <BookOpen className="h-7 w-7 text-indigo-400" />
            </div>
            <h3 className="font-editorial mt-4 text-xl font-medium text-white">
              {monthSessions.length} {monthSessions.length === 1 ? 'Entry' : 'Entries'} Ready for Synthesis
            </h3>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm">
              Click below to generate a deep synthesis of your thoughts in {selectedMonthDisplay}, structured across standout events, joyful moments, recurring friction, accomplishments, and mindful questions.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {monthSessions.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpenJournal(s.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Clock className="h-3 w-3 text-indigo-400" />
                  <span className="max-w-[140px] truncate">{s.title}</span>
                </button>
              ))}
              {monthSessions.length > 4 && (
                <span className="text-xs text-slate-500 px-2">+{monthSessions.length - 4} more</span>
              )}
            </div>
            <button
              onClick={handleGenerateReflection}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-3 text-xs font-semibold text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Monthly Reflection for {selectedMonthDisplay}</span>
            </button>
          </div>
        )}

        {/* Render Generated Reflection */}
        {!isGenerating && reflection && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                  {reflection.monthDisplay}
                </span>
                <span className="text-xs text-slate-400">
                  {reflection.totalEntries} {reflection.totalEntries === 1 ? 'entry' : 'entries'} synthesized
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">•</span>
                <span className="hidden text-xs text-slate-400 sm:inline">
                  Generated {reflection.generatedAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
                  title="Copy markdown reflection"
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
                  title="Download Markdown summary"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>

                <button
                  onClick={handleGenerateReflection}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
                  title="Regenerate reflection"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Overview Narrative Card */}
            {reflection.summaryOverview && (
              <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
                <h2 className="font-editorial text-lg font-medium text-white sm:text-xl flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Monthly Overview & Narrative</span>
                </h2>
                <div className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm whitespace-pre-line">
                  {reflection.summaryOverview}
                </div>
              </div>
            )}

            {/* 6 Structured Sections Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Section 1: What Stood Out */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-white tracking-tight">
                      What Stood Out
                    </h3>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Important experiences, events, and realizations from the month.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {reflection.whatStoodOut.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 2: Moments of Joy */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <Sun className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-white tracking-tight">
                      Moments of Joy
                    </h3>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Uplifting moments, gratitudes, positive experiences, and wins.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {reflection.momentsOfJoy.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 3: Recurring Concerns */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
                      <CloudRain className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-white tracking-tight">
                      Recurring Concerns
                    </h3>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Worries, stress factors, and persistent questions.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {reflection.recurringConcerns.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 4: Accomplishments */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-white tracking-tight">
                      Accomplishments
                    </h3>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Milestones reached, obstacles overcome, and habits built.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {reflection.accomplishments.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 5: What I Cared About */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300">
                      <Heart className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-white tracking-tight">
                      What I Cared About
                    </h3>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Values, priorities, relationships, and interests that took center stage.
                  </p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reflection.whatICaredAbout.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-200 flex items-start gap-2"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Question to Carry Forward (Callout Banner) */}
            <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/50 via-slate-900/80 to-indigo-950/50 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <h3 className="font-editorial text-base font-semibold text-purple-200 tracking-tight">
                  Question to Carry Forward
                </h3>
              </div>
              <blockquote className="font-editorial mt-4 text-base italic text-white sm:text-lg leading-relaxed pl-3 border-l-2 border-purple-400">
                &ldquo;{reflection.questionToCarryForward}&rdquo;
              </blockquote>
              <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10">
                <p className="text-[11px] text-slate-400">
                  Use this inquiry as a starter prompt for your next journal session.
                </p>
                <button
                  onClick={onNewJournal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 transition group"
                >
                  <span>Journal this inquiry</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Month's Journal Sessions List */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-xl">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Entries Recorded in {reflection.monthDisplay} ({monthSessions.length})
              </h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {monthSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onOpenJournal(session.id)}
                    className="flex flex-col text-left rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 hover:border-indigo-400/30 transition group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>{session.date}</span>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/20">
                        {session.mood || 'Reflective'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-white group-hover:text-indigo-300 transition line-clamp-1">
                      {session.title}
                    </span>
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
