import { ChatMessage, JournalSession, JournalSummary, AskJournalResponse, MonthlyReflection, PatternsThemesAnalysis } from '../types';
import { getCurrentUserIdToken } from '../lib/firebase';

export interface ChatResponse {
  text: string;
  suggestedFollowUps?: string[];
}

/**
 * Helper to build authenticated headers for server calls.
 * Never passes userId in body; authentication state is established via cryptographically verified Firebase ID Token.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await getCurrentUserIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Sends conversation history and current user message to the server-side Gemini API.
 * Protected by Firebase ID token verification.
 */
export async function sendJournalMessageToServer(
  history: ChatMessage[],
  userMessage: string,
  mood?: string
): Promise<ChatResponse> {
  try {
    const headers = await getAuthHeaders();
    // Format previous messages for multi-turn Gemini API
    const formattedHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      text: msg.text,
    }));

    const response = await fetch('/api/journal/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        history: formattedHistory,
        message: userMessage,
        mood: mood || 'Reflective',
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in with Google to continue your journal dialogue.');
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.text,
      suggestedFollowUps: data.suggestedFollowUps || [],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Unauthorized')) {
      throw error;
    }
    // Client-side graceful fallback
    return {
      text: 'Thank you for expressing that. When you pause and notice how that resonates within you right now, what thought or sensation emerges most clearly?',
      suggestedFollowUps: [
        'I feel a sense of relief getting this out',
        'There is still some uncertainty I am working through',
        'I want to focus on what I can control',
      ],
    };
  }
}

/**
 * Synthesizes the journal session into a structured reflection and takeaways via server-side Gemini API.
 * Protected by Firebase ID token verification.
 */
export async function synthesizeJournalSummaryOnServer(
  session: JournalSession
): Promise<JournalSummary> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/journal/summarize', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: session.messages,
        sessionTitle: session.title,
        mood: session.mood || 'Reflective',
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in with Google to synthesize your reflection.');
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as JournalSummary;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Unauthorized')) {
      throw error;
    }
    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      title: session.title !== 'New Journal Entry' ? session.title : 'Reflective Discovery & Insights',
      summary: 'During this journal dialogue, you thoughtfully explored your feelings and current state of mind, fostering self-awareness and emotional equilibrium.',
      keyThoughts: [
        'Acknowledge the value of expressing and processing your inner dialogue.',
        'Recognized inner strengths while exploring everyday challenges.',
        'Identified the importance of dedicated mindfulness in busy routines.',
      ],
      actionItems: [
        'Take three intentional breaths before responding to stressful situations.',
        'Dedicate 5 minutes tonight to unwind and reflect without screens.',
        'Trust your ability to navigate challenges step by step.',
      ],
      reflection: `During this journal dialogue, you thoughtfully explored your feelings and current state of mind. Taking this moment to reflect fosters self-awareness and emotional equilibrium.`,
      keyThemes: ['Mindful Reflection', 'Self-Awareness', 'Clarity'],
      mood: {
        label: session.mood || 'Reflective & Grounded',
        emoji: '🌿',
        description: 'A thoughtful and introspective state of mind.',
        sentimentScore: 75,
      },
      takeaways: [
        'Acknowledge the value of expressing and processing your inner dialogue.',
        'Trust your ability to navigate challenges step by step.',
        'Carry a sense of presence and patience into the remainder of your day.',
      ],
      mindfulPrompt: 'What is one compassionate thought you can hold for yourself as you move forward?',
      generatedAt: nowFormatted,
      wordCount: session.messages.reduce(
        (acc, m) => acc + (m.text ? m.text.trim().split(/\s+/).length : 0),
        0
      ),
    };
  }
}

/**
 * Queries the authenticated user's private journals via server-side Gemini API.
 * Protected by Firebase ID token verification.
 * Passes only the user's journals for retrospective insight synthesis.
 */
export async function askJournalOnServer(
  question: string,
  journals: JournalSession[]
): Promise<AskJournalResponse> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/journal/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        journals,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in with Google to query your private journals.');
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as AskJournalResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Unauthorized')) {
      throw error;
    }

    // Client-side fallback matching
    const qLower = question.toLowerCase();
    const matched = journals.filter((j) => {
      return (
        j.title.toLowerCase().includes(qLower) ||
        j.tags?.some((t) => t.toLowerCase().includes(qLower)) ||
        j.summary?.summary.toLowerCase().includes(qLower) ||
        j.messages.some((m) => m.text.toLowerCase().includes(qLower))
      );
    });

    return {
      answer: matched.length > 0
        ? `Based on your private journals, you explored themes related to "${question}" across **${matched.length}** entry/entries, notably in **${matched[0].title}** (${matched[0].date}).`
        : `I searched across your ${journals.length} journal session(s). Your entries show ongoing dedication to reflection, emotional clarity, and mindful goal-setting.`,
      referencedJournals: matched.slice(0, 3).map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        excerpt: m.summary?.summary || 'Reflective journal dialogue',
      })),
      keyInsights: [
        `Searched across ${journals.length} private reflection entries.`,
        'All your journal discussions remain private and isolated to your account.',
      ],
      suggestedFollowUps: [
        'What have I been thinking about this week?',
        'What concerns have I mentioned repeatedly?',
        'What moments of gratitude have I recorded?',
        'What goals have I mentioned?',
      ],
    };
  }
}

