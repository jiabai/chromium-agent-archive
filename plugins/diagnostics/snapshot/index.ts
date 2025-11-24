import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { startMcp, stopMcp, callToolWithTimeout } from '../../../shared/mcp'
import { ConfigService } from '../../../config'
import * as fs from 'fs'
import * as path from 'path'

function getTextFromContentParts(parts: any[]): string {
  try {
    if (!Array.isArray(parts)) return ''
    const out: string[] = []
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      try {
        if (typeof (p as any)?.text === 'string') out.push((p as any).text)
        else if (typeof p === 'string') out.push(p as string)
        else if (p && typeof p === 'object') {
          if ((p as any).type === 'json' && (p as any).json) out.push(JSON.stringify((p as any).json))
          else out.push(JSON.stringify(p))
        }
      } catch {}
    }
    const result = out.join('\n')
    return result
  } catch { return '' }
}

function extractSnapshotData(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  const mJson = raw.match(/```json\r?\n([\s\S]*?)\r?\n```/i)
  if (mJson) { try { const parsed = JSON.parse(mJson[1]); return JSON.stringify(parsed, null, 2) } catch {} }
  const mText = raw.match(/```text\r?\n([\s\S]*?)\r?\n```/i)
  if (mText) return mText[1]
  if (raw.includes('base64,') || /^[A-Za-z0-9+/]*={0,2}$/.test(raw.replace(/\s/g, ''))) return raw
  return raw
}

function generateSafeFilename(toolName: string, extension: string, outputDir: string): string {
  const baseName = `snapshot-${toolName}`
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-')
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '')
  if (!safeExtension) throw new Error('Invalid file extension')
  const basePath = path.join(outputDir, `${safeBaseName}.${safeExtension}`)
  if (!fs.existsSync(basePath)) return basePath
  let counter = 1
  while (counter <= 999) {
    const numberedPath = path.join(outputDir, `${safeBaseName}-${counter}.${safeExtension}`)
    if (!fs.existsSync(numberedPath)) return numberedPath
    counter++
  }
  throw new Error('Too many existing files, cannot generate unique filename')
}

let ctx: PluginContext | null = null

async function runSnapshot(): Promise<void> {
  let mcp: { client: any; transport: any } | null = null
  try {
    mcp = await startMcp()
    const { client } = mcp
    let tools: any
    tools = await client.listTools()
    const available: Set<string> = new Set<string>((tools?.tools || []).map((t: any) => t?.name as string))
    let selected: string | null = null
    let ext = 'json'
    if (available.has('take_screenshot')) { selected = 'take_screenshot'; ext = 'png' }
    else if (available.has('take_snapshot')) { selected = 'take_snapshot'; ext = 'json' }
    else if (available.has('evaluate_script')) { selected = 'evaluate_script'; ext = 'json' }
    if (!selected) return
    let result: any = null
    const timeoutMs = ConfigService.getInstance().get('snapshot').toolCallTimeout
    if (selected === 'take_screenshot') { result = await callToolWithTimeout(client, 'take_screenshot', { format: 'png', fullPage: true }, timeoutMs) }
    else if (selected === 'take_snapshot') { result = await callToolWithTimeout(client, 'take_snapshot', { verbose: true }, timeoutMs) }
    else if (selected === 'evaluate_script') { result = await callToolWithTimeout(client, 'evaluate_script', { function: `() => { return { url: window.location.href, title: document.title, timestamp: new Date().toISOString(), html: document.documentElement.outerHTML, viewport: { width: window.innerWidth, height: window.innerHeight } } }` }, timeoutMs) }
    if (result) {
      const raw = getTextFromContentParts(result?.content)
      const data = extractSnapshotData(raw)
      const outputDir = path.join(process.cwd(), 'output')
      const outPath = generateSafeFilename(selected, ext, outputDir)
      try { fs.mkdirSync(outputDir, { recursive: true }) } catch {}
      if (selected === 'take_screenshot') {
        const base64Pattern = /base64,([A-Za-z0-9+/\n\r]*={0,2})/
        const base64Match = data.match(base64Pattern)
        if (base64Match) { const base64Data = base64Match[1].replace(/[\n\r]/g, ''); fs.writeFileSync(outPath, base64Data, 'base64') } else { fs.writeFileSync(outPath, data || raw, 'utf8') }
      } else { fs.writeFileSync(outPath, data || raw, 'utf8') }
      if (ctx) ctx.log.info('snapshot', outPath)
    }
  } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) } finally {
    if (mcp) { try { await stopMcp(mcp) } catch {} }
  }
}

const plugin: Plugin = {
  meta: { 
    id: 'snapshot', 
    name: 'Snapshot', 
    version: '1.0.0', 
    category: 'diagnostics', 
    enabled: false,
    description: '页面快照诊断工具 - 通过MCP协议捕获页面截图、DOM快照或执行JavaScript评估，支持多种输出格式（PNG图片、JSON数据），自动保存到output目录。适用于页面状态记录、调试分析和问题诊断。'
  },
  async init(c: PluginContext) { ctx = c },
  async start() { await runSnapshot() },
  async stop() {},
  async dispose() {}
}

export default plugin