import { useState, FormEvent } from 'react';
import Markdown from 'react-markdown';
import { JournalSession, AskJournalHistoryItem } from '../types';
import { askJournalOnServer } from '../services/geminiService';
import {
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Compass,
  Tag,
  Heart
} from 'lucide-react';

interface AskMyJournalProps {
  sessions: JournalSession[];
  onOpenJournal: (sessionId: string) => void;
  onNewJournal: () => void;
}

const PRESET_QUESTIONS = [
  {
    icon: Clock,
    label: 'Weekly Thoughts',
    question: 'What have I been thinking about this week?',
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-400/30',
  },
  {
    icon: Layers,
    label: 'Recurring Concerns',
    question: 'What concerns have I mentioned repeatedly?',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-400/30',
  },
  {
    icon: Heart,
    label: 'Gratitude & Joy',
    question: 'What moments of gratitude have I recorded?',
    color: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-400/30',
  },
  {
    icon: Compass,
    label: 'Mentioned Goals',
    question: 'What goals have I mentioned?',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-400/30',
  },
];

export function AskMyJournal({
  sessions,
  onOpenJournal,
  onNewJournal,
}: AskMyJournalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [history, setHistory] = useState<AskJournalHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'recents'>('all');

  const handleAsk = async (questionToAsk: string) => {
    const trimmed = questionToAsk.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setCurrentQuery(trimmed);
    setQuery('');

    try {
      const result = await askJournalOnServer(trimmed, sessions);
      const newItem: AskJournalHistoryItem = {
        id: `ask-${Date.now()}`,
        question: trimmed,
        response: result,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error('Ask My Journal error:', err);
    } finally {
      setIsLoading(false);
      setCurrentQuery('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAsk(query);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div className="relative shrink-0 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>AI Journal Intelligence</span>
            </div>
            <h1 className="font-editorial mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl">
              Ask My Journal
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore patterns, recurring concerns, goals, and specific reflections across your private journal entries. Gemini synthesizes insights strictly from your personal history.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex flex-col items-end rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Indexed Sanctuary
              </span>
              <span className="text-sm font-bold text-indigo-300">
                {sessions.length} {sessions.length === 1 ? 'Journal Entry' : 'Journal Entries'}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Starter Questions */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Suggested Inquiries</span>
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {PRESET_QUESTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.question}
                  onClick={() => handleAsk(item.question)}
                  disabled={isLoading}
                  className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-br p-3.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${item.color} hover:border-white/30`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {item.label}
                    </span>
                    <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-white line-clamp-2 leading-snug">
                    "{item.question}"
                  </p>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-medium opacity-75 group-hover:opacity-100">
                    <span>Ask this</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Query Input Form */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="relative flex items-center rounded-2xl border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-indigo-400/50 focus-within:bg-white/10">
          <Search className="ml-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your thoughts, concerns, goals, milestones..."
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-hidden disabled:opacity-50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mr-2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask Gemini</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Loading Pulse Animation State */}
      {isLoading && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-black/40 p-6 sm:p-7 backdrop-blur-2xl shadow-2xl relative">
          {/* Ambient Glow Orbs with Pulse */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Header Status with Animated Pulse Radar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Concentric Pulse Icon */}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-indigo-500/30 opacity-75" />
                <span className="absolute inline-flex h-9 w-9 animate-pulse rounded-2xl bg-purple-500/40 opacity-90" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-600/80 to-purple-600/80 text-white shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Analyzing Historical Journal Data
                  </h3>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Scanning <span className="font-medium text-indigo-300">{sessions.length} recorded {sessions.length === 1 ? 'reflection' : 'reflections'}</span> for patterns, emotions, and answers.
                </p>
              </div>
            </div>

            {currentQuery && (
              <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200 backdrop-blur-md max-w-full truncate">
                <Search className="h-3 w-3 shrink-0 text-indigo-400" />
                <span className="truncate max-w-[260px]">&ldquo;{currentQuery}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Analysis Pulse Progress Indicators */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-white/[0.03] px-3 py-2 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="text-[11px] font-medium text-indigo-200">1. Retrieving entries</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-white/[0.03] px-3 py-2 animate-pulse" style={{ animationDelay: '300ms' }}>
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span className="text-[11px] font-medium text-purple-200">2. Extracting key themes</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-pink-500/20 bg-white/[0.03] px-3 py-2 animate-pulse" style={{ animationDelay: '600ms' }}>
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              <span className="text-[11px] font-medium text-pink-200">3. Synthesizing citations</span>
            </div>
          </div>

          {/* Pulsing Skeleton Lines & Mock Card Blocks */}
          <div className="mt-5 space-y-3 rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 rounded-full bg-indigo-400/30 animate-pulse" />
              <div className="h-4 w-32 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '150ms' }} />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '100ms' }} />
              <div className="h-3 w-11/12 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '250ms' }} />
              <div className="h-3 w-4/5 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>

            {/* Citation Skeleton Pills */}
            <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/5">
              <div className="h-7 w-36 rounded-xl bg-white/10 animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="h-7 w-44 rounded-xl bg-white/10 animate-pulse" style={{ animationDelay: '350ms' }} />
              <div className="h-7 w-28 rounded-xl bg-white/10 animate-pulse" style={{ animationDelay: '500ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Results / History Stream */}
      <div className="mt-6 flex-1 space-y-6 pb-16">
        {history.length === 0 && !isLoading ? (
          sessions.length === 0 ? (
            /* Empty State: No Journals Yet */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 shadow-xl">
                <BookOpen className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No Journal Entries Found</h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
                Ask My Journal synthesizes answers across your private journal sessions. Start by writing your first reflective dialogue, and return here anytime to uncover insights!
              </p>
              <button
                onClick={onNewJournal}
                className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Start Your First Journal</span>
              </button>
            </div>
          ) : (
            /* Initial Guide */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/20 text-indigo-300">
                <Compass className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">Ready to explore your reflections</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-400 leading-relaxed">
                Click one of the suggested inquiries above or type any question into the search bar to query your private journal history.
              </p>
            </div>
          )
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-white/15 bg-slate-900/80 p-6 sm:p-7 backdrop-blur-2xl shadow-2xl space-y-5"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold text-xs">
                    Q
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {item.question}
                    </h3>
                    <span className="text-[10px] text-slate-400">Asked at {item.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Synthesized Answer */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Journal Synthesis
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1">
                  <Markdown>{item.response.answer}</Markdown>
                </div>
              </div>

              {/* Referenced Journal Entries (Citations) */}
              {item.response.referencedJournals && item.response.referencedJournals.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Referenced Journal Entries ({item.response.referencedJournals.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {item.response.referencedJournals.map((ref) => (
                      <div
                        key={ref.id || ref.title}
                        onClick={() => ref.id && onOpenJournal(ref.id)}
                        className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:border-indigo-400/40 hover:bg-white/10 cursor-pointer shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                              {ref.title}
                            </span>
                            <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-300 transition-colors shrink-0" />
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{ref.date || 'Recorded Session'}</span>
                          </div>
                          {ref.excerpt && (
                            <p className="mt-2 text-[11px] text-slate-300 line-clamp-2 leading-relaxed italic bg-black/20 p-2 rounded-lg border border-white/5">
                              "{ref.excerpt}"
                            </p>
                          )}
                        </div>
                        <span className="mt-2 text-[10px] font-medium text-indigo-300 group-hover:underline">
                          View full journal session →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Insights Pills */}
              {item.response.keyInsights && item.response.keyInsights.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span>Identified Patterns & Insights</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {item.response.keyInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Inquiries */}
              {item.response.suggestedFollowUps && item.response.suggestedFollowUps.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 text-indigo-400" />
                    <span>Explore Further</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {item.response.suggestedFollowUps.map((followUp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAsk(followUp)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-all hover:border-indigo-400/30 active:scale-95"
                      >
                        <span>{followUp}</span>
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
