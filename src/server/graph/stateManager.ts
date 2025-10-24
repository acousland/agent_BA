import { v4 as uuidv4 } from 'uuid';
import type { TopicState, TopicData } from '../types.js';
import { loadConfig } from '../config/loader.js';

// In-memory session storage (in production, use Redis or a database)
const sessions = new Map<string, TopicState>();

export function createNewSession(): TopicState {
  const config = loadConfig();
  const sessionId = uuidv4();

  const topics: Record<string, TopicData> = {};
  config.topics.forEach(topic => {
    topics[topic.id] = {
      transcript: [],
      fields: {},
      status: 'NotStarted'
    };
  });

  const state: TopicState = {
    sessionId,
    activeTopicId: config.topics[0].id,
    topics,
    done: false
  };

  sessions.set(sessionId, state);
  return state;
}

export function getSession(sessionId: string): TopicState | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, state: TopicState): void {
  sessions.set(sessionId, state);
}

export function getOrCreateSession(sessionId?: string): TopicState {
  if (sessionId) {
    const existing = getSession(sessionId);
    if (existing) return existing;
  }
  return createNewSession();
}
