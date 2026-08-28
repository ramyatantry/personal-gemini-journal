import {
  Sparkles,
  ShieldCheck,
  Brain,
  MessageCircle,
  FileText,
  Compass,
  ArrowRight,
  HeartHandshake,
  CheckCircle,
  Feather,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { STARTER_PROMPTS } from '../data/sampleSessions';

interface LandingPageProps {
  onStartJournal: (prompt?: string) => void;
  onExploreSession: (sessionId: string) => void;
  onAskJournal?: () => void;
  onMonthlyReflection?: () => void;
  onPatterns?: () => void;
}

export function LandingPage({
  onStartJournal,
  onExploreSession,
  onAskJournal,
  onMonthlyReflection,
  onPatterns,
}: LandingPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Hero Section */}
      <section className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 shadow-lg shadow-indigo-500/10 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>A Private Sanctuary for Mindful Reflection</span>
        </div>

        <h1 className="font-editorial mt-6 text-4xl font-normal tracking-tight text-white sm:text-5xl lg:text-6xl">
          Write freely. Reflect deeply. <br className="hidden sm:inline" />
          <span className="italic bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            Guided by Gemini.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Personal Gemini Journal is a calm, conversational journaling space. Rather than staring at a blank page, you engage in a reflective, multi-turn dialogue that gently unpacks your feelings and crystallizes actionable insights.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={() => onStartJournal()}
            className="group flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-xl shadow-indigo-600/25 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>Start a New Journal Session</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {onMonthlyReflection && (
            <button
              onClick={onMonthlyReflection}
              className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-600/20 hover:bg-indigo-600/30 px-5 py-3 text-sm font-medium text-indigo-200 backdrop-blur-xl shadow-lg transition-all active:scale-95"
            >
              <Calendar className="h-4 w-4 text-indigo-300" />
              <span>Monthly Reflection</span>
            </button>
          )}

          {onPatterns && (
            <button
              onClick={onPatterns}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-600/20 hover:bg-cyan-600/30 px-5 py-3 text-sm font-medium text-cyan-200 backdrop-blur-xl shadow-lg transition-all active:scale-95"
            >
              <TrendingUp className="h-4 w-4 text-cyan-300" />
              <span>Patterns & Themes</span>
            </button>
          )}

          {onAskJournal && (
            <button
              onClick={onAskJournal}
              className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-600/20 hover:bg-purple-600/30 px-5 py-3 text-sm font-medium text-purple-200 backdrop-blur-xl shadow-lg transition-all active:scale-95"
            >
              <Compass className="h-4 w-4 text-purple-300" />
              <span>Ask My Journal</span>
            </button>
          )}
        </div>
      </section>

      {/* 4 Pillars of Gemini Intelligence */}
      <section className="mt-16 sm:mt-20">
        <div className="text-center">
          <h2 className="font-editorial text-2xl font-normal text-white sm:text-3xl">
            Reflective AI Architecture
          </h2>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-medium">
            From raw thoughts to long-term emotional wisdom
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-xl transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              1. Conversational Dialogue
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Unpack feelings through thoughtful Socratic prompts that guide without intruding.
            </p>
          </div>

          {/* Card 2 */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-xl transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              2. Ask My Journal
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Query across all your historical sessions to uncover correlations and insights.
            </p>
          </div>

          {/* Card 3 */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-xl transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-300 border border-indigo-500/30">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              3. Monthly Reflection
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Synthesize 6 structured dimensions: standout events, joys, concerns, wins, values, and questions.
            </p>
          </div>

          {/* Card 4 */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-xl transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              4. Patterns & Themes
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Track recurring topics, behavioral loops, and emotional evolution across custom timeframes.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Prompts to jump into */}
      <section className="mt-16 sm:mt-20">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-editorial text-2xl font-normal text-white">
              Jumpstart Your Session
            </h2>
            <p className="text-xs text-slate-400">
              Select an intention or entry prompt to begin immediately
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Click any prompt to begin</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STARTER_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onStartJournal(item.prompt)}
              className="group flex flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-lg backdrop-blur-xl transition-all hover:border-indigo-400/40 hover:bg-white/10"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-semibold text-slate-100 group-hover:text-white">
                  {item.title}
                </span>
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 border border-white/10">
                  {item.badge}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400 italic group-hover:text-slate-200">
                &ldquo;{item.prompt}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-indigo-400 group-hover:text-indigo-300">
                <span>Start with this</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Core Principles / Privacy Pillar */}
      <section className="mt-16 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/40 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span>Designed with Absolute Privacy in Mind</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Your journal is your inner sanctuary. In this initial iteration, sessions live purely in your local browser state—with zero external account tracking or remote storage.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Zero telemetry or profiling</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Client-side session memory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Exportable summaries</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0">
            <button
              onClick={() => onStartJournal()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition hover:scale-[1.02]"
            >
              <Feather className="h-3.5 w-3.5" />
              <span>Open Private Journal</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
