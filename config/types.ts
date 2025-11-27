export interface ChromeConfig {
  devtoolsUrl: string;
  timeoutMs: number;
}

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  timeout: number;
  maxRetries: number;
}

export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  model: string;
  maxTokens: number;
  htmlMaxChars: number;
  jsonMaxChars: number;
}

export interface NewChatConfig {
  axName: string;
  axRole: string;
  cdpTimeoutMs: number;
  maxTotalMs: number;
  axTimeoutMs: number;
  frameTimeoutMs: number;
}

export interface ClearHistoryConfig {
  timeoutMs: number;
}

export interface ChatInjectorConfig {
  text: string;
  targetUrl?: string;
}

export interface MCPConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface SnapshotConfig {
  connectionTimeout: number;
  toolCallTimeout: number;
  cleanupTimeout: number;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxBaseNameLength: number;
  allowedFilenameChars: RegExp;
  allowedExtensionChars: RegExp;
}

export interface PluginConfig {
  enabled: boolean;
  order: number;
}

export interface AppConfig {
  chrome: ChromeConfig;
  openai: OpenAIConfig;
  llm: LLMConfig;
  newChat: NewChatConfig;
  clearHistory: ClearHistoryConfig;
  chatInjector?: ChatInjectorConfig;
  mcp: MCPConfig;
  snapshot: SnapshotConfig;
  plugins: Record<string, PluginConfig>;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  outputDir: string;
}

export type ConfigKey = keyof AppConfig;