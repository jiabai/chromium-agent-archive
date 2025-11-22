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
  htmlMaxChars: number
} = {
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2', 10),
  timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
  model: process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V3.2-Exp',
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
  htmlMaxChars: parseInt(process.env.HTML_MAX_CHARS || '200000', 10)
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

function readHtmlFile(filePath: string): string {
  const absolutePath = path.resolve(filePath)
  const content = fs.readFileSync(absolutePath, 'utf8')
  return content
}

async function extractQADialogue(htmlContent: string, client: any): Promise<ExtractionResult> {
  if (htmlContent.length > OPENAI_CONFIG.htmlMaxChars) {
    return await extractQADialogueInBatches(htmlContent, client)
  }
  const prompt = `请从以下HTML文件中提取问答对话信息，并打印出来。请识别出用户的问题和AI的回答，以清晰的格式展示对话内容。\n\nHTML内容：\n${htmlContent}\n\n请按以下格式输出：\n用户: [用户的问题]\nAI: [AI的回答]\n\n请提取所有完整的问答对话对。`
  const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error(`请求超时 (${OPENAI_CONFIG.timeout}ms)`)), OPENAI_CONFIG.timeout) })
  const apiRequest = client.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      { role: 'system', content: '你是一个专业的HTML内容分析助手，擅长从HTML文件中提取对话信息。请准确识别用户问题和AI回答，并以清晰的格式展示。' },
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

async function extractQADialogueInBatches(htmlContent: string, client: any): Promise<ExtractionResult> {
  const batchSize = OPENAI_CONFIG.htmlMaxChars
  const batches: { content: string; index: number; isLast: boolean }[] = []
  for (let i = 0; i < htmlContent.length; i += batchSize) {
    const batch = htmlContent.slice(i, i + batchSize)
    batches.push({ content: batch, index: i, isLast: i + batchSize >= htmlContent.length })
  }
  const results: { batchIndex: number; content: string; tokenUsage: number | string }[] = []
  let totalTokenUsage = 0
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const prompt = `请从以下HTML片段中提取问答对话信息。这是第 ${i + 1}/${batches.length} 个片段。\n\nHTML片段：\n${batch.content}\n\n请按以下格式输出：\n用户: [用户的问题]\nAI: [AI的回答]\n\n只提取此片段中的完整问答对话对。${batch.isLast ? '' : '不需要包含之前片段的内容。'}`
    const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error(`批次 ${i + 1} 请求超时 (${OPENAI_CONFIG.timeout}ms)`)), OPENAI_CONFIG.timeout) })
    try {
      const apiRequest = client.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: '你是一个专业的HTML内容分析助手，擅长从HTML片段中提取对话信息。请准确识别用户问题和AI回答，并以清晰的格式展示。' },
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

function saveExtractedDialogue(extractionResult: ExtractionResult, htmlFilePath: string, htmlContent: string): string {
  const resultFilePath = path.join(process.cwd(), 'output', 'extracted-dialogue.txt')
  const batchInfo = extractionResult.batchCount ? `\n批次数: ${extractionResult.batchCount}` : ''
  const resultContent = `LLM Q&A Dialogue Extraction Results\nGenerated at: ${new Date().toISOString()}\nModel: ${extractionResult.model}\nHTML File: ${htmlFilePath}\nHTML Size: ${htmlContent.length} characters\nToken Usage: ${extractionResult.tokenUsage}${batchInfo}\n\n${extractionResult.content}`
  try { fs.mkdirSync(path.dirname(resultFilePath), { recursive: true }) } catch {}
  fs.writeFileSync(resultFilePath, resultContent, 'utf8')
  return resultFilePath
}

async function main(): Promise<void> {
  if (!OPENAI_CONFIG.apiKey) { throw new Error('未找到API密钥，请检查.env文件中的SILICONFLOW_API_KEY配置') }
  const client = await createOpenAIClient()
  const htmlFilePath = path.join(process.cwd(), 'output', 'page-captured.html')
  if (!fs.existsSync(htmlFilePath)) { throw new Error(`未找到HTML文件: ${htmlFilePath}`) }
  const htmlContent = readHtmlFile(htmlFilePath)
  const extracted = await extractQADialogue(htmlContent, client)
  const savedFilePath = saveExtractedDialogue(extracted, htmlFilePath, htmlContent)
  console.log(`Results saved to: ${savedFilePath}`)
}

const argv1 = process.argv[1] || ''
const isMainModule = argv1 ? (import.meta.url === `file://${argv1}` || import.meta.url === `file:///${argv1.replace(/\\/g, '/')}` || argv1 === fileURLToPath(import.meta.url)) : false
if (isMainModule) {
  main().catch((error: any) => { console.error('程序执行失败:', error); process.exit(1) })
}

export { createOpenAIClient, readHtmlFile, extractQADialogue, saveExtractedDialogue }