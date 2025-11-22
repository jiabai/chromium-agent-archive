import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'

type Args = { base: string; url: string; timeout: number }

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (name: string, def?: string) => {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i]
      if (a.startsWith(`--${name}=`)) return a.split('=')[1]
      if (a === `--${name}` && argv[i + 1]) return argv[i + 1]
    }
    return def
  }
  const base = get('base', process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222') as string
  const url = get('url', 'https://chat.deepseek.com/') as string
  const timeout = parseInt(get('timeout', '20000') as string)
  return { base, url, timeout }
}

function now(): string {
  const d = new Date()
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

class Logger {
  file: string
  constructor(file: string) {
    this.file = file
    try { fs.mkdirSync(path.dirname(file), { recursive: true }) } catch {}
  }
  log(...args: any[]) {
    const line = `[${new Date().toISOString()}] ${args.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')}\n`
    process.stdout.write(line)
    try { fs.appendFileSync(this.file, line) } catch {}
  }
}

async function j(base: string, p: string) {
  const r = await fetch(`${base}${p}`)
  const t = await r.text()
  try { return JSON.parse(t) } catch { throw new Error(`invalid json from ${base}${p}`) }
}

function cdp(ws: WebSocket, timeoutMs: number) {
  let id = 0
  const map = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; tid?: any }>()
  ws.on('message', m => {
    try {
      const d = JSON.parse(m.toString())
      if (d && typeof d.id === 'number' && map.has(d.id)) {
        const { resolve, tid } = map.get(d.id)!
        if (tid) clearTimeout(tid)
        map.delete(d.id)
        resolve(d)
      }
    } catch {}
  })
  ws.on('error', err => {
    for (const [key, v] of map.entries()) {
      if (v.tid) clearTimeout(v.tid)
      v.reject(new Error('ws error'))
      map.delete(key)
    }
  })
  ws.on('close', () => {
    for (const [key, v] of map.entries()) {
      if (v.tid) clearTimeout(v.tid)
      v.reject(new Error('ws closed'))
      map.delete(key)
    }
  })
  return async (method: string, params: any, to?: number): Promise<any> => {
    id += 1
    ws.send(JSON.stringify({ id, method, params }))
    return await new Promise((resolve, reject) => {
      const tid = setTimeout(() => {
        if (map.has(id)) {
          map.delete(id)
          reject(new Error(`cdp timeout for ${method}`))
        }
      }, typeof to === 'number' ? to : timeoutMs)
      map.set(id, { resolve, reject, tid })
    })
  }
}

async function ensureTarget(base: string) {
  const list = await j(base, '/json/list')
  const t = Array.isArray(list) ? list.find((x: any) => x && x.type === 'page' && typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : null
  return t || null
}

async function captureScreenshot(call: (m: string, p: any, to?: number) => Promise<any>, outPath: string) {
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
    async function run(){ const items = findItems(); let count = 0; for (const it of items) { const ok = await clickDelete(it); if (ok) count++; await wait(120) } const remain = findItems(); return { ok:true, deleted: count, remaining: remain.length } }
    return run(); })()`
}

function verifyEmptyScript(): string {
  return `(() => { const list = Array.from(document.querySelectorAll('aside a[href*="/chat/"], a[href*="/chat/"]')); return { ok: list.length===0, remain: list.length } })()`
}

async function main() {
  const args = parseArgs()
  const outDir = path.join(process.cwd(), 'output')
  const log = new Logger(path.join(process.cwd(), 'logs', `deepseek-clear-history_${now()}.log`))
  log.log('启动', JSON.stringify(args))
  let ws: WebSocket | null = null
  try {
    const t = await ensureTarget(args.base)
    if (!t) {
      log.log('异常', '未找到DeepSeek标签页')
      process.exitCode = 3
      return
    }
    ws = new WebSocket(t.webSocketDebuggerUrl)
    await new Promise(res => ws!.once('open', res))
    const call = cdp(ws, args.timeout)
    await call('Runtime.enable', {})
    await call('DOM.enable', {})
    await call('Accessibility.enable', {})
    await call('Page.enable', {})
    await call('Page.bringToFront', {})
    await captureScreenshot(call, path.join(outDir, `history-before_${now()}.png`))
    const openRes: any = await call('Runtime.evaluate', { expression: openSidebarScript(), awaitPromise: true, returnByValue: true })
    log.log('侧边栏', openRes?.result?.result?.value?.ok ? '已尝试打开' : '跳过')
    const delRes: any = await call('Runtime.evaluate', { expression: deleteChatsScript(), awaitPromise: true, returnByValue: true })
    const dval = delRes?.result?.result?.value
    log.log('删除统计', JSON.stringify(dval || {}))
    await captureScreenshot(call, path.join(outDir, `history-after_${now()}.png`))
    const v: any = await call('Runtime.evaluate', { expression: verifyEmptyScript(), awaitPromise: true, returnByValue: true })
    const empty = !!(v?.result?.result?.value?.ok)
    log.log('清空结果', empty ? '已清空' : '仍有残留')
    if (!empty) process.exitCode = 2
  } catch (e: any) {
    log.log('异常', e?.message || String(e))
    process.exitCode = 1
  } finally {
    try { await new Promise(res => setTimeout(res, 100)) } catch {}
    if (ws) { try { ws.close() } catch {} }
  }
}

main()