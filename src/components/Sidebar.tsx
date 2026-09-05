import { useState, type MouseEvent } from 'react';
import { JournalSession } from '../types';
import {
  Plus,
  Search,
  BookMarked,
  Sparkles,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  MessageSquareQuote,
  Calendar,
  Lock,
  Compass,
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';

interface SidebarProps {
  sessions: JournalSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onTrajectory?: () => void;
  isTrajectoryActive?: boolean;
  onAskJournal?: () => void;
  isAskActive?: boolean;
  onMonthlyReflection?: () => void;
  isMonthlyActive?: boolean;
  onPatterns?: () => void;
  isPatternsActive?: boolean;
  onDeleteSession: (id: string, e: MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onTrajectory,
  isTrajectoryActive,
  onAskJournal,
  isAskActive,
  onMonthlyReflection,
  isMonthlyActive,
  onPatterns,
  isPatternsActive,
  onDeleteSession,
  isOpen,
  onClose,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(query) ||
      session.tags?.some((t) => t.toLowerCase().includes(query)) ||
      session.mood?.toLowerCase().includes(query) ||
      session.messages.some((m) => m.text.toLowerCase().includes(query))
    );
  });

  const totalFinished = sessions.filter((s) => s.status === 'finished').length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-80 h-full shrink-0 flex-col border-r border-white/10 bg-slate-900/95 md:bg-white/[0.03] backdrop-blur-2xl transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Journal Sessions
            </h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-white/10">
              {sessions.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons: Start New, Ask, Monthly Reflection, Patterns */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Start New Journal</span>
          </button>

          {/* AI Intelligence Section Buttons */}
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {onTrajectory && (
              <button
                id="sidebar-trajectory-btn"
                onClick={() => {
                  onTrajectory();
                  onClose();
                }}
                className={`flex w-full items-center justify-start gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-[0.98] border ${
                  isTrajectoryActive
                    ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white border-indigo-400/20 hover:border-indigo-400/40'
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Mood & Energy Trajectory</span>
              </button>
            )}

            {onAskJournal && (
              <button
                onClick={() => {
                  onAskJournal();
                  onClose();
                }}
                className={`flex w-full items-center justify-start gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-[0.98] border ${
                  isAskActive
                    ? 'bg-purple-600 text-white border-purple-400/40 shadow-md shadow-purple-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border-purple-400/20 hover:border-purple-400/40'
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>Ask My Journal</span>
              </button>
            )}

            {onMonthlyReflection && (
              <button
                id="sidebar-monthly-reflection-btn"
                onClick={() => {
                  onMonthlyReflection();
                  onClose();
                }}
                className={`flex w-full items-center justify-start gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-[0.98] border ${
                  isMonthlyActive
                    ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white border-indigo-400/20 hover:border-indigo-400/40'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Monthly Reflection</span>
              </button>
            )}

            {onPatterns && (
              <button
                id="sidebar-patterns-btn"
                onClick={() => {
                  onPatterns();
                  onClose();
                }}
                className={`flex w-full items-center justify-start gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-[0.98] border ${
                  isPatternsActive
                    ? 'bg-cyan-600 text-white border-cyan-400/40 shadow-md shadow-cyan-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white border-cyan-400/20 hover:border-cyan-400/40'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Patterns & Themes</span>
              </button>
            )}
          </div>
        </div>


        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous sessions..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 transition-colors focus:border-indigo-500/50 focus:bg-white/10 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              {sessions.length === 0 ? (
                <>
                  <Lock className="h-7 w-7 text-indigo-400/70" />
                  <p className="mt-2 text-xs font-medium text-slate-300">Private History</p>
                  <p className="mt-1 text-[11px] text-slate-400 max-w-[200px]">
                    Sign in to view and save your ongoing reflective entries.
                  </p>
                </>
              ) : (
                <>
                  <MessageSquareQuote className="h-8 w-8 text-slate-600 stroke-[1.5]" />
                  <p className="mt-2 text-xs font-medium text-slate-400">No sessions found</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {searchQuery ? 'Try a different keyword or tag' : 'Start your first reflective dialogue'}
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isFinished = session.status === 'finished';
              const messageCount = session.messages.length;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group relative flex flex-col gap-1.5 rounded-xl p-3 text-left transition-all cursor-pointer border ${
                    isActive
                      ? 'border-white/20 bg-white/10 shadow-lg shadow-black/20 text-white'
                      : 'border-transparent hover:border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-xs font-semibold leading-snug line-clamp-1 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {session.title || 'Untitled Reflection'}
                    </h3>

                    {/* Delete button on hover */}
                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 rounded"
                      title="Delete Session"
                      aria-label="Delete this session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {session.messages[session.messages.length - 1]?.text || 'No thoughts recorded yet.'}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{session.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isFinished ? (
                        <span className="flex items-center gap-1 text-emerald-300 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Summary Ready</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-indigo-300 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                          <Clock className="h-2.5 w-2.5" />
                          <span>In Progress ({messageCount})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {session.tags && session.tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(tag);
                          }}
                          title={`Filter entries by #${tag}`}
                          className="rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 hover:text-indigo-300 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Stats */}
        <div className="border-t border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Reflections Synthesized</span>
            </div>
            <span className="font-semibold text-white">{totalFinished}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            All journal dialogues remain private within your authenticated session.
          </p>
        </div>
      </aside>
    </>
  );
}
