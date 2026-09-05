import { JournalSession, JournalSummary } from '../types';

export const INITIAL_SESSIONS: JournalSession[] = [
  {
    id: 'session-1',
    title: 'Finding Focus Amid Project Deadlines',
    date: 'Aug 26, 2026',
    time: '8:45 PM',
    status: 'finished',
    mood: 'Relieved',
    tags: ['Work', 'Mindfulness', 'Priorities'],
    messages: [
      {
        id: 'm1',
        sender: 'gemini',
        text: 'Welcome back. Take a gentle breath. What thoughts or emotions are most present for you as you close out your day?',
        timestamp: '8:45 PM'
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'I felt overwhelmed by three competing project deadlines today. I kept jumping between tasks and felt like I got nothing substantial finished until late afternoon.',
        timestamp: '8:47 PM'
      },
      {
        id: 'm3',
        sender: 'gemini',
        text: 'Task fragmentation takes a heavy cognitive toll. When you finally found traction late in the afternoon, what made the difference? Did you change your environment or choose a single task to protect?',
        timestamp: '8:48 PM',
        suggestedFollowUps: [
          'I silenced Slack notifications for 90 minutes',
          'I broke down the hardest task into three 15-minute chunks'
        ]
      },
      {
        id: 'm4',
        sender: 'user',
        text: 'I closed all my browser tabs except the architecture doc, set a 45-minute timer, and told the team I was in deep focus mode. That single session resolved the blockage.',
        timestamp: '8:51 PM'
      },
      {
        id: 'm5',
        sender: 'gemini',
        text: 'That is a clear example of protecting your attention boundaries. Notice how you already have the remedy for overwhelm within your toolkit.',
        timestamp: '8:52 PM'
      }
    ],
    summary: {
      title: 'Navigating Work Overwhelm & Priority Boundaries',
      summary: 'Transformed early-day cognitive friction and fragmented attention into focused momentum by implementing strict single-task boundaries.',
      keyThoughts: [
        'Recognized that browser tab fragmentation exacerbates mental fatigue.',
        'Noticed that setting a 45-minute timer creates immediate momentum.',
        'Realized collaborators respect boundaries when clearly communicated.'
      ],
      actionItems: [
        'Protect the first 90 minutes of tomorrow morning for single-task focus before opening communication channels.',
        'When feeling fragmented, employ the 45-minute timer boundary technique that worked successfully today.',
        'Close unneeded tabs before beginning complex problem solving.'
      ],
      reflection: 'Today was characterized by early-day task fragmentation and cognitive friction, followed by a decisive shift toward focused deep work. By implementing boundary protection (closing tabs, timed focus sprints, notifying collaborators), you transformed initial overwhelm into meaningful progress.',
      keyThemes: ['Cognitive Overload', 'Deep Work Strategies', 'Boundary Setting', 'Self-Efficacy'],
      mood: {
        label: 'Relieved & Centered',
        emoji: '🌿',
        description: 'Transitioned from acute overwhelm to grounded clarity through deliberate action.',
        sentimentScore: 78,
        energyLevel: 65,
      },
      takeaways: [
        'Protect the first 90 minutes of tomorrow morning for single-task focus before opening communication channels.',
        'When feeling fragmented, employ the 45-minute timer boundary technique that worked successfully today.'
      ],
      mindfulPrompt: 'How can you structure your tomorrow morning so deep work happens naturally rather than as an emergency rescue?',
      generatedAt: 'Aug 26, 2026 • 8:54 PM',
      wordCount: 142
    }
  },
  {
    id: 'session-2',
    title: 'Morning Intentions & Gratitude Check-in',
    date: 'Aug 25, 2026',
    time: '7:15 AM',
    status: 'finished',
    mood: 'Grounded',
    tags: ['Morning', 'Gratitude', 'Health'],
    messages: [
      {
        id: 'm201',
        sender: 'gemini',
        text: 'Good morning. As you step into this fresh day, what is one small thing you are genuinely grateful for right now?',
        timestamp: '7:15 AM'
      },
      {
        id: 'm202',
        sender: 'user',
        text: 'The silence of the house early in the morning and a warm cup of pour-over coffee. I slept eight full hours for the first time this week.',
        timestamp: '7:18 AM'
      },
      {
        id: 'm203',
        sender: 'gemini',
        text: 'Adequate rest is such a powerful anchor. What intention would you like to carry forward to honor this rested energy today?',
        timestamp: '7:19 AM'
      },
      {
        id: 'm204',
        sender: 'user',
        text: 'To move through conversations with patience rather than rushing to the next item on my calendar.',
        timestamp: '7:22 AM'
      }
    ],
    summary: {
      title: 'Morning Intentions & Calm Anchor',
      summary: 'A serene start grounded in physical restoration and sensory appreciation, establishing an explicit commitment to unhurried communication.',
      keyThoughts: [
        'Recognized that deep physical rest dramatically shifts baseline patience.',
        'Noticed that savoring quiet morning rituals sets a grounded emotional tone.',
        'Intentionally chose to prioritize calm over calendar rush.'
      ],
      actionItems: [
        'Pause for three conscious breaths before joining each scheduled meeting today.',
        'Protect sleep hygiene tonight to sustain this restored baseline.',
        'Acknowledge one pleasant moment in the afternoon.'
      ],
      reflection: 'A serene start grounded in physical restoration and sensory appreciation. You established an explicit commitment to unhurried communication and mindfulness.',
      keyThemes: ['Physical Rest', 'Morning Rituals', 'Patience', 'Intentionality'],
      mood: {
        label: 'Peaceful & Energized',
        emoji: '☀️',
        description: 'High baseline of calm with refreshed optimism from deep rest.',
        sentimentScore: 88,
        energyLevel: 85,
      },
      takeaways: [
        'Pause for three conscious breaths before joining each scheduled meeting today.',
        'Protect sleep hygiene tonight to sustain this restored baseline.'
      ],
      mindfulPrompt: 'In what moment today might you be tempted to rush, and how will you anchor back to this calm?',
      generatedAt: 'Aug 25, 2026 • 7:25 AM',
      wordCount: 95
    }
  },
  {
    id: 'session-3',
    title: 'Navigating Technical Architecture Trade-offs',
    date: 'Aug 28, 2026',
    time: '4:20 PM',
    status: 'finished',
    mood: 'Analytical',
    tags: ['Architecture', 'Problem-Solving', 'Focus'],
    messages: [
      {
        id: 'm301',
        sender: 'gemini',
        text: 'Hello. What architectural problem is occupying your mental canvas right now?',
        timestamp: '4:20 PM'
      },
      {
        id: 'm302',
        sender: 'user',
        text: 'Wrestling with asynchronous caching vs immediate consistency for the user dashboard. Both approaches have valid trade-offs.',
        timestamp: '4:23 PM'
      },
      {
        id: 'm303',
        sender: 'gemini',
        text: 'When you consider user expectations during high load, which failure mode is more tolerable: a 2-second eventual consistency delay or a slower response time?',
        timestamp: '4:25 PM'
      }
    ],
    summary: {
      title: 'Decisive System Architecture Balancing',
      summary: 'Analyzed distributed consistency models and decisively selected cache-aside with lightweight optimistic updates for peak responsiveness.',
      keyThoughts: [
        'Eventual consistency is fully acceptable for metrics displays.',
        'Reducing API latency has a direct positive impact on perceived performance.'
      ],
      actionItems: [
        'Document the caching TTL policy in the engineering wiki.',
        'Set up automated latency metrics alerts.'
      ],
      reflection: 'Focused technical clarity was achieved by evaluating user experience constraints rather than purely theoretical purity.',
      keyThemes: ['Architecture', 'Engineering Decision-Making', 'Clarity'],
      mood: {
        label: 'Invigorated & Clear',
        emoji: '⚡',
        description: 'High intellectual engagement with resolving a complex design puzzle.',
        sentimentScore: 82,
        energyLevel: 90,
      },
      takeaways: [
        'Simplicity in caching beats over-engineered distributed synchronization.'
      ],
      mindfulPrompt: 'Where else in your work can you choose practical simplicity over theoretical perfection?',
      generatedAt: 'Aug 28, 2026 • 4:32 PM',
      wordCount: 110
    }
  },
  {
    id: 'session-4',
    title: 'Midday Reset & Reclaiming Mental Breath',
    date: 'Aug 29, 2026',
    time: '1:10 PM',
    status: 'finished',
    mood: 'Fatigued',
    tags: ['Rest', 'Recharge', 'Wellness'],
    messages: [
      {
        id: 'm401',
        sender: 'gemini',
        text: 'Take a quiet pause. How is your energy holding up in the middle of this day?',
        timestamp: '1:10 PM'
      },
      {
        id: 'm402',
        sender: 'user',
        text: 'Heavy back-to-back meetings left my battery running on empty. I need to recharge without feeling guilty about taking 20 minutes.',
        timestamp: '1:12 PM'
      }
    ],
    summary: {
      title: 'Midday Restoration & Rest Acceptance',
      summary: 'Recognized cognitive depletion from continuous social interactions and allowed an intentional 20-minute screen-free recharge.',
      keyThoughts: [
        'Rest is not an indulgence or reward; it is an operating requirement.',
        '20 minutes of silence restores more energy than pushing through exhaustion.'
      ],
      actionItems: [
        'Step away from all screens for a 15-minute walk outside.',
        'Drink a large glass of water before the next engagement.'
      ],
      reflection: 'Acknowledged genuine fatigue with compassion. Giving yourself permission to pause averted afternoon burnout.',
      keyThemes: ['Energy Management', 'Self-Care', 'Pacing'],
      mood: {
        label: 'Gently Restoring',
        emoji: '🌱',
        description: 'Low physical battery but growing mental relief through acceptance of limits.',
        sentimentScore: 68,
        energyLevel: 42,
      },
      takeaways: [
        'Recognize tiredness early before it becomes irritability or brain fog.'
      ],
      mindfulPrompt: 'What is one boundary you can set around your calendar to protect midday recharge blocks?',
      generatedAt: 'Aug 29, 2026 • 1:22 PM',
      wordCount: 88
    }
  },
  {
    id: 'session-5',
    title: 'Weekly Wins, Deep Gratitude & Forward Outlook',
    date: 'Aug 30, 2026',
    time: '6:30 PM',
    status: 'finished',
    mood: 'Joyful',
    tags: ['Celebration', 'Gratitude', 'Growth'],
    messages: [
      {
        id: 'm501',
        sender: 'gemini',
        text: 'As you look across this past week, what moment brings you the deepest sense of contentment?',
        timestamp: '6:30 PM'
      },
      {
        id: 'm502',
        sender: 'user',
        text: 'We shipped the core release without any critical regressions, and I was able to mentor our new teammate through their first deployment.',
        timestamp: '6:33 PM'
      }
    ],
    summary: {
      title: 'Weekly Retrospective & Contentment',
      summary: 'Celebrated major engineering milestones and the relational fulfillment of empowering teammates, finishing the week with radiant morale.',
      keyThoughts: [
        'Mentorship and helping others succeed provides deeper satisfaction than solo execution.',
        'Intentional pacing throughout the week allowed a calm finish rather than panic.'
      ],
      actionItems: [
        'Send a brief thank-you note to the team for their collaboration.',
        'Fully unplug over the weekend to recharge.'
      ],
      reflection: 'The week closed with harmonious balance between achievement and interpersonal connection. Gratitude and confidence are in healthy alignment.',
      keyThemes: ['Mentorship', 'Achievement', 'Gratitude', 'Balance'],
      mood: {
        label: 'Harmonious & Thriving',
        emoji: '✨',
        description: 'High emotional fulfillment and sustained positive vitality.',
        sentimentScore: 94,
        energyLevel: 88,
      },
      takeaways: [
        'Anchor in these feelings of accomplishment to build steady confidence for the next cycle.'
      ],
      mindfulPrompt: 'How can you preserve this generous spirit and lightness as new challenges arise next week?',
      generatedAt: 'Aug 30, 2026 • 6:40 PM',
      wordCount: 135
    }
  }
];

