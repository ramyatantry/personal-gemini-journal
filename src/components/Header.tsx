import { useState } from 'react';
import { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Sparkles,
  Plus,
  Lock,
  Menu,
  LogIn,
  LogOut,
  User as UserIcon,
  Compass,
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onNewJournal: () => void;
  onOpenAuthModal: () => void;
  activeSessionTitle?: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({
  currentView,
  onNavigate,
  onNewJournal,
  onOpenAuthModal,
  activeSessionTitle,
  onToggleSidebar,
}: HeaderProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="shrink-0 w-full z-30 flex items-center justify-between border-b border-white/10 bg-slate-900/70 px-4 py-2.5 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          title="Toggle Sidebar"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => onNavigate('landing')}
          className="group flex items-center gap-2.5 text-left shrink-0"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4 text-indigo-100" />
          </div>
          <div>
            <span className="font-semibold text-base sm:text-lg tracking-tight text-white group-hover:text-indigo-200 transition-colors inline-block leading-normal whitespace-nowrap">
              Personal Gemini Journal
            </span>
          </div>
        </button>
      </div>

      {currentView === 'journal' && activeSessionTitle && (
        <div className="hidden items-center gap-2 xl:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
          <span className="max-w-[200px] truncate text-xs font-medium text-slate-300 whitespace-nowrap">
            {activeSessionTitle}
          </span>
        </div>
      )}

      {currentView === 'ask' && (
        <div className="hidden items-center gap-2 xl:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-medium text-purple-200 whitespace-nowrap">
            Ask My Journal
          </span>
        </div>
      )}

      {currentView === 'monthly-reflection' && (
        <div className="hidden items-center gap-2 xl:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-medium text-indigo-200 whitespace-nowrap">
            Monthly Reflection
          </span>
        </div>
      )}

      {currentView === 'patterns' && (
        <div className="hidden items-center gap-2 xl:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-medium text-cyan-200 whitespace-nowrap">
            Patterns & Themes
          </span>
        </div>
      )}

      {currentView === 'trajectory' && (
        <div className="hidden items-center gap-2 xl:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-medium text-indigo-200 whitespace-nowrap">
            Mood & Energy Trajectory
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 2xl:flex backdrop-blur-md shrink-0">
          <Lock className="h-3 w-3 text-indigo-400" />
          <span>Private Sanctuary</span>
        </div>

        {currentView !== 'landing' && (
          <button
            onClick={() => onNavigate('landing')}
            className="hidden xl:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white shrink-0 whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>About</span>
          </button>
        )}

        {/* Quick Nav for authenticated users */}
        {isAuthenticated && (
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <button
              id="header-trajectory-btn"
              onClick={() => onNavigate('trajectory')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 border shrink-0 whitespace-nowrap ${
                currentView === 'trajectory'
                  ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/50'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:text-white'
              }`}
              title="View Mood & Energy Trajectory"
            >
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span>Trajectory</span>
            </button>

            <button
              id="header-monthly-reflection-btn"
              onClick={() => onNavigate('monthly-reflection')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 border shrink-0 whitespace-nowrap ${
                currentView === 'monthly-reflection'
                  ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/50'
                  : 'bg-white/5 hover:bg-white/10 text-indigo-200 border-white/10'
              }`}
              title="View Monthly Reflection"
            >
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>Monthly</span>
            </button>

            <button
              id="header-patterns-btn"
              onClick={() => onNavigate('patterns')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 border shrink-0 whitespace-nowrap ${
                currentView === 'patterns'
                  ? 'bg-cyan-600 text-white border-cyan-400/40 shadow-md shadow-cyan-600/25 ring-1 ring-cyan-400/50'
                  : 'bg-white/5 hover:bg-white/10 text-cyan-200 border-white/10'
              }`}
              title="Analyze Patterns & Themes"
            >
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span>Patterns</span>
            </button>

            <button
              id="header-ask-btn"
              onClick={() => onNavigate('ask')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 border shrink-0 whitespace-nowrap ${
                currentView === 'ask'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/25 border-purple-400/40 ring-1 ring-purple-400/50'
                  : 'bg-white/5 hover:bg-white/10 text-purple-200 border-white/10'
              }`}
              title="Ask questions across your journal"
            >
              <Compass className="h-3.5 w-3.5 text-purple-400" />
              <span>Ask</span>
            </button>
          </div>
        )}

        {/* Start Journal button */}
        <button
          onClick={onNewJournal}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all active:scale-95 shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">New Journal</span>
        </button>

        {/* Firebase Authentication UI */}
        {isAuthenticated && user ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 pr-2.5 text-xs font-medium text-slate-200 backdrop-blur-md hover:bg-white/10 transition shrink-0 whitespace-nowrap"
              title={`Signed in as ${user.displayName || user.email}`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-lg object-cover border border-white/15 shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 font-semibold text-xs">
                  {user.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                </div>
              )}
              <span className="hidden sm:inline max-w-[130px] truncate text-slate-200 text-xs font-medium">
                {user.displayName || user.email?.split('@')[0] || 'Account'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.displayName || 'Journal Author'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email || user.uid}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('monthly-reflection');
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/10 transition"
                  >
                    <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                    <span>Monthly Reflection</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('patterns');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10 transition"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Patterns & Themes</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('ask');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-purple-200 hover:bg-purple-500/10 transition"
                  >
                    <Compass className="h-3.5 w-3.5 text-purple-300" />
                    <span>Ask My Journal</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowUserMenu(false);
                      await signOut();
                      onNavigate('landing');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition border-t border-white/5 mt-1 pt-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:bg-white/15 hover:border-white/30 transition active:scale-95"
          >
            <LogIn className="h-3.5 w-3.5 text-indigo-300" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

