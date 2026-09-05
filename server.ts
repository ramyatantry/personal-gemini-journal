import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import { getGeminiApiKeyFromSecretManager, invalidateSecretCache } from './server/secretManager.js';
import {
  synthesizeChatFallback,
  synthesizeJournalSummary,
  synthesizeAskJournal,
  synthesizeMonthlyReflection,
  synthesizePatternsAndThemes,
} from './server/localSynthesis.js';

dotenv.config();

// Read applet config if present
let appletConfig: { projectId?: string } = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch {
  // ignore
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Lazy initialization of Firebase Admin
let firebaseAdminApp: App | null = null;
function getFirebaseAdminApp(): App {
  if (!firebaseAdminApp) {
    try {
      const existingApps = getApps();
      if (existingApps.length === 0) {
        firebaseAdminApp = initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || appletConfig.projectId || 'gen-lang-client-0337677052',
        });
      } else {
        firebaseAdminApp = existingApps[0]!;
      }
    } catch (e) {
      console.warn('Firebase Admin init warning:', e);
      firebaseAdminApp = initializeApp();
    }
  }
  return firebaseAdminApp;
}


/**
 * Authentication Middleware:
 * Protects journal endpoints against unauthenticated access.
 * Extracts and verifies the cryptographic Firebase ID Token from Authorization: Bearer <token>.
 * Never accepts a client-provided unverified userId parameter.
 */
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: You must be signed in with Firebase to access journal reflection features.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Missing authentication token.',
    });
    return;
  }

  try {
    const adminApp = getFirebaseAdminApp();
    const adminAuth = getAuth(adminApp);
    const decoded = await adminAuth.verifyIdToken(token);

    (req as unknown as { user: { uid: string; email?: string; name?: string } }).user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized: Invalid, malformed, or expired Firebase authentication token.',
    });
  }
}


// Lazy initialization of Gemini client using Google Cloud Secret Manager
let currentApiKey: string | null = null;
let aiClient: GoogleGenAI | null = null;

async function getAIClient(): Promise<GoogleGenAI | null> {
  const apiKey = await getGeminiApiKeyFromSecretManager();
  if (!apiKey) {
    return null;
  }
  if (!aiClient || currentApiKey !== apiKey) {
    currentApiKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const apiKey = await getGeminiApiKeyFromSecretManager();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    credentialProvider: 'Google Cloud Secret Manager (with ADC)',
  });
});

/**
 * Multi-turn Journal Chat Endpoint (Protected)
 * Receives the conversation history and the latest message.
 * Generates an empathetic, reflective Socratic reply with suggested follow-ups.
 * Strictly adheres to privacy: NEVER logs message content or secrets.
 */
app.post('/api/journal/chat', requireAuth, async (req, res) => {
  try {
    const { history = [], message = '', mood = 'Reflective' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = await getAIClient();

    // If API key is not configured, return a thoughtful graceful fallback response
    if (!ai) {
      res.json(synthesizeChatFallback(history, message, mood));
      return;
    }

    // Keep only the most recent conversation context (last 10 messages) for fast token processing
    const recentHistory = history.slice(-10);
    const formattedContents = recentHistory.map((item: { role: string; text: string }) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }],
    }));

    // Add current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const systemInstruction = `You are the empathetic, wise, and mindful guide inside "Personal Gemini Journal".
Your purpose is to help the user unpack their inner landscape, explore emotions, discover cognitive clarity, and foster mindful growth through gentle Socratic dialogue.

Guidelines:
1. Warmly acknowledge and validate what the user expressed without patronizing or being overly verbose.
2. Ask ONE deep, open-ended, introspective question to help them reflect on their feelings, beliefs, or desires.
3. Keep the tone compassionate, grounded, literary, and calm.
4. Always produce a structured response with:
   - "reply": Your thoughtful journal guidance and reflective question (1 to 2 short paragraphs).
   - "suggestedFollowUps": 3 short, authentic first-person sentence starters (e.g. "I realized that...", "Part of me is afraid of...", "What I really need right now is...") that the user can click to easily continue expressing themselves.
