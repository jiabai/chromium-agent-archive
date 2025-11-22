import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env')
const envResult = dotenv.config({ path: envPath })
if (envResult.error) {}

const OPENAI_CONFIG: {
  apiKey: string | undefined
  baseURL: string
  maxRetries: number
  timeout: number
  model: string
  maxTokens: number
  jsonMaxChars: number
} = {
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2', 10),
  timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
  model: process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V3.2-Exp',
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
  jsonMaxChars: parseInt(process.env.JSON_MAX_CHARS || '200000', 10)
}

type ExtractionResult = { content: string; tokenUsage: number | string; model: string; batchCount?: number }

async function createOpenAIClient(): Promise<any> {
  const mod = (await import('openai')) as any
  const { OpenAI } = mod
  const client = new OpenAI({
    apiKey: OPENAI_CONFIG.apiKey,
    baseURL: OPENAI_CONFIG.baseURL,
    maxRetries: OPENAI_CONFIG.maxRetries,
    timeout: OPENAI_CONFIG.timeout
  })
  return client
}

function readJsonFile(filePath: string): any {
  const absolutePath = path.resolve(filePath)
  const content = fs.readFileSync(absolutePath, 'utf8')
  const jsonData = JSON.parse(content)
  return jsonData
}

async function extractDialogueHistory(jsonData: any, client: any): Promise<ExtractionResult> {
  const jsonString = JSON.stringify(jsonData, null, 2)
  if (jsonString.length > OPENAI_CONFIG.jsonMaxChars) {
    return await extractDialogueHistoryInBatches(jsonData, client)
  }
  const prompt = `从中提取deepseek页面左边栏对话控制区中的问答对话历史的标题，和标题对应的deepseek url，并打印。\n\nJSON数据：\n${jsonString}\n\n请按以下格式输出：\n标题: [对话标题]\nURL: [对应的deepseek URL]\n\n请只提取属于deepseek页面左边栏对话控制区的对话历史，忽略其他不相关的链接。`
  const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error(`请求超时 (${OPENAI_CONFIG.timeout}ms)`)), OPENAI_CONFIG.timeout) })
  const apiRequest = client.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: '你是一个专业的JSON数据分析师，擅长从JSON数据中提取deepseek页面对话历史信息。请准确识别对话标题和对应的URL，并以清晰的格式展示。' },
      { role: 'user', content: prompt }
    ],
    max_tokens: OPENAI_CONFIG.maxTokens,
    temperature: 0.3
  })
  const response = await Promise.race([apiRequest, timeoutPromise]) as any
  if (!response || !Array.isArray(response.choices) || response.choices.length === 0 || !response.choices[0]?.message?.content) {
    throw new Error('LLM响应不包含有效的choices或内容')
  }
  const result: string = response.choices[0].message.content
  const tokenUsage: number | string = (response.usage?.total_tokens ?? 'N/A') as number | string
  return { content: result, tokenUsage, model: OPENAI_CONFIG.model }
}