export const STARTER_PROMPTS = [
  {
    title: 'Freeform Reflection',
    prompt: 'I want to unpack what has been on my mind today without any filter...',
    badge: 'Open Stream'
  },
  {
    title: 'Decompress & Unwind',
    prompt: 'I had an emotionally draining day and need a space to decompress and process...',
    badge: 'Evening'
  },
  {
    title: 'Clarity on a Decision',
    prompt: 'I am wrestling with an important decision and need help exploring both sides objectively...',
    badge: 'Decision'
  },
  {
    title: 'Gratitude & Wins',
    prompt: 'I want to celebrate some small wins and cultivate gratitude today...',
    badge: 'Morning'
  }
];

export function generateReflectiveGeminiReply(userText: string, turnCount: number): { text: string; followUps: string[] } {
  const lower = userText.toLowerCase();

  if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('anxious') || lower.includes('tired')) {
    return {
      text: 'I hear the weight in your words. When feelings of stress or fatigue build up, our bodies often hold onto tension before our minds fully catch up. What is the one thing causing the most pressure right now, and is there any part of it that can wait until tomorrow?',
      followUps: [
        'The hardest part is feeling responsible for everything',
        'I need to say no to an upcoming request',
        'I just need to take a break right now'
      ]
    };
  }

  if (lower.includes('decision') || lower.includes('choice') || lower.includes('options') || lower.includes('should i')) {
    return {
      text: 'Navigating choices can bring up fear of making the wrong move. If you imagine yourself one year from now looking back at this crossroads, which path feels more aligned with who you want to become?',
      followUps: [
        'Option A is safer, but Option B offers true growth',
        'I am worried about what other people might think',
        'What if I test a small prototype first?'
      ]
    };
  }

  if (lower.includes('grateful') || lower.includes('happy') || lower.includes('win') || lower.includes('proud') || lower.includes('good')) {
    return {
      text: 'That is wonderful to acknowledge. We so easily overlook our quiet victories in the rush of daily life. How did your own effort or outlook help bring this positive moment about?',
      followUps: [
        'I stayed persistent even when it felt uncertain',
        'I allowed myself to enjoy the process without perfectionism'
      ]
    };
  }

  if (turnCount >= 3) {
    return {
      text: 'You have articulated your thoughts with real clarity and vulnerability. As you sit with what we’ve explored together, what feels like the most essential truth or insight for you today?',
      followUps: [
        'I need to give myself more grace',
        'I know what my next concrete step is',
        'I feel lighter having written this down'
      ]
    };
  }

  return {
    text: 'Thank you for sharing that. It takes courage to look inward and put these thoughts into words. When you reflect on that experience, what felt most surprising or challenging about it for you?',
    followUps: [
      'It made me realize how much energy I was spending on things I cannot control',
      'I want to explore why I felt that reaction so strongly',
      'I think I am ready to summarize my reflections'
    ]
  };
}