The user's stated session mood is: "${mood}".`;

    let responseText = '';
    // Try standard gemini-3.8-flash, fallback to gemini-3.1-flash-lite
    const modelsToTry = [
      { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    ];
    let lastError: unknown = null;

    for (const { model, thinkingLevel } of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'The reflective journaling response and question for the user.',
                },
                suggestedFollowUps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 short sentence starters from user point of view.',
                },
              },
              required: ['reply', 'suggestedFollowUps'],
            },
          },
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        // Continue to fallback model if 503 high demand or quota spike
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    const outputText = responseText || '{}';
    let parsedData = { reply: '', suggestedFollowUps: [] as string[] };
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      parsedData = {
        reply: outputText,
        suggestedFollowUps: [
          'Tell me more about how this makes you feel',
          'I want to explore what this means for my goals',
          'Here is what else is on my mind today',
        ],
      };
    }

    res.json({
      text: parsedData.reply || 'Thank you for reflecting with me. What else would you like to explore together?',
      suggestedFollowUps: parsedData.suggestedFollowUps || [],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gemini Service] Chat rate limit or API notice, using local synthesis fallback:', errorMessage.slice(0, 100));

    // Return high-fidelity local synthesis response so user reflective session flow is smooth
    res.json(synthesizeChatFallback(req.body.history || [], req.body.message || '', req.body.mood || 'Reflective'));
  }
});

/**
 * Journal Synthesis & Summary Endpoint (Protected)
 * Distills multi-turn session dialogue into an evocative title, concise summary,
 * key thoughts, action items, emotional tone, and mindfulness insights.
 */
