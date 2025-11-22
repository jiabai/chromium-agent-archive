import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { startMcp, stopMcp } from '../../../shared/mcp'
import fs from 'fs'

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { id: 'totalLinks', name: 'Total Links Extractor', version: '1.0.0', category: 'extractors', enabled: false },
  async init(c: PluginContext) { ctx = c },
  async start() {
    let mcp: { client: any; transport: any } | null = null
    try {
      mcp = await startMcp()
      const { client } = mcp
      const res = await client.callTool({
        name: 'evaluate_script',
        arguments: {
          function: `() => {
            const linkElements = Array.from(document.querySelectorAll('a'));
            return {
              totalLinks: linkElements.length,
              links: linkElements.map(el => ({
                text: el.innerText?.trim(),
                href: el.href,
                title: el.title || '',
                className: el.className,
                id: el.id,
                isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
                rect: { top: el.getBoundingClientRect().top, left: el.getBoundingClientRect().left, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }
              })).filter(link => link.text && link.text.length > 0)
            };
          }`
        }
      })
      if (res && res.content && res.content.length > 0) {
        const content: string = res.content[0].text
        try {
          const m = content.match(/```json\n([\s\S]*?)\n```/)
          if (m) {
            const obj = JSON.parse(m[1])
            try { fs.mkdirSync('output', { recursive: true }) } catch {}
            fs.writeFileSync('output/page-text-content.json', JSON.stringify(obj, null, 2), 'utf8')
          } else {
            try { fs.mkdirSync('output', { recursive: true }) } catch {}
            fs.writeFileSync('output/page-text-content-raw.json', content, 'utf8')
          }
        } catch {
          try { fs.mkdirSync('output', { recursive: true }) } catch {}
          fs.writeFileSync('output/page-text-content-raw.json', content, 'utf8')
        }
      }
    } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) } finally {
      if (mcp) { try { await stopMcp(mcp) } catch {} }
    }
  },
  async stop() {},
  async dispose() {}
}

export default plugin