export function synthesizeSessionSummary(session: JournalSession): JournalSummary {
  const userMessages = session.messages.filter((m) => m.sender === 'user');
  const allUserText = userMessages.map((m) => m.text).join(' ');
  const wordCount = allUserText.split(/\s+/).filter(Boolean).length || 35;

  const topics: string[] = [];
  if (allUserText.toLowerCase().includes('work') || allUserText.toLowerCase().includes('job') || allUserText.toLowerCase().includes('project')) {
    topics.push('Career & Work Dynamics');
  }
  if (allUserText.toLowerCase().includes('stress') || allUserText.toLowerCase().includes('pressure') || allUserText.toLowerCase().includes('time')) {
    topics.push('Stress Resilience');
  }
  if (allUserText.toLowerCase().includes('happy') || allUserText.toLowerCase().includes('grateful') || allUserText.toLowerCase().includes('peace')) {
    topics.push('Gratitude & Well-being');
  }
  if (allUserText.toLowerCase().includes('learn') || allUserText.toLowerCase().includes('grow') || allUserText.toLowerCase().includes('goal')) {
    topics.push('Personal Growth');
  }
  if (topics.length === 0) {
    topics.push('Self-Reflection', 'Emotional Clarity', 'Mindful Presence');
  }

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    title: session.title !== 'New Journal Entry' ? session.title : 'Reflective Discovery & Insights',
    summary: userMessages.length > 0
      ? `A thoughtful reflection exploring ${session.title}, identifying key thoughts around balance, self-compassion, and practical next steps.`
      : 'A peaceful moment of personal stillness and reflection recorded in your private journal.',
    keyThoughts: [
      'Honored the importance of checking in with emotional boundaries.',
      'Recognized that writing down thoughts creates space between feelings and actions.',
      'Identified clarity through dedicated Socratic introspection.'
    ],
    actionItems: [
      'Take 3 conscious breaths when transitioning between tasks.',
      'Protect quiet personal time before bed.',
      'Hold gentle patience with current goals and projects.'
    ],
    reflection: userMessages.length > 0
      ? `In this reflective dialogue, you explored "${session.title}". Across ${userMessages.length} personal reflections, you unpacked your inner experiences, untangled cognitive friction, and arrived at grounded self-awareness. Your honesty allowed you to identify both the external demands and internal boundaries that matter most.`
      : 'A peaceful moment of personal stillness and reflection recorded in your private journal.',
    keyThemes: topics,
    mood: {
      label: 'Reflective & Grounded',
      emoji: '✨',
      description: 'Progressed towards mental clarity, emotional release, and thoughtful equilibrium.',
      sentimentScore: 82
    },
    takeaways: [
      'Honor your emotional boundaries by checking in with yourself before committing extra energy.',
      'Acknowledge that writing down your thoughts creates space between your feelings and your actions.',
      'Revisit this reflection when you need a reminder of your innate clarity and composure.'
    ],
    mindfulPrompt: 'What is one gentle promise you want to keep with yourself for the remainder of today?',
    generatedAt: `${dateFormatted} • ${timeFormatted}`,
    wordCount: wordCount
  };
}