app.post('/api/journal/summarize', requireAuth, async (req, res) => {
  try {
    const { messages = [], sessionTitle = 'Journal Session', mood = 'Reflective' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages are required for synthesis' });
      return;
    }

    const ai = await getAIClient();

    // Compute approximate word count
    const totalWords = messages.reduce((acc: number, m: { text?: string }) => {
      return acc + (m.text ? m.text.trim().split(/\s+/).length : 0);
    }, 0);

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!ai) {
      res.json(synthesizeJournalSummary(messages, sessionTitle, mood));
      return;
    }

    const conversationTranscript = messages
      .map((m: { sender: string; text: string }) => `${m.sender === 'user' ? 'User' : 'Gemini Guide'}: ${m.text}`)
      .join('\n\n');

    const prompt = `Synthesize and analyze this private journal conversation.
Generate:
1. title: A concise, evocative title summarizing the heart of this reflection (3 to 6 words).
2. summary: A concise 2-3 sentence overview capturing the core narrative and state of mind.
3. keyThoughts: 3 to 4 core thoughts, realizations, or beliefs uncovered during the session.
4. actionItems: 3 to 4 concrete, compassionate, and actionable next steps for the user.
5. reflection: An empathetic 2-3 paragraph synthesis honoring the user's vulnerability and self-discovery.
6. keyThemes: 3 to 5 keyword tags.
7. mood: Emotional tone with label, emoji, description, and sentiment score (0-100).
8. takeaways: 3 mindful takeaways.
9. mindfulPrompt: One contemplative question for tomorrow.

Session Title: "${sessionTitle}"
Stated Mood: "${mood}"

Transcript of Dialogue:
${conversationTranscript}`;

    let summarizeResponseText = '';
    const summarizeModels = [
      { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    ];
    let summarizeLastError: unknown = null;

    for (const { model, thinkingLevel } of summarizeModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: `You are an expert mindfulness synthesizer and psychological journaling coach.
You transform raw, multi-turn reflective journal transcripts into elegant, compassionate, structured reflections.
Never disclose raw transcript logs. Strictly return JSON adhering to the schema.`,
            temperature: 0.6,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'A concise, evocative title for the journal reflection (3 to 6 words).',
                },
                summary: {
                  type: Type.STRING,
                  description: 'A concise 2-3 sentence summary of the journal dialogue.',
                },
                keyThoughts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 4 key thoughts or mental realizations identified in the session.',
                },
                actionItems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 4 practical, actionable next steps or mindfulness practices.',
                },
                reflection: {
                  type: Type.STRING,
                  description: 'A 2-3 paragraph empathetic synthesis of the user reflection.',
                },
                keyThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 5 concise tags representing core themes explored.',
                },
                mood: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Mood descriptor like Grounded Clarity or Peaceful Resolution' },
                    emoji: { type: Type.STRING, description: 'Single emoji representing the mood' },
                    description: { type: Type.STRING, description: 'One sentence describing the emotional resonance' },
                    sentimentScore: { type: Type.NUMBER, description: 'Score between 0 and 100 where 0 is distressed/heavy, 50 is neutral/balanced, and 100 is joyful/thriving' },
                    energyLevel: { type: Type.NUMBER, description: 'Energy score between 0 and 100 where 0 is depleted/exhausted, 50 is calm/steady, and 100 is energized/vibrant' },
                  },
                  required: ['label', 'emoji', 'description', 'sentimentScore', 'energyLevel'],
                },
                takeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 clear, gentle, actionable takeaways or mindful shifts.',
                },
                mindfulPrompt: {
                  type: Type.STRING,
                  description: 'A single thought-provoking inquiry for future contemplation.',
                },
              },
              required: ['title', 'summary', 'keyThoughts', 'actionItems', 'reflection', 'keyThemes', 'mood', 'takeaways', 'mindfulPrompt'],
            },
          },
        });
        if (response && response.text) {
          summarizeResponseText = response.text;
          break;
        }
      } catch (err) {
        summarizeLastError = err;
      }
    }

    if (!summarizeResponseText && summarizeLastError) {
      throw summarizeLastError;
    }

    const outputText = summarizeResponseText || '{}';
    let summaryData;
    try {
      summaryData = JSON.parse(outputText);
    } catch {
      summaryData = {
        title: sessionTitle !== 'New Journal Entry' ? sessionTitle : 'Reflective Discovery',
        summary: 'A session dedicated to self-observation, emotional clarity, and thoughtful progress.',
        keyThoughts: [
          'Recognized the importance of giving space to inner thoughts.',
          'Noticed emotional shifts when exploring current challenges.',
        ],
        actionItems: [
          'Take five deep breaths during moments of tension.',
          'Schedule time for personal creative or restorative activities.',
        ],
        reflection: outputText,
        keyThemes: ['Introspection', 'Awareness', 'Growth'],
        mood: {
          label: 'Reflective',
          emoji: '✨',
          description: 'A state of contemplative awareness.',
          sentimentScore: 75,
          energyLevel: 70,
        },
        takeaways: [
          'Stay present with the insights discovered today.',
          'Take one small step towards your inner clarity.',
        ],
        mindfulPrompt: 'How can you bring this awareness into your everyday routine?',
      };
    }

    res.json({
      title: summaryData.title || sessionTitle,
      summary: summaryData.summary || 'A meaningful reflection dedicated to self-discovery, emotional clarity, and growth.',
      keyThoughts: Array.isArray(summaryData.keyThoughts) && summaryData.keyThoughts.length > 0
        ? summaryData.keyThoughts
        : ['Cultivated intentional awareness of thoughts and emotions.', 'Recognized opportunities for gentle self-compassion.'],
      actionItems: Array.isArray(summaryData.actionItems) && summaryData.actionItems.length > 0
        ? summaryData.actionItems
        : ['Take a quiet moment to ground yourself before major tasks.', 'Reflect on what brought you peace today.'],
      reflection: summaryData.reflection || 'Throughout this session, you created intentional space for self-reflection and growth.',
      keyThemes: summaryData.keyThemes || ['Reflection', 'Growth'],
      mood: summaryData.mood ? {
        label: summaryData.mood.label || 'Reflective',
        emoji: summaryData.mood.emoji || '🌿',
        description: summaryData.mood.description || 'Centered and introspective.',
        sentimentScore: typeof summaryData.mood.sentimentScore === 'number' ? summaryData.mood.sentimentScore : 75,
        energyLevel: typeof summaryData.mood.energyLevel === 'number' ? summaryData.mood.energyLevel : 70,
      } : {
        label: 'Reflective',
        emoji: '🌿',
        description: 'Centered and introspective.',
        sentimentScore: 80,
        energyLevel: 72,
      },
      takeaways: summaryData.takeaways || [],
      mindfulPrompt: summaryData.mindfulPrompt || 'What is one intention you would like to hold today?',
      generatedAt: nowFormatted,
      wordCount: totalWords,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gemini Service] Summarize rate limit or API notice, using local synthesis fallback:', errorMessage.slice(0, 100));

    res.json(
      synthesizeJournalSummary(
        req.body.messages || [],
        req.body.sessionTitle,
        req.body.mood || 'Reflective'
      )
    );
  }
});

