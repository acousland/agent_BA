import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { TopicState, Message } from '../types.js';
import { loadConfig, getTopicById } from '../config/loader.js';
import { llm } from '../llm.js';
import { extractFields, checkCompletion } from './fieldExtractor.js';

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

  // Generate AI response
  const messages = [
    new HumanMessage({
      content: `${topicConfig.systemPrompt}

Conversation so far:
${conversationHistory}

Respond naturally to continue the conversation. Guide the user to provide the information we need: ${topicConfig.fields.map(f => f.label).join(', ')}.
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

  // Merge extracted fields with existing ones
  topicData.fields = { ...topicData.fields, ...extractedFields };

  // Check if topic is complete
  const isComplete = checkCompletion(topicData.fields, topicConfig.fields);
  if (isComplete) {
    topicData.status = 'Complete';
  }

  return {
    topics: state.topics,
    assistantReply: reply
  };
}

function shouldMoveToNextTopic(state: GraphState): string {
  const config = loadConfig();
  const currentTopic = state.topics[state.activeTopicId];

  if (currentTopic.status !== 'Complete') {
    return 'continue';
  }

  const currentIndex = config.topics.findIndex(t => t.id === state.activeTopicId);
  if (currentIndex < config.topics.length - 1) {
    return 'next';
  }

  return 'done';
}

async function moveToNextTopicNode(state: GraphState): Promise<Partial<GraphState>> {
  const config = loadConfig();
  const currentIndex = config.topics.findIndex(t => t.id === state.activeTopicId);
  const nextTopic = config.topics[currentIndex + 1];

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
