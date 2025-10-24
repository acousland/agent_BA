export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface TopicConfig {
  fieldName: string;
  displayName: string;
  description: string;
}

export interface StepConfig {
  stepId: string;
  displayName: string;
  topics: TopicConfig[];
}

export interface TopicData {
  transcript: Message[];
  value: string;
  confidence: number;
  needsMoreInput: boolean;
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

export interface AppConfig {
  defaultModel: string;
  steps: StepConfig[];
}