/**
 * Ask My Journal Endpoint (Protected)
 * Analyzes the authenticated user's private journals and answers retrospective or exploratory questions.
 * Isolates context strictly to the requesting user's journals.
 * Never logs user private reflections, questions, or credentials.
 */
app.post('/api/journal/ask', requireAuth, async (req, res) => {
  try {
    const { question = '', journals = [] } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    // If user has no journals recorded yet
    if (!Array.isArray(journals) || journals.length === 0) {
      res.json({
        answer: "You haven't created any journal entries yet. Once you complete your first reflection session, Ask My Journal will be able to synthesize your thoughts, track recurring themes, and answer questions across your entries.",
        referencedJournals: [],
        keyInsights: [
          'No journal entries found in your private collection yet.',
          'Start a new journal session to begin recording your thoughts.',
        ],
        suggestedFollowUps: [
          'What is on my mind today?',
          'How can I get started with reflective journaling?',
          'What are the benefits of daily reflection?',
        ],
      });
      return;
    }

    const ai = await getAIClient();

    // Prepare journal context (titles, dates, moods, tags, summaries, and key user messages)
    const journalSummaries = journals.slice(0, 25).map((j: {
      id?: string;
      title?: string;
      date?: string;
      mood?: string;
      tags?: string[];
      summary?: { summary?: string; keyThoughts?: string[]; reflection?: string; actionItems?: string[] } | null;
      messages?: Array<{ sender: string; text: string }>;
    }) => {
      const userThoughts = (j.messages || [])
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join(' | ');

      return {
        id: j.id || 'unknown',
        title: j.title || 'Untitled Session',
        date: j.date || 'Unknown Date',
        mood: j.mood || 'Reflective',
        tags: j.tags || [],
        summary: j.summary?.summary || 'No summary generated yet.',
        keyThoughts: j.summary?.keyThoughts || [],
        reflection: j.summary?.reflection || '',
        userDialogueExcerpts: userThoughts.slice(0, 800),
      };
    });

    const contextText = JSON.stringify(journalSummaries, null, 2);

    if (!ai) {
      res.json(synthesizeAskJournal(question, journals));
      return;
    }

    const systemInstruction = `You are "Ask My Journal", an intelligent, compassionate, and precise synthesis guide for the user's private journal archive.
The user will ask questions about their journal entries, such as:
- "What have I been thinking about this week?"
- "What concerns have I mentioned repeatedly?"
- "What moments of gratitude have I recorded?"
- "What goals have I mentioned?"
- Or any other retrospective/exploratory query about their thoughts, emotions, habits, and progress.

Your Core Instructions:
1. Search and synthesize ONLY across the provided journal entries.
2. Directly, warmly, and clearly answer the user's question in depth with Markdown formatting (use bolding, bullet points, or sections as appropriate).
3. If they ask about a specific topic (e.g., gratitude, wellness, relationships, milestones, emotions), pull out their actual thoughts, reflections, and perspectives.
4. If they ask about recurring concerns, patterns, or goals, aggregate evidence across multiple entries.
5. In "referencedJournals", list the exact journal sessions (id, title, date, and a short 1-sentence excerpt of what was said) that supported your answer.
6. In "keyInsights", provide 3 to 4 succinct, high-value takeaway observations or recurring patterns.
7. In "suggestedFollowUps", provide 3 relevant, thought-provoking questions the user might want to ask next based on what was uncovered in their journals.
8. If a topic was never mentioned in their journals, state honestly that you searched their entries and found no mention of it, and suggest related themes that ARE in their journals.
9. Strictly output valid JSON matching the schema.`;

    const userPrompt = `User's Private Journal Archive (Total ${journalSummaries.length} entries):
${contextText}

User's Question:
"${question}"`;

    let askResponseText = '';
    const askModels = [
      { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    ];
    let askLastError: unknown = null;

    for (const { model, thinkingLevel } of askModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: {
                  type: Type.STRING,
                  description: 'Comprehensive, empathetic, Markdown-formatted answer to the user question based on their journals.',
                },
                referencedJournals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      date: { type: Type.STRING },
                      excerpt: { type: Type.STRING, description: 'Short summary or quote of the relevant thought in this entry' },
                    },
                    required: ['id', 'title', 'date', 'excerpt'],
                  },
                  description: 'List of specific journals that contributed to the answer.',
                },
                keyInsights: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 4 key takeaways, patterns, or realization bullets.',
                },
                suggestedFollowUps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 relevant follow-up questions the user can ask next.',
                },
              },
              required: ['answer', 'referencedJournals', 'keyInsights', 'suggestedFollowUps'],
            },
          },
        });

        if (response && response.text) {
          askResponseText = response.text;
          break;
        }
      } catch (err) {
        askLastError = err;
      }
    }

    if (!askResponseText && askLastError) {
      throw askLastError;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(askResponseText || '{}');
    } catch {
      parsedResult = {
        answer: askResponseText || 'Here is what was found in your journal entries regarding your question.',
        referencedJournals: [],
        keyInsights: ['Synthesized from your recent reflections.'],
        suggestedFollowUps: [
          'What have I been thinking about this week?',
          'What concerns have I mentioned repeatedly?',
          'What goals have I mentioned?',
        ],
      };
    }

    res.json({
      answer: parsedResult.answer || 'Based on your journals, here is the synthesis of your thoughts.',
      referencedJournals: parsedResult.referencedJournals || [],
      keyInsights: parsedResult.keyInsights || [],
      suggestedFollowUps: parsedResult.suggestedFollowUps || [
        'What have I been thinking about this week?',
        'What concerns have I mentioned repeatedly?',
        'What moments of gratitude have I recorded?',
        'What goals have I mentioned?',
      ],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gemini Service] Ask My Journal rate limit or API notice, using local synthesis fallback:', errorMessage.slice(0, 100));

    res.json(synthesizeAskJournal(req.body.question || '', req.body.journals || []));
  }
});