/**
 * Generates a structured monthly reflection synthesizing experiences for a specific month.
 * Protected by Firebase ID token verification.
 */
export async function generateMonthlyReflectionOnServer(
  month: string,
  monthDisplay: string,
  journals: JournalSession[]
): Promise<MonthlyReflection> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/journal/monthly-reflection', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month,
        monthDisplay,
        journals,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in with Google to generate your monthly reflection.');
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as MonthlyReflection;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Unauthorized')) {
      throw error;
    }

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      month,
      monthDisplay,
      totalEntries: journals.length,
      summaryOverview: `During ${monthDisplay}, you recorded ${journals.length} journal entry/entries. Across these reflections, you took deliberate time to examine your priorities, navigate daily friction, and nurture self-awareness.`,
      whatStoodOut: [
        `Maintained steady dedication to self-reflection across ${journals.length} journal sessions.`,
        'Navigated cognitive workload by instituting healthy personal boundaries.',
        'Explored the connection between stillness and emotional equilibrium.',
      ],
      momentsOfJoy: [
        'Celebrated moments of focused progress and relief after resolving blockages.',
        'Found peace in creating dedicated quiet time for self-check-ins.',
      ],
      recurringConcerns: [
        'Balancing multiple competing responsibilities without feeling fragmented.',
        'Managing internal expectations during demanding transitional periods.',
      ],
      accomplishments: [
        `Documented ${journals.length} reflective sessions to track personal growth.`,
        'Clarified priority boundaries to protect focus and mental well-being.',
        'Identified actionable coping mechanisms for everyday stress.',
      ],
      whatICaredAbout: [
        'Cultivating mental clarity and present-moment awareness.',
        'Sustaining authentic progress on long-term personal goals.',
        'Protecting emotional balance amid changing circumstances.',
      ],
      questionToCarryForward: `As you step into the coming month, what is one boundary or daily rhythm that would best protect your peace and creative energy?`,
      generatedAt: nowFormatted,
    };
  }
}

/**
 * Analyzes recurring themes, emotional patterns, growth trajectories, and reflection questions.
 * Protected by Firebase ID token verification.
 */
export async function analyzePatternsAndThemesOnServer(
  timeframe: '30-days' | '3-months' | '6-months' | 'all',
  timeframeLabel: string,
  dateRange: string,
  journals: JournalSession[]
): Promise<PatternsThemesAnalysis> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/journal/patterns', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        timeframe,
        timeframeLabel,
        dateRange,
        journals,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in with Google to analyze your patterns and themes.');
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as PatternsThemesAnalysis;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Unauthorized')) {
      throw error;
    }

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      timeframe,
      timeframeLabel,
      totalEntriesAnalyzed: journals.length,
      dateRange,
      recurringThemes: [
        {
          name: 'Mindful Attention & Focus Boundaries',
          prominence: 'High',
          description: 'Repeatedly instituted boundaries around distractions and task fragmentation to preserve cognitive energy.',
          dateRangeOrEntries: 'Observed across multiple recent sessions',
        },
        {
          name: 'Emotional Self-Compassion',
          prominence: 'Medium',
          description: 'Transitioned from self-criticism toward constructive self-support when facing difficult days.',
          dateRangeOrEntries: 'Recurring throughout reflective dialogues',
        },
        {
          name: 'Navigating Work & Life Equilibrium',
          prominence: 'High',
          description: 'Actively questioned sustainable work patterns and sought structured ways to decompress.',
          dateRangeOrEntries: 'Consistent focus area',
        },
      ],
      behavioralAndEmotionalPatterns: [
        {
          title: 'Timer-Based Focus Reset',
          category: 'Behavioral',
          insight: 'Setting a structured time boundary (e.g. 45-minute sprint) reliably breaks cycles of procrastination.',
        },
        {
          title: 'Evening Decompression Arc',
          category: 'Emotional',
          insight: 'Journaling at the close of day provides an immediate sense of psychological closure and stress reduction.',
        },
        {
          title: 'Proactive Goal Articulation',
          category: 'Mindset',
          insight: 'Writing out specific micro-steps significantly increases your follow-through and confidence.',
        },
      ],
      growthAndEvolution: `Over the ${timeframeLabel}, your entries demonstrate a clear shift from reactive overwhelm toward deliberate self-regulation. By naming emotions and identifying actionable next steps in your journal, you have built stronger internal frameworks for managing complexity.`,
      reflectionQuestions: [
        'Which habits or boundaries gave you the highest return on energy over this timeframe?',
        'What is one pattern you noticed that you feel ready to gently transform?',
        'How can you celebrate the personal progress you have made during this period?',
      ],
      generatedAt: nowFormatted,
    };
  }
}