async function extractDialogueHistoryInBatches(jsonData: any, client: any): Promise<ExtractionResult> {
  const links: any[] = jsonData.links || []
  const batchSize = Math.floor(OPENAI_CONFIG.jsonMaxChars / 200)
  const batches: { links: any[]; index: number; isLast: boolean }[] = []
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize)
    batches.push({ links: batch, index: i, isLast: i + batchSize >= links.length })
  }
  const results: { batchIndex: number; content: string; tokenUsage: number | string }[] = []
  let totalTokenUsage = 0
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const batchJson = { totalLinks: batch.links.length, links: batch.links }
    const batchString = JSON.stringify(batchJson, null, 2)
    const prompt = `从中提取deepseek页面左边栏对话控制区中的问答对话历史的标题，和标题对应的deepseek url。这是第 ${i + 1}/${batches.length} 个片段。\n\nJSON数据片段：\n${batchString}\n\n请按以下格式输出：\n标题: [对话标题]\nURL: [对应的deepseek URL]\n\n只提取此片段中属于deepseek页面左边栏对话控制区的对话历史，忽略其他不相关的链接。${batch.isLast ? '' : '不需要包含之前片段的内容。'}`
    const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error(`批次 ${i + 1} 请求超时 (${OPENAI_CONFIG.timeout}ms)`)), OPENAI_CONFIG.timeout) })
    try {
      const apiRequest = client.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: '你是一个专业的JSON数据分析师，擅长从JSON数据中提取deepseek页面对话历史信息。请准确识别对话标题和对应的URL，并以清晰的格式展示。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: 0.3
      })
      const response = await Promise.race([apiRequest, timeoutPromise]) as any
      if (!response || !Array.isArray(response.choices) || response.choices.length === 0 || !response.choices[0]?.message?.content) {
        throw new Error(`批次 ${i + 1} LLM响应不包含有效的choices或内容`)
      }
      const result: string = response.choices[0].message.content
      const tokenUsage: number | string = (response.usage?.total_tokens ?? 'N/A') as number | string
      if (typeof tokenUsage === 'number') totalTokenUsage += tokenUsage
      results.push({ batchIndex: i + 1, content: result, tokenUsage })
      if (i < batches.length - 1) { await new Promise(res => setTimeout(res, 1000)) }
    } catch (error: any) {
      results.push({ batchIndex: i + 1, content: `错误: 批次 ${i + 1} 处理失败 - ${error?.message || String(error)}`, tokenUsage: 0 })
    }
  }
  const mergedContent = results.map(r => r.content).join('\n\n')
  return { content: mergedContent, tokenUsage: totalTokenUsage, model: OPENAI_CONFIG.model, batchCount: batches.length }
}

function saveExtractedHistory(extractionResult: ExtractionResult, jsonFilePath: string, jsonData: any): string {
  const resultFilePath = path.join(process.cwd(), 'output', 'extracted-dialogue-history.txt')
  const batchInfo = extractionResult.batchCount ? `\n批次数: ${extractionResult.batchCount}` : ''
  const resultContent = `LLM Dialogue History Extraction Results\nGenerated at: ${new Date().toISOString()}\nModel: ${extractionResult.model}\nJSON File: ${jsonFilePath}\nJSON Size: ${JSON.stringify(jsonData).length} characters\nTotal Links: ${jsonData.totalLinks}\nToken Usage: ${extractionResult.tokenUsage}${batchInfo}\n\n${extractionResult.content}`
  try { fs.mkdirSync(path.dirname(resultFilePath), { recursive: true }) } catch {}
  fs.writeFileSync(resultFilePath, resultContent, 'utf8')
  return resultFilePath
}

async function main(): Promise<void> {
  if (!OPENAI_CONFIG.apiKey) { throw new Error('未找到API密钥，请检查.env文件中的SILICONFLOW_API_KEY配置') }
  const client = await createOpenAIClient()
  const jsonFilePath = path.join(process.cwd(), 'output', 'page-text-content.json')
  if (!fs.existsSync(jsonFilePath)) { throw new Error(`未找到JSON文件: ${jsonFilePath}`) }
  const jsonData = readJsonFile(jsonFilePath)
  const extracted = await extractDialogueHistory(jsonData, client)
  const savedFilePath = saveExtractedHistory(extracted, jsonFilePath, jsonData)
  console.log(`Results saved to: ${savedFilePath}`)
}

const argv1 = process.argv[1] || ''
const isMainModule = argv1 ? (import.meta.url === `file://${argv1}` || import.meta.url === `file:///${argv1.replace(/\\/g, '/')}` || argv1 === fileURLToPath(import.meta.url)) : false
if (isMainModule) {
  main().catch((error: any) => { console.error('程序执行失败:', error); process.exit(1) })
}

export { createOpenAIClient, readJsonFile, extractDialogueHistory, saveExtractedHistory }