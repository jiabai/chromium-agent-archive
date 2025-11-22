import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { startMcp, stopMcp, callToolWithTimeout } from '../../../shared/mcp'
import { ConfigService } from '../../../config'
import fs from 'fs'
import path from 'path'

function getTextFromContentParts(parts: any): string {
  if (!Array.isArray(parts)) return ''
  const out: string[] = []
  for (const p of parts) {
    if (typeof (p as any)?.text === 'string') out.push((p as any).text)
    else if (typeof p === 'string') out.push(p as string)
    else if (p && typeof p === 'object') {
      if ((p as any).type === 'json' && (p as any).json) out.push(JSON.stringify((p as any).json))
      else out.push(JSON.stringify(p))
    }
  }
  return out.join('\n')
}

function extractHtml(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let html = raw
  const mHtml = raw.match(/```html\r?\n([\s\S]*?)\r?\n```/i)
  if (mHtml) html = mHtml[1]
  else {
    const mJson = raw.match(/```json\r?\n([\s\S]*?)\r?\n```/i)
    if (mJson) {
      try {
        const data = JSON.parse(mJson[1])
        const candidates = [data, (data as any)?.result, (data as any)?.html, (data as any)?.content]
        for (const c of candidates) {
          if (typeof c === 'string' && c.trim().length) { html = c; break }
          if (c && typeof c === 'object') {
            if (typeof (c as any).html === 'string' && (c as any).html.trim().length) { html = (c as any).html; break }
            if (typeof (c as any).value === 'string' && (c as any).value.trim().length) { html = (c as any).value; break }
          }
        }
      } catch {}
    } else {
      try {
        const data2 = JSON.parse(raw)
        const candidates2 = [data2, (data2 as any)?.result, (data2 as any)?.html, (data2 as any)?.content]
        for (const c of candidates2) {
          if (typeof c === 'string' && c.trim().length) { html = c; break }
          if (c && typeof c === 'object') {
            if (typeof (c as any).html === 'string' && (c as any).html.trim().length) { html = (c as any).html; break }
            if (typeof (c as any).value === 'string' && (c as any).value.trim().length) { html = (c as any).value; break }
          }
        }
      } catch {}
      const i = raw.indexOf('<html')
      const j = raw.lastIndexOf('</html>')
      if (i !== -1 && j !== -1 && j > i) html = raw.slice(i, j + 7)
    }
  }
  return html
}

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { id: 'deepSeekDomExport', name: 'DeepSeek DOM Export', version: '1.0.0', category: 'exporters', enabled: false },
  async init(c: PluginContext) { ctx = c },
  async start() {
    let mcp: { client?: any; transport?: any } | null = null
    try {
      mcp = await startMcp()
      const { client } = mcp
              const timeoutMs = ConfigService.getInstance().get('snapshot').toolCallTimeout
              const result = await callToolWithTimeout(client, 'evaluate_script', { function: `() => document.documentElement.outerHTML` }, timeoutMs)
      const raw = getTextFromContentParts(result?.content)
      const html = extractHtml(raw)
      const outPath = path.join(process.cwd(), 'output', 'page-captured.html')
      try { fs.mkdirSync(path.dirname(outPath), { recursive: true }) } catch {}
      fs.writeFileSync(outPath, html || raw, 'utf8')
      if (ctx) ctx.log.info('deepSeekDomExport', outPath)
    } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) } finally {
      if (mcp) { try { await stopMcp(mcp) } catch {} }
    }
  },
  async stop() {},
  async dispose() {}
}

export default plugin