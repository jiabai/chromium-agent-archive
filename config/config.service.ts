import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfig } from './types';

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'app.config.json');
    this.loadEnvironment();
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadEnvironment(): void {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenvConfig({ path: envPath });
    }
  }

  private loadConfig(): AppConfig {
    let fileConfig: Partial<AppConfig> = {};
    
    if (fs.existsSync(this.configPath)) {
      try {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        fileConfig = JSON.parse(configContent);
      } catch (error) {
        console.warn('配置文件解析失败，使用默认配置:', error);
      }
    }

    return this.mergeConfig(fileConfig);
  }

  private mergeConfig(fileConfig: Partial<AppConfig>): AppConfig {
    const defaultConfig: AppConfig = {
      chrome: {
        devtoolsUrl: process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222',
        timeoutMs: parseInt(process.env.CHROME_TIMEOUT_MS || '30000', 10)
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || undefined,
        timeout: Number(process.env.OPENAI_TIMEOUT || 30000),
        maxRetries: Number(process.env.OPENAI_MAX_RETRIES || 2)
      },
      llm: {
        apiKey: process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY || '',
        baseURL: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1',
        timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2', 10),
        model: process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V3.2-Exp',
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
        htmlMaxChars: parseInt(process.env.HTML_MAX_CHARS || '200000', 10),
        jsonMaxChars: parseInt(process.env.JSON_MAX_CHARS || '200000', 10)
      },
      newChat: {
        axName: process.env.NEWCHAT_AX_NAME || '开启新对话',
        axRole: process.env.NEWCHAT_AX_ROLE || 'button',
        cdpTimeoutMs: parseInt(process.env.CDP_TIMEOUT_MS || '10000', 10),
        maxTotalMs: parseInt(process.env.NEWCHAT_MAX_TOTAL_MS || '20000', 10),
        axTimeoutMs: parseInt(process.env.NEWCHAT_AX_TIMEOUT_MS || '6000', 10),
        frameTimeoutMs: parseInt(process.env.NEWCHAT_FRAME_TIMEOUT_MS || '6000', 10)
      },
      clearHistory: {
        timeoutMs: parseInt(process.env.CLEAR_TIMEOUT_MS || '20000', 10)
      },
      mcp: {
        command: 'npx',
        args: ['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222'],
        env: { ...process.env, NODE_ENV: 'production' }
      },
      snapshot: {
        connectionTimeout: 30000,
        toolCallTimeout: 60000,
        cleanupTimeout: 5000,
        maxRetries: 3,
        retryDelay: 2000,
        backoffMultiplier: 2,
        maxBaseNameLength: 100,
        allowedFilenameChars: /[^a-zA-Z0-9-_]/g,
        allowedExtensionChars: /[^a-zA-Z0-9]/g
      },
      plugins: {
        newChatOpener: { enabled: false, order: 1 },
        chatInjector: { enabled: false, order: 2 },
        clearHistory: { enabled: false, order: 3 },
        totalLinks: { enabled: false, order: 4 },
        snapshot: { enabled: false, order: 5 },
        llmPing: { enabled: false, order: 6 },
        historyRecord: { enabled: false, order: 7 },
        deepSeekDomExport: { enabled: false, order: 8 },
        conversationThread: { enabled: false, order: 9 }
      },
      logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      outputDir: process.env.OUTPUT_DIR || 'output'
    };

    return this.deepMerge(defaultConfig, fileConfig);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public getAll(): AppConfig {
    return { ...this.config };
  }

  public update<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  public updatePartial(updates: Partial<AppConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.saveConfig();
  }

  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('保存配置文件失败:', error);
    }
  }

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.config.openai.apiKey && !this.config.llm.apiKey) {
      errors.push('缺少API密钥配置 (OPENAI_API_KEY 或 SILICONFLOW_API_KEY)');
    }

    if (this.config.llm.timeout < 1000) {
      errors.push('LLM超时时间不能小于1000ms');
    }

    if (this.config.chrome.timeoutMs < 5000) {
      errors.push('Chrome超时时间不能小于5000ms');
    }

    if (this.config.newChat.maxTotalMs < this.config.newChat.cdpTimeoutMs) {
      errors.push('新对话总时间不能小于CDP超时时间');
    }

    return errors;
  }

  public isValid(): boolean {
    return this.validate().length === 0;
  }
}

export const config = ConfigService.getInstance();