import type { ConditionalRule, TopicState, TopicConfig } from '../types.js';
import { loadConfig } from '../config/loader.js';

/**
 * Evaluate if a conditional rule is met based on current state
 */
export function evaluateCondition(
  rule: ConditionalRule,
  state: TopicState
): boolean {
  // Find the field value across all topics
  let fieldValue: string | string[] | undefined;

  for (const topicId in state.topics) {
    const topicData = state.topics[topicId];
    if (topicData.fields[rule.field] !== undefined) {
      fieldValue = topicData.fields[rule.field];
      break;
    }
  }

  if (fieldValue === undefined) {
    return false;
  }

  switch (rule.operator) {
    case 'not_empty':
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      return fieldValue.trim().length > 0;

    case 'equals':
      if (Array.isArray(fieldValue)) {
        return false; // Can't use equals on array
      }
      return fieldValue === rule.value;

    case 'contains':
      if (Array.isArray(fieldValue) && typeof rule.value === 'string') {
        return fieldValue.includes(rule.value);
      }
      if (Array.isArray(fieldValue) && Array.isArray(rule.value)) {
        return rule.value.some(v => fieldValue.includes(v));
      }
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.includes(rule.value);
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get all topics that should be visible based on current state
 */
export function getVisibleTopics(state: TopicState): TopicConfig[] {
  const config = loadConfig();

  const visibleTopics = config.topics.filter(topic => {
    // If no condition, always visible
    if (!topic.showIf) {
      return true;
    }

    // Evaluate the condition
    const isVisible = evaluateCondition(topic.showIf, state);
    console.log(`[getVisibleTopics] Topic ${topic.id} (${topic.title}): showIf condition =`, isVisible);
    return isVisible;
  });

  console.log('[getVisibleTopics] Visible topic IDs:', visibleTopics.map(t => t.id));
  return visibleTopics;
}

/**
 * Find the next visible incomplete topic
 */
export function getNextVisibleTopic(state: TopicState, currentTopicId: string): TopicConfig | null {
  const visibleTopics = getVisibleTopics(state);
  const currentIndex = visibleTopics.findIndex(t => t.id === currentTopicId);

  // Find next incomplete topic
  for (let i = currentIndex + 1; i < visibleTopics.length; i++) {
    const topic = visibleTopics[i];
    const topicData = state.topics[topic.id];

    if (!topicData || topicData.status !== 'Complete') {
      return topic;
    }
  }

  return null;
}

/**
 * Check if all visible topics are complete
 */
export function areAllVisibleTopicsComplete(state: TopicState): boolean {
  const visibleTopics = getVisibleTopics(state);

  return visibleTopics.every(topic => {
    const topicData = state.topics[topic.id];
    return topicData && topicData.status === 'Complete';
  });
}
