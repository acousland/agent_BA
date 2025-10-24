import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import type { TopicState, Message } from '../types.js';
import { getAllSteps, getStepById, getTopicByFieldName } from '../config/loader.js';
import { llm } from '../llm.js';

interface GraphState extends TopicState {
  userMessage?: string;
  assistantReply?: string;
}

interface AgentResponse {
  value: string;
  confidence: number;
  needsMoreInput: boolean;
  missing?: string[];
}

async function callAgentWithRetry(
  conversationText: string,
  prePrompt: string,
  maxRetries: number
): Promise<AgentResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const messages = [new HumanMessage({ content: `${prePrompt}\n\n${conversationText}` })];
      const response = await llm.invoke(messages);
      const content = response.content.toString();

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as AgentResponse;

      // Validate required fields
      if (
        typeof parsed.value !== 'string' ||
        typeof parsed.confidence !== 'number' ||
        typeof parsed.needsMoreInput !== 'boolean'
      ) {
        throw new Error('Invalid JSON schema');
      }

      return parsed;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt + 1} for malformed JSON`);
      }
    }
  }

  // If all retries failed, return a default response
  console.error('Failed to get valid JSON after retries:', lastError);
  return {
    value: 'I apologize, but I encountered an error. Could you please rephrase your answer?',
    confidence: 0,
    needsMoreInput: true,
    missing: ['valid response']
  };
}

async function processTopicNode(state: GraphState): Promise<Partial<GraphState>> {
  const stepConfig = getStepById(state.activeStepId);
  const topicConfig = getTopicByFieldName(state.activeStepId, state.activeTopicId);

  if (!stepConfig || !topicConfig) {
    return { assistantReply: 'Error: Step or topic not found.' };
  }

  const stepData = state.steps[state.activeStepId];
  const topicData = stepData.topics[state.activeTopicId];
  const isFirstMessage = topicData.transcript.length === 0;

  // If first message in this topic, send the dialogue question
  if (isFirstMessage && !state.userMessage) {
    topicData.status = 'InProgress';
    stepData.status = 'InProgress';
    const question = topicConfig.dialogueAgent.question;

    topicData.transcript.push({
      role: 'assistant',
      text: question
    });

    return {
      steps: state.steps,
      assistantReply: question
    };
  }

  // Add user message to transcript
  if (state.userMessage) {
    topicData.transcript.push({
      role: 'user',
      text: state.userMessage
    });
  }

  // Build conversation context (limit by contextWindow)
  const contextWindow = topicConfig.agent.contextWindow;
  const recentTranscript = topicData.transcript.slice(-contextWindow);
  const conversationText = recentTranscript
    .map(m => `${m.role}: ${m.text}`)
    .join('\n');

  // Call agent with retry logic
  const agentResponse = await callAgentWithRetry(
    conversationText,
    topicConfig.agent.prePrompt,
    topicConfig.agent.retry.malformedJson
  );

  // Add assistant response to transcript
  topicData.transcript.push({
    role: 'assistant',
    text: agentResponse.value
  });

  // Update topic data with agent response
  topicData.value = agentResponse.value;
  topicData.confidence = agentResponse.confidence;
  topicData.needsMoreInput = agentResponse.needsMoreInput;
  topicData.missing = agentResponse.missing || [];

  // Check if topic is complete based on agent's needsMoreInput and confidence
  const minConfidence = topicConfig.agent.confidence.min;
  if (!agentResponse.needsMoreInput && agentResponse.confidence >= minConfidence) {
    topicData.status = 'Complete';
  }

  return {
    steps: state.steps,
    assistantReply: agentResponse.value
  };
}

function shouldMoveToNextTopic(state: GraphState): string {
  const stepData = state.steps[state.activeStepId];
  const topicData = stepData.topics[state.activeTopicId];

  if (topicData.status !== 'Complete') {
    return 'continue';
  }

  const stepConfig = getStepById(state.activeStepId);
  if (!stepConfig) return 'continue';

  // Find current topic index
  const currentTopicIndex = stepConfig.topics.findIndex(t => t.fieldName === state.activeTopicId);

  // If there are more topics in this step, move to next topic
  if (currentTopicIndex < stepConfig.topics.length - 1) {
    return 'next_topic';
  }

  // All topics in this step are complete, mark step as complete
  stepData.status = 'Complete';

  // Check if there are more steps
  const allSteps = getAllSteps();
  const currentStepIndex = allSteps.findIndex(s => s.stepId === state.activeStepId);

  if (currentStepIndex < allSteps.length - 1) {
    return 'next_step';
  }

  return 'done';
}

async function moveToNextTopicNode(state: GraphState): Promise<Partial<GraphState>> {
  const stepConfig = getStepById(state.activeStepId);
  if (!stepConfig) {
    return { assistantReply: 'Error: Step not found.' };
  }

  const currentTopicIndex = stepConfig.topics.findIndex(t => t.fieldName === state.activeTopicId);
  const nextTopic = stepConfig.topics[currentTopicIndex + 1];

  if (!nextTopic) {
    return { assistantReply: 'Error: Next topic not found.' };
  }

  return {
    activeTopicId: nextTopic.fieldName,
    done: false
  };
}

async function moveToNextStepNode(state: GraphState): Promise<Partial<GraphState>> {
  const allSteps = getAllSteps();
  const currentStepIndex = allSteps.findIndex(s => s.stepId === state.activeStepId);
  const nextStep = allSteps[currentStepIndex + 1];

  if (!nextStep) {
    return { done: true };
  }

  return {
    activeStepId: nextStep.stepId,
    activeTopicId: nextStep.topics[0].fieldName,
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
    activeStepId: null,
    activeTopicId: null,
    steps: null,
    done: null,
    userMessage: null,
    assistantReply: null
  }
})
  .addNode('processTopic', processTopicNode)
  .addNode('moveToNextTopic', moveToNextTopicNode)
  .addNode('moveToNextStep', moveToNextStepNode)
  .addNode('complete', completeSessionNode)
  .addEdge('__start__', 'processTopic')
  .addConditionalEdges('processTopic', shouldMoveToNextTopic, {
    'continue': END,
    'next_topic': 'moveToNextTopic',
    'next_step': 'moveToNextStep',
    'done': 'complete'
  })
  .addEdge('moveToNextTopic', 'processTopic')
  .addEdge('moveToNextStep', 'processTopic')
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
  const graphState: GraphState = {
    ...state
  };

  // Get initial greeting from first topic
  const result = await topicGraph.invoke(graphState);
  const { userMessage: _, assistantReply, ...newState } = result as GraphState;

  const greeting = 'Welcome! Let\'s work through creating your initiative idea. I\'ll guide you through each topic step by step.';
  const fullReply = `${greeting}\n\n${assistantReply || ''}`;

  return {
    state: newState as TopicState,
    reply: fullReply
  };
}
