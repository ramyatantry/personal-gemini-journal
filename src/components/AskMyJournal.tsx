import { useState, useRef, useEffect, FormEvent } from 'react';
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
  Heart,
  ChevronDown,
  ChevronUp
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
  const [showInquiries, setShowInquiries] = useState(true);
  const loadingCardRef = useRef<HTMLDivElement | null>(null);
  const latestResultRef = useRef<HTMLDivElement | null>(null);

  // When synthesis starts, ensure loading card is comfortably in view within main container
  useEffect(() => {
    if (isLoading && loadingCardRef.current) {
      const parentMain = loadingCardRef.current.closest('main');
      if (parentMain) {
        const offset = loadingCardRef.current.offsetTop;
        parentMain.scrollTo({ top: Math.max(0, offset - 100), behavior: 'smooth' });
      }
    }
  }, [isLoading]);

  // When synthesis finishes, gently bring the new result into view within main container
  useEffect(() => {
    if (history.length > 0 && !isLoading && latestResultRef.current) {
      const parentMain = latestResultRef.current.closest('main');
      if (parentMain) {
        const offset = latestResultRef.current.offsetTop;
        parentMain.scrollTo({ top: Math.max(0, offset - 80), behavior: 'smooth' });
      }
    }
  }, [history.length, isLoading]);

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
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-40 lg:px-8">
      {/* Header Banner */}
      <div className="relative shrink-0 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>AI Journal Intelligence</span>
            </div>
            <h1 className="font-editorial mt-1.5 text-2xl font-medium tracking-tight text-white sm:text-3xl">
              Ask My Journal
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 leading-relaxed">
              Explore patterns, recurring concerns, goals, and reflections across your private entries.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="flex flex-col items-end rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Indexed Sanctuary
              </span>
              <span className="text-xs font-bold text-indigo-300">
                {sessions.length} {sessions.length === 1 ? 'Journal Entry' : 'Journal Entries'}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Starter Questions Section */}
        <div className="relative z-10 mt-3.5 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              <span>Suggested Inquiries</span>
            </p>
            <button
              type="button"
              onClick={() => setShowInquiries((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10"
            >
              <span>{showInquiries ? 'Hide suggestions' : 'Show suggestions'}</span>
              {showInquiries ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {showInquiries && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PRESET_QUESTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.question}
                    onClick={() => handleAsk(item.question)}
                    disabled={isLoading}
                    className={`group flex flex-col justify-between rounded-xl border bg-gradient-to-br p-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${item.color} hover:border-white/30 shadow-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {item.label}
                      </span>
                      <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="mt-1 text-xs font-medium text-white line-clamp-2 leading-snug">
                      "{item.question}"
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium opacity-75 group-hover:opacity-100">
                      <span>Ask this</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Query Input Form */}
      <form onSubmit={handleSubmit} className="mt-3.5">
        <div className="relative flex items-center rounded-2xl border border-white/15 bg-white/5 p-1.5 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-indigo-400/50 focus-within:bg-white/10">
          <Search className="ml-3 h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your thoughts, concerns, goals, milestones..."
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-hidden disabled:opacity-50 min-w-0"
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
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shrink-0"
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

      {/* Loading Pulse Animation State - Fully Visible & Never Compressed */}
      {isLoading && (
        <div
          ref={loadingCardRef}
          className="mt-4 w-full shrink-0 min-h-[145px] rounded-2xl border border-indigo-400/40 bg-gradient-to-b from-indigo-950/95 via-slate-900/95 to-purple-950/95 p-4 sm:p-5 backdrop-blur-2xl shadow-2xl relative animate-in fade-in duration-200"
        >
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-purple-500/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Header Status */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-indigo-500/30 opacity-75" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/40 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
                  <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Analyzing Journal Data
                  </h3>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Scanning <span className="font-medium text-indigo-300">{sessions.length} reflections</span> for patterns and citations...
                </p>
              </div>
            </div>

            {currentQuery && (
              <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-200 backdrop-blur-md max-w-full">
                <Search className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="truncate max-w-[260px] sm:max-w-md font-medium">&ldquo;{currentQuery}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Shimmering Progress Bar */}
          <div className="relative z-10 mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-purple-400 to-pink-500 animate-pulse" />
          </div>

          {/* Analysis Pulse Progress Pipeline Indicators */}
          <div className="relative z-10 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
              <span>1. Retrieving entries</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
              <span>2. Extracting themes</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-xs font-medium text-pink-200">
              <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse shrink-0" />
              <span>3. Synthesizing insights</span>
            </div>
          </div>
        </div>
      )}

      {/* Results / History Stream */}
      <div className="mt-6 w-full space-y-6">
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
          history.map((item, idx) => (
            <div
              key={item.id}
              ref={idx === 0 ? latestResultRef : null}
              className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-7 backdrop-blur-2xl shadow-2xl space-y-5"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold text-xs">
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
