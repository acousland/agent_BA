import { v4 as uuidv4 } from 'uuid';
import type { TopicState, TopicData, StepData } from '../types.js';
import { getAllSteps } from '../config/loader.js';

// In-memory session storage (in production, use Redis or a database)
const sessions = new Map<string, TopicState>();

export function createNewSession(): TopicState {
  const steps = getAllSteps();
  const sessionId = uuidv4();

  const stepsData: Record<string, StepData> = {};
  steps.forEach(step => {
    const topics: Record<string, TopicData> = {};
    step.topics.forEach(topic => {
      topics[topic.fieldName] = {
        transcript: [],
        value: '',
        confidence: 0,
        needsMoreInput: true,
        missing: [],
        status: 'NotStarted'
      };
    });

    stepsData[step.stepId] = {
      topics,
      status: 'NotStarted'
    };
  });

  const state: TopicState = {
    sessionId,
    activeStepId: steps[0].stepId,
    activeTopicId: steps[0].topics[0].fieldName,
    steps: stepsData,
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
