import { useState, useEffect, type MouseEvent } from 'react';
import { ViewMode, JournalSession } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { JournalChat } from './components/JournalChat';
import { AskMyJournal } from './components/AskMyJournal';
import { MonthlyReflection } from './components/MonthlyReflection';
import { PatternsAndThemes } from './components/PatternsAndThemes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import {
  subscribeToUserJournals,
  saveJournalSessionToFirestore,
  deleteJournalSessionFromFirestore,
} from './services/journalFirestoreService';
import { validateFirestoreConnection } from './lib/firebase';
import { Lock, Sparkles, LogIn } from 'lucide-react';

function JournalApp() {
  const { user, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Connection check on boot
  useEffect(() => {
    validateFirestoreConnection();
  }, []);

  // Real-time Firestore subscription to isolated user journals collection: /users/{userId}/journals
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    const unsubscribe = subscribeToUserJournals(
      user.uid,
      (userSessions) => {
        setSessions(userSessions);
        if (userSessions.length > 0) {
          setActiveSessionId((prev) => {
            if (prev && userSessions.some((s) => s.id === prev)) {
              return prev;
            }
            return userSessions[0].id;
          });
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.uid]);

  // Helper to get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Executes a protected journal action or prompts Google Sign-In
  const requireAuthAction = (action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      setPendingAction(() => action);
      setIsAuthModalOpen(true);
    }
  };

  // Start a new journal session (Persisted directly to /users/{userId}/journals/{journalId})
  const handleStartNewJournal = async (customStarterPrompt?: string) => {
    requireAuthAction(async () => {
      if (!user?.uid) return;

      const now = new Date();
      const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newSessionId = `session-${Date.now()}`;
      const userFirstName = user.displayName ? ` ${user.displayName.split(' ')[0]}` : '';
      const initialGreeting = customStarterPrompt
        ? `I am here with you${userFirstName}. Let’s explore this together. What thoughts or feelings come to mind first?`
        : `Welcome to your private sanctuary${userFirstName}. Take a gentle breath. What is alive in your mind and heart right now?`;

      const newSession: JournalSession = {
        id: newSessionId,
        title: customStarterPrompt ? `${customStarterPrompt.slice(0, 32)}...` : 'New Journal Entry',
        date: dateFormatted,
        time: timeFormatted,
        status: 'in-progress',
        mood: 'Reflective',
        tags: ['Personal', 'Daily'],
        messages: [
          {
            id: `m-init-${Date.now()}`,
            sender: 'gemini',
            text: initialGreeting,
            timestamp: timeFormatted,
            suggestedFollowUps: customStarterPrompt
              ? [customStarterPrompt]
              : [
                  'I had a busy day and need to unpack my thoughts',
                  'I want to reflect on a specific challenge I faced',
                  'I am feeling grateful and want to record my wins',
                ],
          },
        ],
        summary: null,
      };

      try {
        await saveJournalSessionToFirestore(user.uid, newSession);
        setActiveSessionId(newSessionId);
        setCurrentView('journal');
      } catch (err) {
        console.error('Failed to create journal in Firestore:', err);
        // Fallback local update
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSessionId);
        setCurrentView('journal');
      }
    });
  };

  // Select an existing session (Protected)
  const handleSelectSession = (id: string) => {
    requireAuthAction(() => {
      setActiveSessionId(id);
      setCurrentView('journal');
    });
  };

  // Delete a session from Firestore (/users/{userId}/journals/{journalId})
  const handleDeleteSession = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (user?.uid) {
      try {
        await deleteJournalSessionFromFirestore(user.uid, id);
      } catch (err) {
        console.error('Failed to delete journal from Firestore:', err);
      }
    }

    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);

    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        setActiveSessionId(null);
        setCurrentView('landing');
      }
    }
  };

  // Update session state & persist to Firestore
  const handleUpdateSession = async (updated: JournalSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (user?.uid) {
      try {
        await saveJournalSessionToFirestore(user.uid, updated);
      } catch (err) {
        console.error('Failed to update journal session in Firestore:', err);
      }
    }
  };

  const handleAuthSuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Ambient Glowing Orbs */}
      <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[45%] w-[45%] rounded-full bg-indigo-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[55%] w-[55%] rounded-full bg-purple-600/20 blur-[160px]" />
      <div className="pointer-events-none absolute top-[35%] right-[25%] h-[35%] w-[35%] rounded-full bg-blue-600/10 blur-[140px]" />

      {/* Top Application Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if ((view === 'journal' || view === 'ask' || view === 'monthly-reflection' || view === 'patterns') && !isAuthenticated) {
            requireAuthAction(() => setCurrentView(view));
          } else {
            setCurrentView(view);
          }
        }}
        onNewJournal={() => handleStartNewJournal()}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeSessionTitle={currentView === 'journal' && isAuthenticated ? activeSession?.title : undefined}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar - only rendered when authenticated */}
        {isAuthenticated && (
          <Sidebar
            sessions={sessions}
            activeSessionId={currentView === 'journal' ? activeSessionId : null}
            onSelectSession={handleSelectSession}
            onNewSession={() => handleStartNewJournal()}
            onAskJournal={() => setCurrentView('ask')}
            isAskActive={currentView === 'ask'}
            onMonthlyReflection={() => setCurrentView('monthly-reflection')}
            isMonthlyActive={currentView === 'monthly-reflection'}
            onPatterns={() => setCurrentView('patterns')}
            isPatternsActive={currentView === 'patterns'}
            onDeleteSession={handleDeleteSession}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Dynamic Body Content: Landing View, Ask My Journal, Monthly Reflection, Patterns & Themes, or Protected Journal Workspace */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-transparent">
          {currentView === 'landing' ? (
            <LandingPage
              onStartJournal={(prompt) => handleStartNewJournal(prompt)}
              onExploreSession={(id) => handleSelectSession(id)}
              onAskJournal={() => requireAuthAction(() => setCurrentView('ask'))}
              onMonthlyReflection={() => requireAuthAction(() => setCurrentView('monthly-reflection'))}
              onPatterns={() => requireAuthAction(() => setCurrentView('patterns'))}
            />
          ) : !isAuthenticated ? (
            /* Protected Gatekeeper View for Unauthenticated Users */
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 shadow-xl shadow-indigo-500/10 backdrop-blur-xl">
                <Lock className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="font-editorial mt-5 text-2xl font-medium text-white sm:text-3xl">
                Authentication Required
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                Your journal entries, questions, and reflective dialogues are strictly private. Please sign in with your Google account to access your sanctuary.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-6 flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-600/25 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In with Google</span>
              </button>
            </div>
          ) : currentView === 'ask' ? (
            /* Ask My Journal View */
            <AskMyJournal
              sessions={sessions}
              onOpenJournal={(id) => handleSelectSession(id)}
              onNewJournal={() => handleStartNewJournal()}
            />
          ) : currentView === 'monthly-reflection' ? (
            /* Monthly Reflection View */
            <MonthlyReflection
              sessions={sessions}
              onOpenJournal={(id) => handleSelectSession(id)}
              onNewJournal={() => handleStartNewJournal()}
            />
          ) : currentView === 'patterns' ? (
            /* Patterns & Themes View */
            <PatternsAndThemes
              sessions={sessions}
              onOpenJournal={(id) => handleSelectSession(id)}
              onNewJournalWithPrompt={(prompt) => handleStartNewJournal(prompt)}
            />
          ) : activeSession ? (
            /* Active Journal Chat View */
            <div key={activeSession.id} className="h-full flex flex-col">
              <JournalChat
                session={activeSession}
                onUpdateSession={handleUpdateSession}
                onFinishJournal={() => {}}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="mt-3 text-sm text-slate-300">No active journal session found.</p>
              <button
                onClick={() => handleStartNewJournal()}
                className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all active:scale-95"
              >
                Start a New Journal
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Firebase Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <JournalApp />
    </AuthProvider>
  );
}
