import type { ConditionalRule, TopicState, TopicConfig } from './types';

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
      return typeof fieldValue === 'string' && fieldValue.trim().length > 0;

    case 'equals':
      if (Array.isArray(fieldValue)) {
        return false;
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
export function getVisibleTopics(
  topics: TopicConfig[],
  state: TopicState | null
): TopicConfig[] {
  if (!state) {
    // If no state yet, show only topics without conditions
    return topics.filter(topic => !topic.showIf);
  }

  return topics.filter(topic => {
    // If no condition, always visible
    if (!topic.showIf) {
      return true;
    }

    // Evaluate the condition
    return evaluateCondition(topic.showIf, state);
  });
}