/**
 * Monthly Reflection Endpoint (Protected)
 * Analyzes journal entries for a selected calendar month and generates
 * a structured, multi-section reflection synthesizing standout events,
 * moments of joy, recurring concerns, accomplishments, core values, and forward inquiry.
 */
app.post('/api/journal/monthly-reflection', requireAuth, async (req, res) => {
  try {
    const { month = '', monthDisplay = '', journals = [] } = req.body;

    if (!Array.isArray(journals) || journals.length === 0) {
      res.status(400).json({ error: 'No journal entries provided for the selected month.' });
      return;
    }

    const ai = await getAIClient();
    const effectiveMonthDisplay = monthDisplay || month || 'Selected Month';

    // Prepare journal context
    const journalSummaries = journals.slice(0, 30).map((j: {
      id?: string;
      title?: string;
      date?: string;
      mood?: string;
      tags?: string[];
      summary?: { summary?: string; keyThoughts?: string[]; reflection?: string; actionItems?: string[] } | null;
      messages?: Array<{ sender: string; text: string }>;
    }) => {
      const userThoughts = (j.messages || [])
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join(' | ');

      return {
        id: j.id || 'unknown',
        title: j.title || 'Untitled Session',
        date: j.date || 'Unknown Date',
        mood: j.mood || 'Reflective',
        tags: j.tags || [],
        summary: j.summary?.summary || 'No summary',
        keyThoughts: j.summary?.keyThoughts || [],
        reflection: j.summary?.reflection || '',
        userDialogueExcerpts: userThoughts.slice(0, 600),
      };
    });

    const contextText = JSON.stringify(journalSummaries, null, 2);
    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!ai) {
      res.json(synthesizeMonthlyReflection(month, effectiveMonthDisplay, journals));
      return;
    }

    const systemInstruction = `You are the Monthly Reflection AI Synthesizer inside "Personal Gemini Journal".
Your role is to deeply analyze the user's private journal entries for the specific month: "${effectiveMonthDisplay}".
Synthesize their experiences, emotional patterns, breakthroughs, and persistent questions.

Strict Guidelines:
1. "summaryOverview": 2 empathetic, articulate paragraphs capturing the overall narrative and emotional rhythm of this month.
2. "whatStoodOut": 3 to 5 bullet points highlighting important experiences, significant events, or major realizations that appeared in the entries.
3. "momentsOfJoy": 2 to 4 uplifting moments, gratitudes, positive experiences, or personal wins recorded.
4. "recurringConcerns": 2 to 4 worries, stress factors, or persistent questions that appeared across the month.
5. "accomplishments": 2 to 4 milestones reached, progress made, obstacles overcome, or healthy habits built.
6. "whatICaredAbout": 2 to 4 values, priorities, relationships, or interests that took center stage.
7. "questionToCarryForward": Exactly ONE profound, open-ended question to guide the upcoming month.
Strictly adhere to the JSON schema.`;

    const userPrompt = `User's Private Journal Archive for ${effectiveMonthDisplay} (${journalSummaries.length} entries):
${contextText}`;

    let reflectionResponseText = '';
    const modelsToTry = [
      { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    ];
    let lastError: unknown = null;

    for (const { model, thinkingLevel } of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.5,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summaryOverview: {
                  type: Type.STRING,
                  description: '2 thoughtful paragraphs capturing the overall narrative arc and emotional rhythm of this month.',
                },
                whatStoodOut: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 5 important experiences, events, or realizations.',
                },
                momentsOfJoy: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 uplifting moments, gratitudes, or positive experiences.',
                },
                recurringConcerns: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 worries, friction points, or persistent questions.',
                },
                accomplishments: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 milestones, obstacles overcome, or habits built.',
                },
                whatICaredAbout: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 core values, priorities, relationships, or passions.',
                },
                questionToCarryForward: {
                  type: Type.STRING,
                  description: 'One profound, open-ended question for the coming month.',
                },
              },
              required: [
                'summaryOverview',
                'whatStoodOut',
                'momentsOfJoy',
                'recurringConcerns',
                'accomplishments',
                'whatICaredAbout',
                'questionToCarryForward',
              ],
            },
          },
        });

        if (response && response.text) {
          reflectionResponseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!reflectionResponseText && lastError) {
      throw lastError;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(reflectionResponseText || '{}');
    } catch {
      parsedResult = {};
    }

    res.json({
      month,
      monthDisplay: effectiveMonthDisplay,
      totalEntries: journals.length,
      summaryOverview: parsedResult.summaryOverview || `A synthesis of your ${journals.length} reflection sessions recorded during ${effectiveMonthDisplay}.`,
      whatStoodOut: Array.isArray(parsedResult.whatStoodOut) && parsedResult.whatStoodOut.length > 0
        ? parsedResult.whatStoodOut
        : ['Reflected thoughtfully on life challenges and growth opportunities.'],
      momentsOfJoy: Array.isArray(parsedResult.momentsOfJoy) && parsedResult.momentsOfJoy.length > 0
        ? parsedResult.momentsOfJoy
        : ['Found moments of grounding and relief through dedicated journaling.'],
      recurringConcerns: Array.isArray(parsedResult.recurringConcerns) && parsedResult.recurringConcerns.length > 0
        ? parsedResult.recurringConcerns
        : ['Managing energy and commitments effectively.'],
      accomplishments: Array.isArray(parsedResult.accomplishments) && parsedResult.accomplishments.length > 0
        ? parsedResult.accomplishments
        : [`Maintained self-reflection practice across ${journals.length} sessions.`],
      whatICaredAbout: Array.isArray(parsedResult.whatICaredAbout) && parsedResult.whatICaredAbout.length > 0
        ? parsedResult.whatICaredAbout
        : ['Personal growth, emotional balance, and intentional action.'],
      questionToCarryForward: parsedResult.questionToCarryForward || 'How can you best support your well-being in the upcoming month?',
      generatedAt: nowFormatted,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gemini Service] Monthly Reflection rate limit or API notice, using local synthesis fallback:', errorMessage.slice(0, 100));

    res.json(
      synthesizeMonthlyReflection(
        req.body.month || '',
        req.body.monthDisplay || req.body.month || 'This Month',
        req.body.journals || []
      )
    );
  }
});

