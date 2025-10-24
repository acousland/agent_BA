export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface Field {
  key: string;
  label: string;
  required: boolean;
  type?: 'text' | 'multiselect'; // Default is 'text'
  options?: string[]; // For multiselect fields
}

export interface ConditionalRule {
  field: string; // Field key to check
  operator: 'contains' | 'equals' | 'not_empty'; // How to evaluate
  value?: string | string[]; // Value to check against
}

export interface TopicConfig {
  id: string;
  title: string;
  systemPrompt: string;
  userIntro: string;
  fields: Field[];
  completionRule: string;
  showIf?: ConditionalRule; // Optional: only show this topic if condition is met
}

export interface AppConfig {
  appTitle: string;
  greeting: string;
  topics: TopicConfig[];
  docx: {
    title: string;
    fileName: string;
  };
}

export interface TopicData {
  transcript: Message[];
  fields: Record<string, string | string[]>; // Can be string or array for multiselect
  status: TopicStatus;
  revisitCount?: number;
}

export interface TopicState {
  sessionId: string;
  activeTopicId: string;
  topics: Record<string, TopicData>;
  done: boolean;
  revisitingTopicId: string | null;
  resumeTopicId: string | null;
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
  topicId: string;
}
