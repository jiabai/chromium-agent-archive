import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import WebSocket from 'ws'
import path from 'path'
import fs from 'fs'
import { createCdpCall, CdpCall } from '../../../shared/cdp'

type CdpTarget = { type?: string; title?: string; url: string; webSocketDebuggerUrl: string }

const BASE = process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222'
const TARGET_URL = 'https://chat.deepseek.com/'
const TIMEOUT_MS = parseInt(process.env.CLEAR_TIMEOUT_MS || '20000', 10)

function now(): string {
  const d = new Date()
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

async function j(pathname: string): Promise<any> {
  const r = await fetch(`${BASE}${pathname}`)
  const t = await r.text()
  try { return JSON.parse(t) } catch { throw new Error('invalid json') }
}

async function ensureTarget(): Promise<CdpTarget | null> {
  const list = await j('/json/list')
  const t = Array.isArray(list) ? list.find((x: any) => x && x.type === 'page' && typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : null
  if (t) return t
  const r = await fetch(`${BASE}/json/new?${encodeURIComponent(TARGET_URL)}`)
  const txt = await r.text()
  try { return JSON.parse(txt) as CdpTarget } catch { return null }
}

async function captureScreenshot(call: CdpCall, outPath: string) {
  try { fs.mkdirSync(path.dirname(outPath), { recursive: true }) } catch {}
  const r = await call('Page.captureScreenshot', { format: 'png' })
  const b64 = r?.result?.data || r?.data
  if (typeof b64 === 'string' && b64.length) fs.writeFileSync(outPath, b64, 'base64')
}

function openSidebarScript(): string {
  return `(() => { try {
    const cands = [
      'button[aria-label*="Menu"]',
      'button[aria-label*="菜单"]',
      'button[aria-label*="侧边栏"]',
      '[data-testid*="sidebar"][role="button"]'
    ]
    for (const sel of cands) { const b = document.querySelector(sel); if (b) { try { b.click() } catch {} break } }
    return { ok:true }
  } catch { return { ok:false } } })()`
}

function deleteChatsScript(): string {
  return `(() => { const wait = ms => new Promise(r=>setTimeout(r,ms));
    function isChatItem(el){ const href = (el.getAttribute && el.getAttribute('href'))||''; if (href && href.includes('/chat/')) return true; const t = (el.textContent||'')+(el.innerText||''); if (/Chat|对话|会话/i.test(t)) return true; const a = el.closest && el.closest('a[href*="/chat/"]'); return !!a }
    function findItems(){ const list = Array.from(document.querySelectorAll('aside a[href*="/chat/"], a[href*="/chat/"], aside [role="listitem"], aside .chat-item, aside .conversation-item')); return list.filter(isChatItem) }
    async function clickDelete(item){ try { item.scrollIntoView({block:'center',inline:'center'}) } catch {}
      let menuBtn = item.querySelector('button[aria-label*="更多"], button[aria-label*="More"], [role="button"][aria-label*="更多"], [role="button"][aria-label*="More"]')
        || item.querySelector('button[aria-label*="菜单"], [role="button"][aria-label*="菜单"]')
        || item.querySelector('button:has(svg), [role="button"]:has(svg)')
      if (!menuBtn) return false; try { menuBtn.click() } catch {} await wait(120)
      const cont = document.querySelector('div[role="menu"]') || document
      let del = Array.from(cont.querySelectorAll('*')).find(x => /删除/i.test(x.textContent||'')) || Array.from(cont.querySelectorAll('*')).find(x => /Delete/i.test(x.textContent||''))
      if (!del) return false; try { del.click() } catch {} await wait(160)
      const dlg = document.querySelector('div[role="dialog"]') || document
      let conf = Array.from(dlg.querySelectorAll('button,[role="button"]')).find(x => /删除|确认|Delete|OK/i.test(x.textContent||''))
      if (conf) { try { conf.click() } catch {} }
      await wait(260)
      return true }
    async function run(){ let count = 0; while (true) { const items = findItems(); if (items.length === 0) break; const it = items[0]; const ok = await clickDelete(it); if (ok) count++; await wait(2000); const currentItems = findItems(); if (currentItems.length === 0) break; } const remain = findItems(); return { ok:true, deleted: count, remaining: remain.length } }
    return run(); })()`
}

function verifyEmptyScript(): string {
  return `(() => { const list = Array.from(document.querySelectorAll('aside a[href*="/chat/"], a[href*="/chat/"]')); return { ok: list.length===0, remain: list.length } })()`
}

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { id: 'clearHistory', name: 'Clear History', version: '1.0.0', category: 'maintenance', enabled: false },
  async init(c: PluginContext) { ctx = c },
  async start() {
    try {
      const t = await ensureTarget()
      if (!t) return
      const ws = new WebSocket(t.webSocketDebuggerUrl)
      await new Promise(res => ws.once('open', res))
      const call = createCdpCall(ws, TIMEOUT_MS)
      await call('Runtime.enable', {})
      await call('DOM.enable', {})
      await call('Accessibility.enable', {})
      await call('Page.enable', {})
      await call('Page.bringToFront', {})
      const outDir = path.join(process.cwd(), 'output')
      await captureScreenshot(call, path.join(outDir, `history-before_${now()}.png`))
      const openRes: any = await call('Runtime.evaluate', { expression: openSidebarScript(), awaitPromise: true, returnByValue: true })
      const delRes: any = await call('Runtime.evaluate', { expression: deleteChatsScript(), awaitPromise: true, returnByValue: true })
      const v: any = await call('Runtime.evaluate', { expression: verifyEmptyScript(), awaitPromise: true, returnByValue: true })
      const empty = !!(v?.result?.result?.value?.ok)
      await captureScreenshot(call, path.join(outDir, `history-after_${now()}.png`))
      if (ctx) ctx.log.info('clearHistory', openRes?.result?.result?.value, delRes?.result?.result?.value, empty)
      try { ws.close() } catch {}
    } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) }
  },
  async stop() {},
  async dispose() {}
}

export default plugin