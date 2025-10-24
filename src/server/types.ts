export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface Field {
  key: string;
  label: string;
  required: boolean;
}

export interface TopicConfig {
  id: string;
  title: string;
  systemPrompt: string;
  userIntro: string;
  fields: Field[];
  completionRule: string;
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
  fields: Record<string, string>;
  status: TopicStatus;
}

export interface TopicState {
  sessionId: string;
  activeTopicId: string;
  topics: Record<string, TopicData>;
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
  topicId: string;
}
