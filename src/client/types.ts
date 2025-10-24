export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface TopicConfig {
  id: string;
  title: string;
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

export interface AppConfig {
  appTitle: string;
  greeting: string;
  topics: TopicConfig[];
  docx: {
    title: string;
    fileName: string;
  };
}
