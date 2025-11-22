import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env')
const envResult = dotenv.config({ path: envPath })
if (envResult.error) {}

const OPENAI_CONFIG: { apiKey: string | undefined; baseURL: string; maxRetries: number; timeout: number; model: string } = {
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2', 10),
  timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
  model: process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V3.2-Exp'
}

async function createOpenAIClient(): Promise<any> {
  const mod = (await import('openai')) as any
  const { OpenAI } = mod
  const client = new OpenAI({ apiKey: OPENAI_CONFIG.apiKey, baseURL: OPENAI_CONFIG.baseURL, maxRetries: OPENAI_CONFIG.maxRetries, timeout: OPENAI_CONFIG.timeout })
  return client
}

async function pingLLM(client: any, model: string): Promise<string> {
  const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: '你好' }], max_tokens: 50, temperature: 0 })
  if (!response || !Array.isArray(response.choices) || response.choices.length === 0 || !response.choices[0]?.message?.content) {
    throw new Error('LLM响应不包含有效的choices或内容')
  }
  return response.choices[0].message.content as string
}

async function main(): Promise<void> {
  const client = await createOpenAIClient()
  const model = OPENAI_CONFIG.model
  const pong = await pingLLM(client, model)
  console.log(pong)
}

const argv1 = process.argv[1] || ''
const isMainModule = argv1 ? (import.meta.url === `file://${argv1}` || import.meta.url === `file:///${argv1.replace(/\\/g, '/')}` || argv1 === fileURLToPath(import.meta.url)) : false
if (isMainModule) {
  main().catch((error: any) => { console.error('程序执行失败:', error); process.exit(1) })
}

export { createOpenAIClient, pingLLM }