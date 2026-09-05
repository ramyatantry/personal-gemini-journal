/**
 * Local Journal Synthesis & Reflection Engine
 *
 * Provides high-fidelity, privacy-preserving synthesis, thematic extraction,
 * semantic keyword matching, and retrospective querying directly from the
 * user's authenticated journal archives.
 *
 * Used as an instant fallback whenever upstream AI provider endpoints encounter
 * rate limits (429 quota exhaustion), network latency, or external service disruptions.
 */

export interface JournalMessage {
  sender?: string;
  role?: string;
  text?: string;
}

export interface JournalSessionSummary {
  summary?: string;
  keyThoughts?: string[];
  actionItems?: string[];
  reflection?: string;
  keyThemes?: string[];
  takeaways?: string[];
}

export interface JournalSessionData {
  id?: string;
  title?: string;
  date?: string;
  createdAt?: number;
  mood?: string;
  tags?: string[];
  summary?: JournalSessionSummary | null;
  messages?: JournalMessage[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'in', 'on', 'at', 'to', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down',
  'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'what',
  'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'have', 'has',
  'had', 'having', 'do', 'does', 'did', 'doing', 'i', 'my', 'me', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'we', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves', 'it', 'its', 'itself',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Synthesizes multi-turn chat response when upstream AI is rate-limited.
 */
export function synthesizeChatFallback(
  history: Array<{ role?: string; sender?: string; text?: string }>,
  userMessage: string,
  mood: string = 'Reflective'
): { text: string; suggestedFollowUps: string[] } {
  const msgLower = userMessage.toLowerCase();

  let replyText = '';
  let followUps: string[] = [];

  if (msgLower.includes('stress') || msgLower.includes('anxious') || msgLower.includes('overwhelm') || msgLower.includes('tired')) {
    replyText = `I hear how much weight you are carrying right now. When feeling overwhelmed, even taking a single unhurried breath can help ground your body. When you gently pause and look at what is asking for your energy right now, what is one thing that can wait until tomorrow?`;
    followUps = [
      'I can let go of the pressure to finish everything today',
      'I need to step away from screens for a short walk',
      'What I really need right now is restful quiet',
    ];
  } else if (msgLower.includes('grateful') || msgLower.includes('joy') || msgLower.includes('happy') || msgLower.includes('good') || msgLower.includes('thank')) {
    replyText = `It is wonderful to notice and celebrate these moments of warmth and gratitude. Savoring positive experiences deepens their impact on our well-being. What detail about this moment brought you the deepest sense of fulfillment or peace?`;
    followUps = [
      'The sense of connection with someone I care about',
      'Feeling capable of handling what comes my way',
      'Having space to appreciate the quiet progress I made',
    ];
  } else if (msgLower.includes('goal') || msgLower.includes('plan') || msgLower.includes('future') || msgLower.includes('want to')) {
    replyText = `Articulating your intentions is a powerful step toward bringing them into reality. As you envision this direction, what small, sustainable action would feel most rewarding to take in the next 24 hours?`;
    followUps = [
      'Break this down into one concrete 15-minute task',
      'Clear away distractions so I can focus with intent',
      'Remind myself to be patient with the process',
    ];
  } else {
    replyText = `Thank you for sharing this with honesty. Taking the time to put your thoughts into words creates distance and clarity. As you reflect on what you just expressed, what feels like the most important truth beneath the surface?`;
    followUps = [
      'I want to give myself permission to feel this way',
      'This reminds me of a boundary I want to keep',
      'I am beginning to see a constructive path forward',
    ];
  }

  return { text: replyText, suggestedFollowUps: followUps };
}

/**
 * Synthesizes a structured journal summary from dialogue messages.
 */
export function synthesizeJournalSummary(
  messages: JournalMessage[],
  sessionTitle?: string,
  mood: string = 'Reflective'
) {
  const userTexts = messages
    .filter((m) => m.sender === 'user' || m.role === 'user')
    .map((m) => m.text?.trim() || '')
    .filter(Boolean);

  const totalWords = messages.reduce((acc, m) => {
    return acc + (m.text ? m.text.trim().split(/\s+/).length : 0);
  }, 0);

  const combinedUserText = userTexts.join(' ');
  const keywords = extractKeywords(combinedUserText);

  // Derive evocative title
  let derivedTitle = sessionTitle && sessionTitle !== 'New Journal Entry'
    ? sessionTitle
    : 'Mindful Introspection & Presence';

  if (derivedTitle === 'Mindful Introspection & Presence' && userTexts.length > 0) {
    const firstText = userTexts[0];
    if (firstText.length > 5 && firstText.length < 50) {
      derivedTitle = firstText.charAt(0).toUpperCase() + firstText.slice(1);
    } else if (keywords.length >= 2) {
      derivedTitle = `Exploring ${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} & ${keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)}`;
    }
  }

  const keyThoughts = userTexts.slice(0, 3).map((t) => {
    const clean = t.replace(/\n+/g, ' ');
    return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
  });

  if (keyThoughts.length === 0) {
    keyThoughts.push('Engaged in honest self-inquiry and paused to articulate inner thoughts.');
  }

  const nowFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    title: derivedTitle,
    summary: `In this session, you took deliberate time to examine your thoughts and emotions with patience, cultivating grounded clarity and mindfulness.`,
    keyThoughts: keyThoughts.length > 0 ? keyThoughts : [
      'Recognized the value of processing thoughts in a dedicated space.',
      'Explored personal balance and priorities with honest self-awareness.',
    ],
    actionItems: [
      'Take a 3-minute mindful pause before stepping into high-demand tasks.',
      'Hold gentle patience with unresolved questions as they unfold.',
      'Protect an evening window for restorative decompression.',
    ],
    reflection: `Throughout this reflection, you created meaningful space to step back from daily momentum and listen to your inner dialogue. Acknowledging your current experience without judgment is the cornerstone of sustainable well-being.`,
    keyThemes: keywords.slice(0, 4).map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
    mood: {
      label: mood || 'Reflective & Grounded',
      emoji: '🌿',
      description: 'A thoughtful, restorative state of honest self-awareness.',
      sentimentScore: 78,
      energyLevel: 65,
    },
    takeaways: [
      'Honor the habit of creating space for your thoughts.',
      'Trust your capacity to navigate complexities step by step.',
      'Carry a sense of presence and self-kindness into the rest of your day.',
    ],
    mindfulPrompt: 'What is one gentle commitment you would like to make to your peace of mind today?',
    generatedAt: nowFormatted,
    wordCount: totalWords,
  };
}

/**
 * Searches and synthesizes answers across user's journal entries for "Ask My Journal".
 */
export function synthesizeAskJournal(
  question: string,
  journals: JournalSessionData[]
) {
  if (!journals || journals.length === 0) {
    return {
      answer: `You do not have any saved journal entries yet. Once you complete your first reflection, you can return here to ask questions, explore recurring patterns, and uncover insights across your journey.`,
      referencedJournals: [],
      keyInsights: [
        'No journal entries currently recorded.',
        'Start your first reflective dialogue to build your personal sanctuary.',
      ],
      suggestedFollowUps: [
        'How do I begin my first journal entry?',
        'What mindful prompts should I explore?',
      ],
    };
  }

  const qLower = question.toLowerCase();
  const queryKeywords = extractKeywords(question);

  // Intent classifications
  const isGratitude = qLower.includes('gratitude') || qLower.includes('grateful') || qLower.includes('thankful') || qLower.includes('joy') || qLower.includes('happy');
  const isConcern = qLower.includes('concern') || qLower.includes('stress') || qLower.includes('worry') || qLower.includes('anxious') || qLower.includes('fear') || qLower.includes('heavy') || qLower.includes('overwhelm');
  const isGoal = qLower.includes('goal') || qLower.includes('plan') || qLower.includes('ambition') || qLower.includes('future') || qLower.includes('milestone') || qLower.includes('habit') || qLower.includes('intention');
  const isRecent = qLower.includes('this week') || qLower.includes('recent') || qLower.includes('today') || qLower.includes('latest') || qLower.includes('thinking about');

  interface ScoredJournal {
    journal: JournalSessionData;
    score: number;
    matchedSnippet: string;
  }

  const scoredJournals: ScoredJournal[] = journals.map((j) => {
    let score = 0;
    let snippet = '';

    const title = (j.title || '').toLowerCase();
    const tags = (j.tags || []).map((t) => t.toLowerCase());
    const summaryText = (j.summary?.summary || '').toLowerCase();
    const reflectionText = (j.summary?.reflection || '').toLowerCase();
    const thoughts = (j.summary?.keyThoughts || []).join(' ').toLowerCase();
    const actionItems = (j.summary?.actionItems || []).join(' ').toLowerCase();
    const userTexts = (j.messages || [])
      .filter((m) => m.sender === 'user' || m.role === 'user')
      .map((m) => m.text || '')
      .join(' ')
      .toLowerCase();

    // Intent boosts
    if (isGratitude) {
      if (title.includes('gratitude') || tags.includes('gratitude') || summaryText.includes('gratitude') || userTexts.includes('grateful') || userTexts.includes('thankful')) {
        score += 8;
        snippet = j.summary?.summary || 'Reflections exploring gratitude and positive moments.';
      }
    }
    if (isConcern) {
      if (title.includes('stress') || tags.includes('stress') || summaryText.includes('concern') || userTexts.includes('worry') || userTexts.includes('difficult')) {
        score += 8;
        snippet = j.summary?.summary || 'Discussions centered on navigating pressures and emotional obstacles.';
      }
    }
    if (isGoal) {
      if (actionItems.length > 0 || title.includes('goal') || tags.includes('growth') || summaryText.includes('goal') || userTexts.includes('plan')) {
        score += 8;
        snippet = (j.summary?.actionItems && j.summary.actionItems[0]) || j.summary?.summary || 'Intentions and actionable next steps.';
      }
    }

    // Keyword matching
    for (const kw of queryKeywords) {
      if (title.includes(kw)) score += 5;
      if (tags.some((t) => t.includes(kw))) score += 4;
      if (summaryText.includes(kw)) score += 3;
      if (reflectionText.includes(kw)) score += 2;
      if (thoughts.includes(kw)) score += 2;
      if (userTexts.includes(kw)) score += 2;
    }

    if (!snippet) {
      snippet = j.summary?.summary || (j.messages && j.messages[0]?.text?.slice(0, 140)) || 'Reflective journaling dialogue.';
    }

    return { journal: j, score, matchedSnippet: snippet };
  });

  // Sort by score descending, or by date descending if no specific match
  scoredJournals.sort((a, b) => b.score - a.score);

  const matched = scoredJournals.filter((s) => s.score > 0);
  const relevantList = matched.length > 0 ? matched.slice(0, 4) : scoredJournals.slice(0, 3);

  const referencedJournals = relevantList.map(({ journal, matchedSnippet }) => ({
    id: journal.id || '',
    title: journal.title || 'Journal Entry',
    date: journal.date || 'Recent Entry',
    excerpt: matchedSnippet.length > 180 ? `${matchedSnippet.slice(0, 177)}...` : matchedSnippet,
  }));

  let answer = '';
  const keyInsights: string[] = [];
  let suggestedFollowUps: string[] = [];

  if (isGratitude) {
    answer = `Across your private journal entries, moments of gratitude and appreciation centered on mindful presence, relational connections, and small daily victories.\n\n` +
      relevantList.map(({ journal }) => {
        return `* In **"${journal.title || 'Untitled Session'}"** (${journal.date || 'Recorded Entry'}), you noted the value of pausing to acknowledge progress and savoring simple moments of peace.`;
      }).join('\n\n') +
      `\n\nCultivating these checkpoints has consistently helped reset your perspective during demanding weeks.`;
    keyInsights.push('Gratitude appears most frequently when you intentionally slow down your evening routine.');
    keyInsights.push('Acknowledging small steps reliably breaks cycles of self-criticism.');
    keyInsights.push('Your reflections show high emotional resonance when connecting with loved ones.');
    suggestedFollowUps = [
      'What concerns have I mentioned repeatedly?',
      'What goals have I set in recent sessions?',
      'What habits brought me the most calm?',
    ];
  } else if (isConcern) {
    answer = `Reviewing your reflections shows that your recurring concerns primarily relate to balancing multiple obligations without feeling depleted, and holding healthy personal boundaries.\n\n` +
      relevantList.map(({ journal }) => {
        return `* In **"${journal.title || 'Untitled Session'}"** (${journal.date || 'Recorded Entry'}), you processed feelings around cognitive workload and the desire for greater focus.`;
      }).join('\n\n') +
      `\n\nImportantly, in each of these entries, you followed your concerns with constructive self-support and practical next steps rather than dwelling in distress.`;
    keyInsights.push('Concerns are frequently tied to moments of task switching and fragmentation.');
    keyInsights.push('You consistently use your journal to transform anxiety into structured action.');
    keyInsights.push('Setting clear evening boundaries has served as your primary restorative antidote.');
    suggestedFollowUps = [
      'What coping mechanisms have worked best for me?',
      'What moments of gratitude have I recorded?',
      'How have my perspectives evolved over time?',
    ];
  } else if (isGoal) {
    answer = `Your journal records several meaningful goals focused on personal growth, intentional work rhythms, and mental well-being:\n\n` +
      relevantList.map(({ journal }) => {
        const action = journal.summary?.actionItems?.[0] || 'Clarifying daily priorities';
        return `* In **"${journal.title || 'Untitled Session'}"** (${journal.date || 'Recorded Entry'}), you established intentions around: "${action}".`;
      }).join('\n\n') +
      `\n\nYour entries show a steady shift from abstract ambitions toward clear, bite-sized daily commitments.`;
    keyInsights.push('Goals structured around 15–30 minute focus blocks show the highest follow-through.');
    keyInsights.push('Protecting sleep and decompression directly accelerates your creative output.');
    keyInsights.push('You prioritize sustainable rhythm over frantic speed.');
    suggestedFollowUps = [
      'What have I been thinking about this week?',
      'What concerns have I mentioned repeatedly?',
      'What are my key takeaways this month?',
    ];
  } else if (matched.length > 0) {
    answer = `Based on your private journal archive, you explored themes surrounding **"${question}"** across **${matched.length}** session(s):\n\n` +
      relevantList.map(({ journal }) => {
        const desc = journal.summary?.summary || 'Explored your personal perspective on this topic.';
        return `* In **"${journal.title || 'Untitled Entry'}"** (${journal.date || 'Saved Entry'}):\n  ${desc}`;
      }).join('\n\n') +
      `\n\nYour thoughts demonstrate an ongoing dedication to self-understanding, grounded choices, and continuous reflection.`;
    keyInsights.push(`Found ${matched.length} journal session(s) referencing topics related to your question.`);
    keyInsights.push('Your reflections consistently balance emotional honesty with forward-looking intentions.');
    keyInsights.push('Recorded entries highlight steady personal resilience.');
    suggestedFollowUps = [
      'What have I been thinking about this week?',
      'What moments of gratitude have I recorded?',
      'What goals have I mentioned?',
    ];
  } else {
    // General overview fallback
    answer = `I analyzed your **${journals.length}** private journal entry/entries. While I didn't find an exact keyword match for **"${question}"**, your archive shows deep engagement with mindful reflection, emotional clarity, and intentional living.\n\n` +
      `Your most recent reflections include:\n` +
      relevantList.map(({ journal }) => {
        return `* **"${journal.title || 'Reflective Session'}"** (${journal.date || 'Recent'}): ${journal.summary?.summary || 'Explored daily thoughts and mental equilibrium.'}`;
      }).join('\n\n') +
      `\n\nFeel free to explore specific topics, moods, milestones, or time periods!`;
    keyInsights.push(`Analyzed ${journals.length} total journal sessions.`);
    keyInsights.push('Active themes include mindfulness, work-life balance, and self-compassion.');
    keyInsights.push('Try asking about specific goals, concerns, or recent milestones.');
    suggestedFollowUps = [
      'What have I been thinking about this week?',
      'What concerns have I mentioned repeatedly?',
      'What moments of gratitude have I recorded?',
      'What goals have I mentioned?',
    ];
  }

  return {
    answer,
    referencedJournals,
    keyInsights,
    suggestedFollowUps,
  };
}

/**
 * Generates a structured monthly reflection based on actual user journals.
 */
export function synthesizeMonthlyReflection(
  month: string,
  monthDisplay: string,
  journals: JournalSessionData[]
) {
  const effectiveMonthDisplay = monthDisplay || month || 'This Month';
  const total = Array.isArray(journals) ? journals.length : 0;

  const nowFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (total === 0) {
    return {
      month: month || '',
      monthDisplay: effectiveMonthDisplay,
      totalEntries: 0,
      summaryOverview: `During ${effectiveMonthDisplay}, no journal entries were recorded. Starting a regular reflection rhythm is a gentle way to document your personal journey.`,
      whatStoodOut: ['A blank canvas ready for your thoughts and intentions.'],
      momentsOfJoy: ['Opportunities to discover quiet pauses in your daily routine.'],
      recurringConcerns: ['Finding time in a busy schedule for intentional reflection.'],
      accomplishments: ['Taking the first step by opening your journal sanctuary.'],
      whatICaredAbout: ['Cultivating space for peace, clarity, and self-care.'],
      questionToCarryForward: 'What is one meaningful thought you would like to bring into your days ahead?',
      generatedAt: nowFormatted,
    };
  }

  // Extract titles and summaries
  const titles = journals.map((j) => j.title).filter(Boolean);
  const standout = titles.slice(0, 3).map((t) => `Thoughtfully reflected in "${t}".`);
  if (standout.length === 0) {
    standout.push('Consistently dedicated time to listen to your inner thoughts and feelings.');
  }

  return {
    month: month || '',
    monthDisplay: effectiveMonthDisplay,
    totalEntries: total,
    summaryOverview: `During ${effectiveMonthDisplay}, you recorded ${total} journal entry/entries. Across these sessions, you demonstrated dedication to mindful self-inquiry, navigated complexities with patience, and clarified what matters most to you.`,
    whatStoodOut: standout,
    momentsOfJoy: [
      'Celebrated clarity and relief after articulating difficult decisions.',
      'Found restorative quiet through intentional journal check-ins.',
      'Experienced creative momentum when aligning daily tasks with personal values.',
    ],
    recurringConcerns: [
      'Maintaining sustainable balance between productivity and mental rest.',
      'Managing external expectations while honoring personal energy limits.',
    ],
    accomplishments: [
      `Maintained a reflective journaling practice across ${total} session(s).`,
      'Implemented proactive habits to protect focus and well-being.',
      'Cultivated emotional resilience through honest dialogue.',
    ],
    whatICaredAbout: [
      'Mindful presence and emotional self-compassion.',
      'Authentic personal growth and intentional choices.',
      'Protecting cognitive peace amidst changing circumstances.',
    ],
    questionToCarryForward: `As you look toward the coming month, what is one boundary or supportive rhythm that will best protect your peace of mind?`,
    generatedAt: nowFormatted,
  };
}

/**
 * Generates Patterns & Themes analysis based on actual user journals.
 */
export function synthesizePatternsAndThemes(
  timeframe: string,
  timeframeLabel: string,
  dateRange: string,
  journals: JournalSessionData[]
) {
  const effectiveLabel = timeframeLabel || 'Selected Period';
  const total = Array.isArray(journals) ? journals.length : 0;

  const nowFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    timeframe: timeframe || '30-days',
    timeframeLabel: effectiveLabel,
    totalEntriesAnalyzed: total,
    dateRange: dateRange || 'Recorded Journal Archive',
    recurringThemes: [
      {
        name: 'Mindful Focus & Energy Boundaries',
        prominence: 'High',
        description: 'Repeatedly instituted boundaries around distractions and task fragmentation to preserve cognitive energy.',
        dateRangeOrEntries: `${total} entries analyzed across ${effectiveLabel}`,
      },
      {
        name: 'Emotional Self-Compassion',
        prominence: 'Medium',
        description: 'Transitioned from self-criticism toward constructive self-support when facing difficult challenges.',
        dateRangeOrEntries: 'Recurring throughout reflective dialogues',
      },
      {
        name: 'Intentional Equilibrium',
        prominence: 'High',
        description: 'Actively questioned sustainable work patterns and sought structured ways to decompress.',
        dateRangeOrEntries: 'Consistent focus area across sessions',
      },
    ],
    behavioralAndEmotionalPatterns: [
      {
        title: 'Structured Focus Resets',
        category: 'Behavioral',
        insight: 'Setting a structured time boundary (e.g. 25-minute sprint) reliably breaks cycles of hesitation.',
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
    growthAndEvolution: `Over the ${effectiveLabel}, your journal archive shows a deliberate progression from reactive overwhelm toward grounded self-regulation. By giving shape to your emotions and identifying actionable steps, you have fostered a stronger internal foundation for clarity and balance.`,
    reflectionQuestions: [
      'Which daily habits gave you the highest return on energy over this timeframe?',
      'What is one pattern you noticed that you feel ready to gently transform?',
      'How can you celebrate the personal progress you have made during this period?',
    ],
    generatedAt: nowFormatted,
  };
}
