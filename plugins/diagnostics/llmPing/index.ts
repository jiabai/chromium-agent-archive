import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { createOpenAIClient } from '../../../shared/openai'

let ctx: PluginContext | null = null

async function runPing(): Promise<void> {
  const client = await createOpenAIClient()
  const model = process.env.MODEL_NAME || 'deepseek-ai/DeepSeek-V3.2-Exp'
  const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: '你好' }], max_tokens: 50, temperature: 0 })
  const text = (response?.choices?.[0]?.message?.content as string) || ''
  if (ctx) ctx.log.info('llmPing', text)
}

const plugin: Plugin = {
  meta: { id: 'llmPing', name: 'LLM Ping', version: '1.0.0', category: 'diagnostics', enabled: false },
  async init(c: PluginContext) { ctx = c },
  async start() { try { await runPing() } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) } },
  async stop() {},
  async dispose() {}
}

export default plugin