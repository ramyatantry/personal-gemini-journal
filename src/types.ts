export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

export interface JournalSummary {
  title?: string;
  summary: string;
  keyThoughts: string[];
  actionItems: string[];
  reflection: string;
  keyThemes: string[];
  mood: {
    label: string;
    emoji: string;
    description: string;
    sentimentScore: number; // 0 to 100
  };
  takeaways: string[];
  mindfulPrompt: string;
  generatedAt: string;
  wordCount: number;
}

export interface JournalSession {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'in-progress' | 'finished';
  mood?: string;
  messages: ChatMessage[];
  summary?: JournalSummary | null;
  tags?: string[];
}

export interface AskJournalReference {
  id: string;
  title: string;
  date: string;
  excerpt?: string;
}

export interface AskJournalResponse {
  answer: string;
  referencedJournals: AskJournalReference[];
  keyInsights: string[];
  suggestedFollowUps: string[];
}

export interface AskJournalHistoryItem {
  id: string;
  question: string;
  response: AskJournalResponse;
  timestamp: string;
}

export interface MonthlyReflection {
  month: string; // e.g. "2026-08"
  monthDisplay: string; // e.g. "August 2026"
  totalEntries: number;
  summaryOverview?: string;
  whatStoodOut: string[];
  momentsOfJoy: string[];
  recurringConcerns: string[];
  accomplishments: string[];
  whatICaredAbout: string[];
  questionToCarryForward: string;
  generatedAt: string;
}

export interface ThemeItem {
  name: string;
  prominence: 'High' | 'Medium' | 'Emerging' | string;
  description: string;
  dateRangeOrEntries?: string;
}

export interface PatternItem {
  title: string;
  category: 'Emotional' | 'Behavioral' | 'Habit' | 'Mindset' | string;
  insight: string;
}

export interface PatternsThemesAnalysis {
  timeframe: '30-days' | '3-months' | '6-months' | 'all';
  timeframeLabel: string;
  totalEntriesAnalyzed: number;
  dateRange: string;
  recurringThemes: ThemeItem[];
  behavioralAndEmotionalPatterns: PatternItem[];
  growthAndEvolution: string;
  reflectionQuestions: string[];
  generatedAt: string;
}

export type ViewMode = 'landing' | 'journal' | 'ask' | 'monthly-reflection' | 'patterns';

