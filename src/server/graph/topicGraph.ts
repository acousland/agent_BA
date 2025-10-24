import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { TopicState, Message } from '../types.js';
import { loadConfig, getTopicById } from '../config/loader.js';
import { llm } from '../llm.js';
import { extractFields, checkCompletion } from './fieldExtractor.js';
import { getNextVisibleTopic, areAllVisibleTopicsComplete } from './conditionalLogic.js';

interface GraphState extends TopicState {
  userMessage?: string;
  assistantReply?: string;
}

async function processTopicNode(state: GraphState): Promise<Partial<GraphState>> {
  const config = loadConfig();
  const topicConfig = getTopicById(state.activeTopicId);

  if (!topicConfig) {
    return { assistantReply: 'Error: Topic not found.' };
  }

  const topicData = state.topics[state.activeTopicId];
  const isFirstMessage = topicData.transcript.length === 0;

  // If first message in this topic, send the intro
  if (isFirstMessage && !state.userMessage) {
    topicData.status = 'InProgress';
    topicData.transcript.push({
      role: 'assistant',
      text: topicConfig.userIntro
    });

    return {
      topics: state.topics,
      assistantReply: topicConfig.userIntro
    };
  }

  // Add user message to transcript
  if (state.userMessage) {
    topicData.transcript.push({
      role: 'user',
      text: state.userMessage
    });
  }

  // Build conversation context
  const conversationHistory = topicData.transcript
    .map(m => `${m.role}: ${m.text}`)
    .join('\n');

  // Build field information for the prompt
  const fieldInfo = topicConfig.fields.map(f => {
    if (f.type === 'multiselect' && f.options) {
      return `${f.label} (multiselect from: ${f.options.join(', ')})`;
    }
    return f.label;
  }).join(', ');

  // Generate AI response
  const messages = [
    new HumanMessage({
      content: `${topicConfig.systemPrompt}

${topicConfig.fields.some(f => f.type === 'multiselect' && f.options) ?
  'IMPORTANT: For multiselect fields, you must present the EXACT options listed below. The user should select from these exact options:\n' +
  topicConfig.fields
    .filter(f => f.type === 'multiselect' && f.options)
    .map(f => `- ${f.label}: ${f.options!.map(o => `"${o}"`).join(', ')}`)
    .join('\n') + '\n\n' : ''}Conversation so far:
${conversationHistory}

Respond naturally to continue the conversation. Guide the user to provide the information we need: ${fieldInfo}.
If you have all the required information, acknowledge it and let them know we can move on.`
    })
  ];

  const response = await llm.invoke(messages);
  const reply = response.content.toString();

  topicData.transcript.push({
    role: 'assistant',
    text: reply
  });

  // Extract fields from the full conversation
  const extractedFields = await extractFields(
    conversationHistory + `\nassistant: ${reply}`,
    topicConfig.fields,
    llm
  );

  console.log(`[processTopicNode] Topic ${state.activeTopicId} extracted fields:`, extractedFields);

  // Merge extracted fields with existing ones
  topicData.fields = { ...topicData.fields, ...extractedFields };

  // Check if topic is complete
  const isComplete = checkCompletion(topicData.fields, topicConfig.fields);
  console.log(`[processTopicNode] Topic ${state.activeTopicId} is complete:`, isComplete, 'Fields:', topicData.fields);

  if (isComplete) {
    topicData.status = 'Complete';
  }

  return {
    topics: state.topics,
    assistantReply: reply
  };
}

function shouldMoveToNextTopic(state: GraphState): string {
  const currentTopic = state.topics[state.activeTopicId];

  console.log('[shouldMoveToNextTopic] Current topic:', state.activeTopicId, 'Status:', currentTopic.status);

  if (currentTopic.status !== 'Complete') {
    console.log('[shouldMoveToNextTopic] Topic not complete, continuing');
    return 'continue';
  }

  // Check if there are more visible topics
  const nextTopic = getNextVisibleTopic(state, state.activeTopicId);
  console.log('[shouldMoveToNextTopic] Next visible topic:', nextTopic?.id || 'none');

  if (nextTopic) {
    return 'next';
  }

  // Check if all visible topics are complete
  if (areAllVisibleTopicsComplete(state)) {
    console.log('[shouldMoveToNextTopic] All visible topics complete');
    return 'done';
  }

  return 'continue';
}

async function moveToNextTopicNode(state: GraphState): Promise<Partial<GraphState>> {
  const nextTopic = getNextVisibleTopic(state, state.activeTopicId);

  if (!nextTopic) {
    return { done: true };
  }

  return {
    activeTopicId: nextTopic.id,
    done: false
  };
}

async function completeSessionNode(state: GraphState): Promise<Partial<GraphState>> {
  return {
    done: true,
    assistantReply: "Great! We've covered all the topics. You can now download your session summary."
  };
}

// Build the graph
const workflow = new StateGraph<GraphState>({
  channels: {
    sessionId: null,
    activeTopicId: null,
    topics: null,
    done: null,
    userMessage: null,
    assistantReply: null
  }
})
  .addNode('processTopic', processTopicNode)
  .addNode('moveToNext', moveToNextTopicNode)
  .addNode('complete', completeSessionNode)
  .addEdge('__start__', 'processTopic')
  .addConditionalEdges('processTopic', shouldMoveToNextTopic, {
    'continue': END,
    'next': 'moveToNext',
    'done': 'complete'
  })
  .addEdge('moveToNext', 'processTopic')
  .addEdge('complete', END);

export const topicGraph = workflow.compile();

export async function processMessage(
  state: TopicState,
  userMessage: string
): Promise<{ state: TopicState; reply: string }> {
  const graphState: GraphState = {
    ...state,
    userMessage
  };

  const result = await topicGraph.invoke(graphState);

  // Clean up the result to match TopicState
  const { userMessage: _, assistantReply, ...newState } = result as GraphState;

  return {
    state: newState as TopicState,
    reply: assistantReply || ''
  };
}

export async function initializeSession(state: TopicState): Promise<{ state: TopicState; reply: string }> {
  const config = loadConfig();
  const graphState: GraphState = {
    ...state
  };

  // Get initial greeting and first topic intro
  const greetingMessage = config.greeting;

  // Process the first topic to get its intro
  const result = await topicGraph.invoke(graphState);
  const { userMessage: _, assistantReply, ...newState } = result as GraphState;

  const fullReply = `${greetingMessage}\n\n${assistantReply || ''}`;

  return {
    state: newState as TopicState,
    reply: fullReply
  };
}
