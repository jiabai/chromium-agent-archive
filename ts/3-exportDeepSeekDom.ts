import fs from 'fs'
import path from 'path'

const MCP_SERVER_CONFIG = {
  command: 'npx',
  args: ['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222'],
  env: { ...process.env, NODE_ENV: 'production' }
}

async function startMcp(): Promise<{ client: any; transport: any }> {
  const mod = (await import('@modelcontextprotocol/sdk/client/index.js')) as any
  const mod2 = (await import('@modelcontextprotocol/sdk/client/stdio.js')) as any
  const { Client } = mod
  const { StdioClientTransport } = mod2
  const transport = new StdioClientTransport(MCP_SERVER_CONFIG)
  const client = new Client({ name: 'chrome-mcp-dom-export-client', version: '1.0.0' }, { capabilities: {} })
  await client.connect(transport)
  return { client, transport }
}

async function stopMcp(mcpInstance: { client?: any; transport?: any } | null) {
  if (mcpInstance?.client) await mcpInstance.client.close()
  if (mcpInstance?.transport) await mcpInstance.transport.close()
}

function getTextFromContentParts(parts: any): string {
  if (!Array.isArray(parts)) return ''
  const out: string[] = []
  for (const p of parts) {
    if (typeof p?.text === 'string') out.push(p.text)
    else if (typeof p === 'string') out.push(p)
    else if (p && typeof p === 'object') {
      if (p.type === 'json' && p.json) out.push(JSON.stringify(p.json))
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
        const candidates = [data, data?.result, data?.html, data?.content]
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
        const candidates2 = [data2, data2?.result, data2?.html, data2?.content]
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

async function exportDeepSeekDom(): Promise<void> {
  let mcp: { client?: any; transport?: any } | null = null
  try {
    mcp = await startMcp()
    const { client } = mcp
    let tools: any
    try { tools = await client.listTools() } catch {}
    const names = new Set((tools?.tools || []).map((t: any) => t?.name))
    const result = await client.callTool({ name: 'evaluate_script', arguments: { function: `() => document.documentElement.outerHTML` } })
    const raw = getTextFromContentParts(result?.content)
    const html = extractHtml(raw)
    const outPath = path.join(process.cwd(), 'output', 'page-captured.html')
    try { fs.mkdirSync(path.dirname(outPath), { recursive: true }) } catch {}
    fs.writeFileSync(outPath, html || raw, 'utf8')
    console.log(`captured: ${outPath}`)
  } catch (e: any) {
    console.error(e?.message || String(e))
  } finally {
    if (mcp) await stopMcp(mcp)
    process.exit(0)
  }
}

exportDeepSeekDom()