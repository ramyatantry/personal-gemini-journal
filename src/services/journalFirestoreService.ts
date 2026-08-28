import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalSession } from '../types';

/**
 * Returns the Firestore collection reference for an authenticated user's private journals.
 * Enforces isolation under /users/{userId}/journals
 */
export function getUserJournalsCollectionRef(userId: string) {
  return collection(db, 'users', userId, 'journals');
}

/**
 * Returns a document reference for a specific journal session under the user's path.
 */
export function getUserJournalDocRef(userId: string, journalId: string) {
  return doc(db, 'users', userId, 'journals', journalId);
}

/**
 * Subscribes in real-time to all journal sessions belonging to the authenticated user.
 * Note: Never accepts a foreign or unauthenticated UID.
 */
export function subscribeToUserJournals(
  userId: string,
  onSuccess: (sessions: JournalSession[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const journalsQuery = query(
    getUserJournalsCollectionRef(userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    journalsQuery,
    (snapshot) => {
      const sessions: JournalSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sessions.push({
          id: data.id || docSnap.id,
          title: data.title || 'Untitled Reflection',
          date: data.date || '',
          time: data.time || '',
          status: data.status || 'in-progress',
          mood: data.mood || 'Reflective',
          messages: Array.isArray(data.messages) ? data.messages : [],
          summary: data.summary || null,
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      });
      onSuccess(sessions);
    },
    (err) => {
      console.error(`Firestore real-time subscription error for user [${userId}]:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Saves or updates a journal session strictly inside the user's private collection.
 * Attaches the authenticated userId to ensure document integrity against rule verification.
 */
export async function saveJournalSessionToFirestore(
  userId: string,
  session: JournalSession
): Promise<void> {
  const docRef = getUserJournalDocRef(userId, session.id);
  const now = Date.now();

  const payload = {
    id: session.id,
    userId,
    title: session.title,
    date: session.date,
    time: session.time,
    status: session.status,
    mood: session.mood || 'Reflective',
    tags: session.tags || [],
    messages: session.messages,
    summary: session.summary || null,
    updatedAt: now,
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Deletes a journal session from the user's private collection.
 */
export async function deleteJournalSessionFromFirestore(
  userId: string,
  sessionId: string
): Promise<void> {
  const docRef = getUserJournalDocRef(userId, sessionId);
  await deleteDoc(docRef);
}

/**
 * Fetches a single journal session by ID from the user's private collection.
 */
export async function fetchUserJournalSession(
  userId: string,
  sessionId: string
): Promise<JournalSession | null> {
  const docRef = getUserJournalDocRef(userId, sessionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  return {
    id: data.id || snap.id,
    title: data.title || 'Untitled Reflection',
    date: data.date || '',
    time: data.time || '',
    status: data.status || 'in-progress',
    mood: data.mood || 'Reflective',
    messages: Array.isArray(data.messages) ? data.messages : [],
    summary: data.summary || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}
