import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { Builder, WebDriver } from 'selenium-webdriver'
import WebSocket from 'ws'
import { createCdpCall, CdpCall } from '../../../shared/cdp'

type CdpTarget = { type?: string; title?: string; url: string; webSocketDebuggerUrl: string }

const BASE = process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222'
const TARGET_URL = 'https://chat.deepseek.com'
const TEXT = '请搜索NemoVideo这家公司的信息'

function injection(text: string): string {
  const s = JSON.stringify(text)
  return `(() => {
    const sels = ["textarea","[contenteditable=\\\"true\\\"]","[role=\\\"textbox\\\"]","input[type=\\\"text\\\"]",".ProseMirror","div[aria-label]","div[placeholder]","[data-slate-editor]","[data-testid*=\\\"editor\\\"]","[data-lexical-editor]"]
    let el = null
    let used = null
    for (const q of sels){ const e = document.querySelector(q); if (e) { el = e; used = q; break } }
    if (!el) return { ok:false, msg:'no input' }
    const tag = (el.tagName||'').toLowerCase()
    el.focus()
    if (tag==='textarea' || (tag==='input' && el.type==='text')) {
      const proto = tag==='textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      const desc = Object.getOwnPropertyDescriptor(proto,'value')
      if (desc && desc.set) desc.set.call(el, ${s}); else el.value = ${s}
      try { el.dispatchEvent(new InputEvent('input',{bubbles:true,data:${s},inputType:'insertText'})) } catch {}
      el.dispatchEvent(new Event('input',{bubbles:true}))
      el.dispatchEvent(new Event('change',{bubbles:true}))
    } else if (el.isContentEditable) {
      const r = document.createRange(); r.selectNodeContents(el); r.deleteContents(); el.textContent = ${s}
      try { el.dispatchEvent(new InputEvent('input',{bubbles:true,data:${s},inputType:'insertText'})) } catch {}
      el.dispatchEvent(new Event('input',{bubbles:true}))
    } else {
      el.textContent = ${s}
      el.dispatchEvent(new Event('input',{bubbles:true}))
    }
    el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}))
    el.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}))
    const container = el.closest('form') || el.parentElement || document
    const btnSels = [
      'button[type=\\\"submit\\\"]',
      'button[aria-label*=\\\"发送\\\"]',
      'button[aria-label*=\\\"Send\\\"]',
      '[role=\\\"button\\\"][aria-label*=\\\"发送\\\"]',
      '[role=\\\"button\\\"][aria-label*=\\\"Send\\\"]',
      '[data-testid*=\\\"send\\\"]',
      '[aria-label*=\\\"提交\\\"]',
      '[aria-label*=\\\"Submit\\\"]'
    ]
    let btn = null
    for (const qs of btnSels){ btn = container.querySelector(qs) || document.querySelector(qs); if (btn) break }
    if (btn) {
      const evInit = { bubbles:true, cancelable:true }
      btn.dispatchEvent(new MouseEvent('pointerdown', evInit))
      btn.dispatchEvent(new MouseEvent('mousedown', evInit))
      btn.dispatchEvent(new MouseEvent('click', evInit))
      btn.dispatchEvent(new MouseEvent('mouseup', evInit))
    } else {
      const active = document.activeElement || el
      active.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}))
      active.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}))
    }
    return { ok:true, selector: used, tag: el.tagName, contenteditable: !!el.isContentEditable }
  })()`
}

async function j(path: string): Promise<any> {
  const r = await fetch(`${BASE}${path}`)
  return await r.json()
}

async function findDeepseekTarget(): Promise<CdpTarget | undefined> {
  const list = await j('/json/list')
  return Array.isArray(list) ? list.find((x: any) => typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : undefined
}


async function runCdpDirect(): Promise<void> {
  let list = await j('/json/list')
  let t: CdpTarget | undefined = Array.isArray(list) ? list.find((x: any) => typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : undefined
  if (!t) {
    const r = await fetch(`${BASE}/json/new?${encodeURIComponent(TARGET_URL)}`)
    t = await r.json()
  }
  const ws = new WebSocket((t as CdpTarget).webSocketDebuggerUrl)
  await new Promise(res => ws.once('open', res))
  const call = createCdpCall(ws)
  await call('Runtime.enable', {})
  await call('Page.bringToFront', {})
  const expr = injection(TEXT)
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true })
    const result = r?.result?.result?.value || r?.result || r
    console.log(`[chatInjector] 文本注入${result?.ok ? '成功' : '失败'}${result?.selector ? ` (使用选择器: ${result.selector})` : ''}${result?.msg ? ` - ${result.msg}` : ''}`)
    ws.close()
}

async function runWithWebDriverOrFallback(): Promise<void> {
  const caps: any = { browserName: 'chrome', 'goog:chromeOptions': { debuggerAddress: '127.0.0.1:9222' } }
  let driver: WebDriver | undefined
  try {
    driver = await new Builder().withCapabilities(caps).build()
  } catch (e) {
    await runCdpDirect()
    return
  }
  try {
    await driver.get(TARGET_URL)
    let t = await findDeepseekTarget()
    if (!t) {
      await driver.get(TARGET_URL)
      t = await findDeepseekTarget()
    }
    if (!t) {
      await runCdpDirect()
      return
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl)
    await new Promise(res => ws.once('open', res))
    const call = createCdpCall(ws)
    await call('Runtime.enable', {})
    await call('Page.bringToFront', {})
    const expr = injection(TEXT)
    const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true })
    const result = r?.result?.result?.value || r?.result || r
    console.log(`[chatInjector] 文本注入${result?.ok ? '成功' : '失败'}${result?.selector ? ` (使用选择器: ${result.selector})` : ''}${result?.msg ? ` - ${result.msg}` : ''}`)
    ws.close()
  } finally {
  }
}

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { id: 'chatInjector', name: 'Chat Injector', version: '1.0.0', category: 'chat', enabled: true },
  async init(c: PluginContext) { ctx = c },
  async start() {
    try { await runWithWebDriverOrFallback() } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) }
  },
  async stop() {},
  async dispose() {}
}

export default plugin