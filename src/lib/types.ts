export interface ToolCall {
  id: string;
  name: string;
  args?: Record<string, any>;
  result?: any[];
  status?: string;
}

export interface Thought {
  subject?: string;
  description?: string;
}

export interface ChatMessage {
  id?: string;
  type: 'user' | 'gemini' | 'info' | 'error';
  content?: any;
  toolCalls?: ToolCall[];
  thoughts?: Thought[];
  model?: string;
  timestamp?: string | number;
}

export interface ConversationTurn {
  id: string;
  userMsg: ChatMessage | null;
  systemContext: string | null;
  filesContext: string | null;
  cleanPrompt: string;
  rawText: string;
  toolCalls: ToolCall[];
  thoughts: Thought[];
  assistantMsgs: ChatMessage[];
  errorMsgs: ChatMessage[];
  infoMsgs: ChatMessage[];
  cancelled: boolean;
}

export interface ChatSession {
  id: string;
  projectHash: string;
  projectName: string;
  date: Date;
  startTime?: string | number;
  lastUpdated?: string | number;
  summary?: string;
  kind?: string;
  messages: ChatMessage[];
  filename: string;
  searchText: string;
}

export interface RecentFolder {
  id: string;
  actualPath: string;
  originalPath: string;
  path?: string;
  name?: string;
  chatCount: number;
  lastOpened: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}