/**
 * Patterns & Themes Analysis Endpoint (Protected)
 * Analyzes journal entries over a specified timeframe (e.g. 30 days, 3 months, 6 months, all)
 * to uncover recurring themes, behavioral/emotional dynamics, evolutionary shifts, and tailored reflection questions.
 */
app.post('/api/journal/patterns', requireAuth, async (req, res) => {
  try {
    const { timeframe = '30-days', timeframeLabel = 'Last 30 days', dateRange = '', journals = [] } = req.body;

    if (!Array.isArray(journals) || journals.length === 0) {
      res.status(400).json({ error: 'No journal entries provided for pattern analysis.' });
      return;
    }

    const ai = await getAIClient();
    const effectiveLabel = timeframeLabel || 'Selected Period';

    // Prepare journal context
    const journalSummaries = journals.slice(0, 35).map((j: {
      id?: string;
      title?: string;
      date?: string;
      mood?: string;
      tags?: string[];
      summary?: { summary?: string; keyThoughts?: string[]; reflection?: string; keyThemes?: string[] } | null;
      messages?: Array<{ sender: string; text: string }>;
    }) => {
      const userThoughts = (j.messages || [])
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join(' | ');

      return {
        id: j.id || 'unknown',
        title: j.title || 'Untitled Session',
        date: j.date || 'Unknown Date',
        mood: j.mood || 'Reflective',
        tags: j.tags || [],
        summary: j.summary?.summary || 'No summary',
        keyThoughts: j.summary?.keyThoughts || [],
        keyThemes: j.summary?.keyThemes || [],
        userDialogueExcerpts: userThoughts.slice(0, 500),
      };
    });

    const contextText = JSON.stringify(journalSummaries, null, 2);
    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!ai) {
      res.json(synthesizePatternsAndThemes(timeframe, effectiveLabel, dateRange, journals));
      return;
    }

    const systemInstruction = `You are the Patterns & Themes Analyst for "Personal Gemini Journal".
Analyze the user's private journal entries across the timeframe: "${effectiveLabel}".
Synthesize high-level patterns, recurring thematic threads, emotional arcs, and behavioral habits.

Strict Instructions:
1. "recurringThemes": 3 to 5 recurring themes across the entries. Each item must have:
   - "name": Concise theme name (2 to 5 words).
   - "prominence": "High" | "Medium" | "Emerging"
   - "description": 1-2 sentence explanation of how this theme appeared in their entries.
   - "dateRangeOrEntries": Date range or specific session references.
2. "behavioralAndEmotionalPatterns": 3 to 4 behavioral/emotional pattern insights. Each item must have:
   - "title": Short descriptive title (2 to 5 words).
   - "category": "Emotional" | "Behavioral" | "Habit" | "Mindset"
   - "insight": 1-2 sentence detailed insight into the trigger, dynamic, or routine observed.
3. "growthAndEvolution": 2 to 3 paragraphs detailing how the user's perspectives, mindset, and coping strategies evolved over this period.
4. "reflectionQuestions": 2 to 3 deep, personalized, thought-provoking questions to help the user dive deeper into these patterns.
Strictly adhere to the JSON schema.`;

    const userPrompt = `User's Private Journal Archive for ${effectiveLabel} (Total ${journalSummaries.length} entries analyzed):
${contextText}`;

    let patternsResponseText = '';
    const modelsToTry = [
      { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    ];
    let lastError: unknown = null;

    for (const { model, thinkingLevel } of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recurringThemes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      prominence: { type: Type.STRING, description: 'High, Medium, or Emerging' },
                      description: { type: Type.STRING },
                      dateRangeOrEntries: { type: Type.STRING },
                    },
                    required: ['name', 'prominence', 'description', 'dateRangeOrEntries'],
                  },
                  description: '3 to 5 recurring themes across the timeframe.',
                },
                behavioralAndEmotionalPatterns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING, description: 'Emotional, Behavioral, Habit, or Mindset' },
                      insight: { type: Type.STRING },
                    },
                    required: ['title', 'category', 'insight'],
                  },
                  description: '3 to 4 behavioral and emotional patterns identified.',
                },
                growthAndEvolution: {
                  type: Type.STRING,
                  description: '2 to 3 paragraphs describing how the user has evolved over this period.',
                },
                reflectionQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 3 personalized reflection questions based on the patterns.',
                },
              },
              required: [
                'recurringThemes',
                'behavioralAndEmotionalPatterns',
                'growthAndEvolution',
                'reflectionQuestions',
              ],
            },
          },
        });

        if (response && response.text) {
          patternsResponseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!patternsResponseText && lastError) {
      throw lastError;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(patternsResponseText || '{}');
    } catch {
      parsedResult = {};
    }

    res.json({
      timeframe,
      timeframeLabel: effectiveLabel,
      totalEntriesAnalyzed: journals.length,
      dateRange: dateRange || 'Recorded Journal History',
      recurringThemes: Array.isArray(parsedResult.recurringThemes) && parsedResult.recurringThemes.length > 0
        ? parsedResult.recurringThemes
        : [
            {
              name: 'Mindful Self-Reflection',
              prominence: 'High',
              description: 'Regularly processed daily emotions and priorities with clarity.',
              dateRangeOrEntries: 'Across all analyzed sessions',
            },
          ],
      behavioralAndEmotionalPatterns: Array.isArray(parsedResult.behavioralAndEmotionalPatterns) && parsedResult.behavioralAndEmotionalPatterns.length > 0
        ? parsedResult.behavioralAndEmotionalPatterns
        : [
            {
              title: 'Emotional Awareness',
              category: 'Emotional',
              insight: 'Acknowledging feelings directly leads to faster clarity and calm.',
            },
          ],
      growthAndEvolution: parsedResult.growthAndEvolution || `Over ${effectiveLabel}, you have consistently used journaling to develop self-awareness and intentional daily choices.`,
      reflectionQuestions: Array.isArray(parsedResult.reflectionQuestions) && parsedResult.reflectionQuestions.length > 0
        ? parsedResult.reflectionQuestions
        : [
            'What is the most meaningful lesson you learned over this period?',
            'Which habit has brought you the greatest sense of calm?',
          ],
      generatedAt: nowFormatted,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gemini Service] Patterns & Themes rate limit or API notice, using local synthesis fallback:', errorMessage.slice(0, 100));

    res.json(
      synthesizePatternsAndThemes(
        req.body.timeframe || '30-days',
        req.body.timeframeLabel || 'Selected Period',
        req.body.dateRange || 'Recent Journal Period',
        req.body.journals || []
      )
    );
  }
});

// Setup Vite middleware for development or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini Journal server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
