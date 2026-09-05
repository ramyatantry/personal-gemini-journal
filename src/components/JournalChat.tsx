import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ChatMessage, JournalSession } from '../types';
import {
  Send,
  Sparkles,
  User,
  CheckCircle2,
  Edit3,
  Check,
  ChevronDown,
  RotateCcw,
  BookOpen,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { JournalSummaryArea } from './JournalSummaryArea';
import { sendJournalMessageToServer, synthesizeJournalSummaryOnServer } from '../services/geminiService';

interface JournalChatProps {
  session: JournalSession;
  onUpdateSession: (updated: JournalSession) => void;
  onFinishJournal: () => void;
  onViewTrajectory?: () => void;
}

const MOOD_OPTIONS = [
  { label: 'Calm & Grounded', emoji: '🌿' },
  { label: 'Reflective', emoji: '✨' },
  { label: 'Grateful', emoji: '☀️' },
  { label: 'Wrestled / Anxious', emoji: '🌊' },
  { label: 'Energized', emoji: '🔥' },
  { label: 'Tired / Unwinding', emoji: '🌙' },
];

export function JournalChat({
  session,
  onUpdateSession,
  onFinishJournal,
  onViewTrajectory,
}: JournalChatProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(session.title);
  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>(
    session.status === 'finished' && session.summary ? 'summary' : 'chat'
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync tempTitle if session changes
  useEffect(() => {
    setTempTitle(session.title);
    if (session.status === 'finished' && session.summary) {
      setActiveTab('summary');
    }
  }, [session.id, session.title, session.status, session.summary]);

  // Scroll to bottom of inner chat container only without affecting outer main container
  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [session.messages, isTyping, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...session.messages, userMsg];

    // If this is the first user message and title is default, generate a relevant title
    let newTitle = session.title;
    if (session.title === 'New Journal Entry' && text.length > 5) {
      newTitle = text.slice(0, 38) + (text.length > 38 ? '...' : '');
    }

    const currentMood = session.mood;

    onUpdateSession({
      ...session,
      title: newTitle,
      messages: updatedMessages,
      status: 'in-progress'
    });

    setInputText('');
    setIsTyping(true);

    try {
      // Send conversation history to server-side Gemini multi-turn endpoint
      const geminiReply = await sendJournalMessageToServer(
        session.messages, // previous turns
        text,             // current turn
        currentMood
      );

      const botMsg: ChatMessage = {
        id: `msg-gemini-${Date.now()}`,
        sender: 'gemini',
        text: geminiReply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: geminiReply.suggestedFollowUps
      };

      onUpdateSession({
        ...session,
        title: newTitle,
        messages: [...updatedMessages, botMsg],
        status: 'in-progress'
      });
    } catch {
      // Safe fallback if unexpected error occurs
      const fallbackMsg: ChatMessage = {
        id: `msg-gemini-${Date.now()}`,
        sender: 'gemini',
        text: 'I hear you. As you sit with this reflection, what is one kind question you would ask yourself right now?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: [
          'How can I approach this with more patience?',
          'What feels most important to resolve?',
          'I am taking a deep breath and letting this settle'
        ]
      };

      onUpdateSession({
        ...session,
        title: newTitle,
        messages: [...updatedMessages, fallbackMsg],
        status: 'in-progress'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateSession({
        ...session,
        title: tempTitle.trim()
      });
    }
    setIsEditingTitle(false);
  };

  const handleMoodSelect = (moodLabel: string) => {
    onUpdateSession({
      ...session,
      mood: moodLabel
    });
  };

  const triggerFinishJournal = async () => {
    setIsGeneratingSummary(true);
    setActiveTab('summary');

    try {
      const generatedSummary = await synthesizeJournalSummaryOnServer(session);
      
      // Determine new title: prefer evocative generated title if present
      const newTitle = generatedSummary.title && (session.title === 'New Journal Entry' || session.title.length < 8)
        ? generatedSummary.title
        : (generatedSummary.title || session.title);

      const updatedSession: JournalSession = {
        ...session,
        title: newTitle,
        status: 'finished',
        summary: generatedSummary,
      };

      onUpdateSession(updatedSession);
      onFinishJournal();
    } catch {
      // In case of error, synthesizeJournalSummaryOnServer returns fallback summary
      // Safeguard session to preserve all messages and finish cleanly
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const userMessageCount = session.messages.filter((m) => m.sender === 'user').length;

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Session Top Bar */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Title & Date */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full max-w-md rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-white focus:border-indigo-400 focus:outline-hidden"
                />
                <button
                  onClick={handleSaveTitle}
                  className="rounded-xl bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="font-editorial text-lg sm:text-xl font-medium tracking-tight text-white cursor-pointer hover:text-indigo-200 truncate"
                  title="Click to rename entry"
                >
                  {session.title}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                  title="Rename"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{session.date} • {session.time}</span>
              <span>•</span>
              {/* Mood Selector Dropdown */}
              <div className="relative inline-block text-left">
                <select
                  value={session.mood || 'Reflective'}
                  onChange={(e) => handleMoodSelect(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 py-0.5 pl-2 pr-6 text-[11px] font-medium text-slate-200 focus:border-indigo-400 focus:outline-hidden backdrop-blur-md cursor-pointer"
                >
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m.label} value={m.label} className="bg-slate-900 text-slate-200">
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action / View Toggle and Finish Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* View Switcher Tabs */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs font-medium backdrop-blur-md">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white/15 text-white shadow-md border border-white/10 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Dialogue</span>
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                  activeTab === 'summary'
                    ? 'bg-white/15 text-white shadow-md border border-white/10 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                <span>Summary</span>
                {session.status === 'finished' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Finish Journal Button */}
            {session.status !== 'finished' ? (
              <button
                onClick={triggerFinishJournal}
                disabled={session.messages.length === 0}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-lg transition-all ${
                  session.messages.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border border-indigo-400/30 hover:scale-[1.02] active:scale-95'
                    : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                }`}
                title={session.messages.length === 0 ? 'Type a reflection first' : 'Synthesize and finish journal'}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>Finish Journal</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Finished</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          {activeTab === 'summary' ? (
            /* Summary View Area */
            <div className="space-y-6">
              <JournalSummaryArea
                summary={session.summary}
                sessionTitle={session.title}
                isGenerating={isGeneratingSummary}
                onContinueJournaling={() => setActiveTab('chat')}
                onFinishJournal={triggerFinishJournal}
                onViewTrajectory={onViewTrajectory}
                hasMessages={session.messages.length > 0}
              />
            </div>
          ) : (
            /* Multi-turn Chat Conversation Area */
            <div className="space-y-6">
              {/* Privacy Notice Banner */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-4 py-2.5 text-center text-xs text-slate-400">
                <span className="font-medium text-slate-200">Gentle Reminder:</span> This is a private space to explore your inner landscape. Take all the time you need.
              </div>

              {/* Message List */}
              <div className="space-y-5">
                {session.messages.map((msg) => {
                  const isUser = msg.sender === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-400">
                        {isUser ? (
                          <>
                            <span>You</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 font-medium text-indigo-300">
                              <Sparkles className="h-3 w-3 text-indigo-400" />
                              Gemini Guide
                            </span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`relative max-w-[88%] rounded-2xl p-4 sm:max-w-[80%] text-sm leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600/25 border border-indigo-500/30 text-white rounded-tr-xs shadow-lg shadow-indigo-950/40'
                            : 'border border-white/10 bg-white/5 backdrop-blur-xl text-slate-200 rounded-tl-xs shadow-xl font-editorial text-[15px]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      {/* Suggested reflective follow-ups if present */}
                      {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && session.status !== 'finished' && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-1 max-w-[85%]">
                          {msg.suggestedFollowUps.map((suggestion, idx) => {
                            const isStarterPrompt = suggestion.includes('...') || suggestion.endsWith('…');
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (isStarterPrompt) {
                                    // If it's a sentence starter with ellipses, put it in input and focus
                                    const starterText = suggestion.replace(/\.\.\.$|…$/, ' ');
                                    setInputText(starterText);
                                    if (textareaRef.current) {
                                      textareaRef.current.focus();
                                      const len = starterText.length;
                                      textareaRef.current.setSelectionRange(len, len);
                                    }
                                  } else {
                                    // Complete sentence: send directly
                                    handleSendMessage(suggestion);
                                  }
                                }}
                                title={isStarterPrompt ? 'Click to complete this thought in your message box' : 'Click to send response'}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1 text-xs text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/15 hover:text-white active:scale-95 shadow-md"
                              >
                                {isStarterPrompt && <Edit3 className="h-3 w-3 text-indigo-400/80 shrink-0" />}
                                <span>&ldquo;{suggestion}&rdquo;</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-indigo-300">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        Gemini Guide
                      </span>
                      <span>•</span>
                      <span>Reflecting...</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-xs border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 shadow-xl">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]"></div>
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]"></div>
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* End of conversation finish prompt if user has shared thoughts */}
              {session.status !== 'finished' && userMessageCount >= 2 && (
                <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-center shadow-lg">
                  <p className="text-xs text-slate-300">
                    Ready to draw meaningful insights from this dialogue?
                  </p>
                  <button
                    onClick={triggerFinishJournal}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition hover:scale-[1.02] active:scale-95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Finish Journal & Synthesize</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Input Bar (Only visible in chat mode when not finished) */}
      {activeTab === 'chat' && (
        <div className="border-t border-white/10 bg-slate-900/50 backdrop-blur-2xl p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {session.status === 'finished' ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>This journal session has been finished and synthesized.</span>
                </div>
                <button
                  onClick={() => {
                    onUpdateSession({ ...session, status: 'in-progress' });
                  }}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 transition"
                >
                  Continue Adding Thoughts
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share what is on your mind... (Press Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
                />

                <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[11px] sm:inline">
                      Press <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 border border-white/10">Enter</kbd> to reflect
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() || isTyping}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                        inputText.trim() && !isTyping
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 border border-indigo-400/30'
                          : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                      }`}
                      title="Send message"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
