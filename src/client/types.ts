export type TopicStatus = 'NotStarted' | 'InProgress' | 'Complete';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface Field {
  key: string;
  label: string;
  required: boolean;
  type?: 'text' | 'multiselect';
  options?: string[];
}

export interface ConditionalRule {
  field: string;
  operator: 'contains' | 'equals' | 'not_empty';
  value?: string | string[];
}

export interface TopicConfig {
  id: string;
  title: string;
  fields?: Field[];
  showIf?: ConditionalRule;
}

export interface TopicData {
  transcript: Message[];
  fields: Record<string, string | string[]>;
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

export interface AppConfig {
  appTitle: string;
  greeting: string;
  topics: TopicConfig[];
  docx: {
    title: string;
    fileName: string;
  };
}
