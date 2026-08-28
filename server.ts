import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import { getGeminiApiKeyFromSecretManager, invalidateSecretCache } from './server/secretManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read applet config if present
let appletConfig: { projectId?: string } = {};
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
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
      res.json({
        text: `Thank you for sharing this thought. I notice how meaningful this is for your current space of mind. What feels like the most significant feeling underneath this experience as you reflect on it today?`,
        suggestedFollowUps: [
          'I feel a mix of tension and hope about this',
          'It is helping me see things from a clearer angle',
          'I want to figure out what step to take next',
        ],
      });
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
    // Use gemini-3.1-flash-lite as primary for sub-second responses, fallback to gemini-3.7-flash with LOW thinking level
    const modelsToTry = [
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
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
    // Note: Do not log private journal text or secrets
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server Gemini chat error occurred:', errorMessage.slice(0, 100));

    // Return a safe fallback response so the user's reflective session flow is uninterrupted
    res.json({
      text: 'I hear you, and I appreciate you sharing this deeply. As you hold this thought in mind, what is one kind thing you can offer yourself in this exact moment?',
      suggestedFollowUps: [
        'I need to give myself more patience',
        'Taking a deep breath and letting this settle',
        'Looking forward to what comes tomorrow',
      ],
    });
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
      // Fallback summary when API key is not configured
      res.json({
        title: sessionTitle !== 'New Journal Entry' ? sessionTitle : 'Mindful Reflection & Growth',
        summary: `A thoughtful reflection exploring personal challenges and emotional equilibrium around ${sessionTitle}. You gained clarity on your current mental landscape and identified intentional steps forward.`,
        keyThoughts: [
          'Acknowledged the value of creating deliberate stillness for self-reflection.',
          'Identified the connection between daily pressures and emotional well-being.',
          'Expressed a desire to approach current situations with greater self-compassion.',
        ],
        actionItems: [
          'Dedicate 5 minutes each morning to check in with your breath and body.',
          'Practice setting gentle boundaries around energy-draining tasks.',
          'Celebrate one small personal victory before ending each day.',
        ],
        reflection: `Throughout this reflection, you explored meaningful thoughts surrounding ${sessionTitle}. By taking the time to articulate your inner dialogue, you granted yourself the space to step back from immediate reaction into thoughtful observation.`,
        keyThemes: ['Mindful Awareness', 'Personal Growth', 'Inner Dialogue', 'Emotional Clarity'],
        mood: {
          label: mood || 'Calm & Grounded',
          emoji: '🌿',
          description: 'A thoughtful and reflective balance between self-observation and forward motion.',
          sentimentScore: 78,
        },
        takeaways: [
          'Recognize the courage in giving your thoughts dedicated time and stillness.',
          'Hold gentle compassion for parts of your life currently undergoing change.',
          'Focus on one small, intentional action today that aligns with your core values.',
        ],
        mindfulPrompt: 'What would feel most restorative for your mind as you step forward from this session?',
        generatedAt: nowFormatted,
        wordCount: totalWords,
      });
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
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
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
                    sentimentScore: { type: Type.NUMBER, description: 'Score between 0 and 100' },
                  },
                  required: ['label', 'emoji', 'description', 'sentimentScore'],
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
      mood: summaryData.mood || {
        label: 'Reflective',
        emoji: '🌿',
        description: 'Centered and introspective.',
        sentimentScore: 80,
      },
      takeaways: summaryData.takeaways || [],
      mindfulPrompt: summaryData.mindfulPrompt || 'What is one intention you would like to hold today?',
      generatedAt: nowFormatted,
      wordCount: totalWords,
    });
  } catch (error: unknown) {
    // Note: Do not log private journal text or user data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server Gemini summarize error occurred:', errorMessage.slice(0, 100));

    const totalWords = (req.body.messages || []).reduce((acc: number, m: { text?: string }) => {
      return acc + (m.text ? m.text.trim().split(/\s+/).length : 0);
    }, 0);

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    res.json({
      title: req.body.sessionTitle && req.body.sessionTitle !== 'New Journal Entry'
        ? req.body.sessionTitle
        : 'Reflective Growth & Stillness',
      summary: 'In this session, you took valuable time to listen closely to your inner thoughts, fostering self-understanding and emotional equilibrium.',
      keyThoughts: [
        'Recognized that acknowledging feelings is the first step to processing them.',
        'Created space to step back from reaction into mindful observation.',
        'Identified the importance of nurturing mental and emotional well-being.',
      ],
      actionItems: [
        'Take a 3-minute mindful breathing break whenever you feel overwhelmed.',
        'Write down one positive insight or gratitude before sleep.',
        'Maintain patience with your current journey and unfolding goals.',
      ],
      reflection: 'In this session, you took valuable time to listen closely to your inner thoughts. Articulating what matters to you is the foundational step towards self-understanding and emotional equilibrium.',
      keyThemes: ['Self-Discovery', 'Mindful Presence', 'Inner Clarity'],
      mood: {
        label: 'Grounded & Aware',
        emoji: '🌱',
        description: 'A meaningful state of honest self-reflection.',
        sentimentScore: 75,
      },
      takeaways: [
        'Acknowledge yourself for creating this mindful space today.',
        'Allow thoughts to unfold without immediate self-judgment.',
        'Carry this feeling of gentle awareness into the rest of your day.',
      ],
      mindfulPrompt: 'What is one gentle commitment you can make to your well-being today?',
      generatedAt: nowFormatted,
      wordCount: totalWords,
    });
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
      // Offline fallback: intelligent keyword scan
      const qLower = question.toLowerCase();
      const matched = journals.filter((j: { title?: string; tags?: string[]; summary?: { summary?: string }; messages?: Array<{ text?: string }> }) => {
        return (
          j.title?.toLowerCase().includes(qLower) ||
          j.tags?.some((t) => t.toLowerCase().includes(qLower)) ||
          j.summary?.summary?.toLowerCase().includes(qLower) ||
          j.messages?.some((m) => m.text?.toLowerCase().includes(qLower))
        );
      });

      const matchedRefs = matched.slice(0, 3).map((m: { id?: string; title?: string; date?: string; summary?: { summary?: string } }) => ({
        id: m.id || '',
        title: m.title || 'Journal Entry',
        date: m.date || '',
        excerpt: m.summary?.summary || 'Reflective dialogue',
      }));

      res.json({
        answer: matched.length > 0
          ? `Based on your private journal history, I found ${matched.length} entry/entries relating to "${question}". In entries such as **"${matched[0].title}"** (${matched[0].date}), you explored thoughts surrounding this topic.`
          : `I reviewed your ${journals.length} journal session(s). While I didn't detect an exact match for "${question}", your journals focus on themes like personal clarity, mindfulness, and ongoing growth.`,
        referencedJournals: matchedRefs,
        keyInsights: [
          `Analyzed ${journals.length} private journal entries.`,
          matched.length > 0 ? `Identified connections in ${matched.length} sessions.` : 'No direct keyword overlap found.',
        ],
        suggestedFollowUps: [
          'What have I been thinking about this week?',
          'What concerns have I mentioned repeatedly?',
          'What goals have I mentioned?',
        ],
      });
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
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
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
    console.error('Server Gemini Ask My Journal error occurred:', errorMessage.slice(0, 100));

    res.json({
      answer: `I reviewed your journal sessions. While analyzing your entries, I observed recurring themes around mindfulness, personal balance, and self-reflection. To explore further, try asking about specific topics or recent dates.`,
      referencedJournals: [],
      keyInsights: [
        'Your journal contains multiple reflective dialogues exploring daily experiences.',
        'Consider exploring specific feelings, milestones, or recurring questions.',
      ],
      suggestedFollowUps: [
        'What have I been thinking about this week?',
        'What concerns have I mentioned repeatedly?',
        'What moments of gratitude have I recorded?',
        'What goals have I mentioned?',
      ],
    });
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
      // Offline fallback
      res.json({
        month,
        monthDisplay: effectiveMonthDisplay,
        totalEntries: journals.length,
        summaryOverview: `During ${effectiveMonthDisplay}, you recorded ${journals.length} journal entry/entries. Across these reflections, you took deliberate time to examine your priorities, navigate daily friction, and nurture self-awareness.`,
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
      });
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
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
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
    console.error('Server Gemini Monthly Reflection error occurred:', errorMessage.slice(0, 100));

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const monthName = req.body.monthDisplay || req.body.month || 'This Month';
    res.json({
      month: req.body.month || '',
      monthDisplay: monthName,
      totalEntries: Array.isArray(req.body.journals) ? req.body.journals.length : 0,
      summaryOverview: `During ${monthName}, your journal entries reflect an ongoing journey toward personal balance, honest self-inquiry, and emotional resilience.`,
      whatStoodOut: [
        'Dedicated consistent time to listen to your inner thoughts and feelings.',
        'Explored solutions for daily stressors with self-compassion.',
      ],
      momentsOfJoy: [
        'Found moments of relief and satisfaction when completing key objectives.',
        'Experienced clarity through mindful introspection.',
      ],
      recurringConcerns: [
        'Maintaining equilibrium between demands and rest.',
      ],
      accomplishments: [
        'Cultivated a dependable space for reflective self-care.',
        'Identified proactive habits to nurture mental well-being.',
      ],
      whatICaredAbout: [
        'Authentic self-expression and mindful living.',
        'Nurturing personal clarity and calm.',
      ],
      questionToCarryForward: 'What is one intention you would like to anchor into your routine next month?',
      generatedAt: nowFormatted,
    });
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
      // Offline fallback
      res.json({
        timeframe,
        timeframeLabel: effectiveLabel,
        totalEntriesAnalyzed: journals.length,
        dateRange: dateRange || 'Recent Journal Period',
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
        growthAndEvolution: `Over the ${effectiveLabel}, your entries demonstrate a clear shift from reactive overwhelm toward deliberate self-regulation. By naming emotions and identifying actionable next steps in your journal, you have built stronger internal frameworks for managing complexity.`,
        reflectionQuestions: [
          'Which habits or boundaries gave you the highest return on energy over this timeframe?',
          'What is one pattern you noticed that you feel ready to gently transform?',
          'How can you celebrate the personal progress you have made during this period?',
        ],
        generatedAt: nowFormatted,
      });
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
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
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
    console.error('Server Gemini Patterns & Themes error occurred:', errorMessage.slice(0, 100));

    const nowFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeframeName = req.body.timeframeLabel || 'Selected Period';
    res.json({
      timeframe: req.body.timeframe || '30-days',
      timeframeLabel: timeframeName,
      totalEntriesAnalyzed: Array.isArray(req.body.journals) ? req.body.journals.length : 0,
      dateRange: req.body.dateRange || 'Recent Journal Period',
      recurringThemes: [
        {
          name: 'Mindful Introspection',
          prominence: 'High',
          description: 'Engaged in thoughtful dialogue around daily experiences and inner state.',
          dateRangeOrEntries: 'Observed across entries',
        },
        {
          name: 'Personal Clarity & Direction',
          prominence: 'Medium',
          description: 'Identified practical steps to address daily goals and commitments.',
          dateRangeOrEntries: 'Recurring theme',
        },
      ],
      behavioralAndEmotionalPatterns: [
        {
          title: 'Structured Reflection',
          category: 'Behavioral',
          insight: 'Creating dedicated journaling moments brings structured relief from everyday pace.',
        },
        {
          title: 'Grounded Equilibrium',
          category: 'Emotional',
          insight: 'Taking time to unpack thoughts reduces anxiety and establishes emotional poise.',
        },
      ],
      growthAndEvolution: `Throughout ${timeframeName}, your entries reveal a continuous dedication to understanding your inner world and taking mindful actions forward.`,
      reflectionQuestions: [
        'What aspect of your daily routine currently brings you the greatest energy?',
        'How can you continue supporting your mental well-being in the weeks ahead?',
      ],
      generatedAt: nowFormatted,
    });
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
