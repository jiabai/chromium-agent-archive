import { ConfigService } from '../config';

export async function createOpenAIClient(): Promise<any> {
  const configService = ConfigService.getInstance();
  const openaiConfig = configService.get('openai');
  const llmConfig = configService.get('llm');
  const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>
  const mod = await dynamicImport('openai') as any
  const { OpenAI } = mod
  const useOpenAI = !!openaiConfig.apiKey
  const client = new OpenAI({
    apiKey: useOpenAI ? openaiConfig.apiKey : llmConfig.apiKey,
    baseURL: useOpenAI ? openaiConfig.baseURL : llmConfig.baseURL,
    timeout: useOpenAI ? openaiConfig.timeout : llmConfig.timeout,
    maxRetries: useOpenAI ? openaiConfig.maxRetries : llmConfig.maxRetries
  })
  return client
}