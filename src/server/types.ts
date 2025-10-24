export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Agent configuration for structured output
export interface AgentSchema {
  type: string;
  properties: {
    value: {
      type: string;
      description: string;
    };
    confidence: {
      type: string;
      minimum: number;
      maximum: number;
    };
    needsMoreInput: {
      type: string;
    };
    missing?: {
      type: string;
      items: {
        type: string;
      };
    };
  };
  required: string[];
}

export interface AgentConfig {
  model: string;
  contextWindow: number;
  schema: AgentSchema;
  prePrompt: string;
  confidence: {
    min: number;
  };
  retry: {
    malformedJson: number;
  };
}

export interface DialogueAgent {
  question: string;
}

export interface TopicConfig {
  fieldName: string;
  displayName: string;
  description: string;
  extractionHint: string;
  required: boolean;
  dialogueAgent: DialogueAgent;
  agent: AgentConfig;
  completionCriteria: string;
}

export interface StepConfig {
  stepId: string;
  displayName: string;
  model: string;
  topics: TopicConfig[];
}

export interface AppBehaviour {
  topicSession: {
    retry: {
      malformedJson: number;
    };
    transcriptWindow: number;
  };
}

export interface AppConfig {
  defaultModel: string;
  steps: StepConfig[];
  appBehaviour: AppBehaviour;
}

export interface TopicData {
  transcript: Message[];
  value: string;
  confidence: number;
  needsMoreInput: boolean;
  missing: string[];
  status: TopicStatus;
}

export interface StepData {
  topics: Record<string, TopicData>;
  status: TopicStatus;
}

export interface TopicState {
  sessionId: string;
  activeStepId: string;
  activeTopicId: string;
  steps: Record<string, StepData>;
  done: boolean;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  state: TopicState;
}

export interface NavigateRequest {
  sessionId: string;
  stepId: string;
  topicId: string;
}
