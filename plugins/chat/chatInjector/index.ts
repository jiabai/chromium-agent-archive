import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { Builder, WebDriver } from 'selenium-webdriver'
import WebSocket from 'ws'
import { createCdpCall } from '../../../shared/cdp'

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


async function runCdpDirect(): Promise<PluginResult> {
  try {
    console.log('[chatInjector] 开始CDP直接模式...')
    let list = await j('/json/list')
    console.log('[chatInjector] 获取页面列表:', list?.length, '个页面')
    
    let t: CdpTarget | undefined = Array.isArray(list) ? list.find((x: any) => typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : undefined
    if (!t) {
      console.log('[chatInjector] 未找到DeepSeek页面，尝试创建新页面...')
      const r = await fetch(`${BASE}/json/new?${encodeURIComponent(TARGET_URL)}`)
      t = await r.json()
      console.log('[chatInjector] 创建新页面结果:', t?.title || t?.type, t?.url)
    } else {
      console.log('[chatInjector] 找到现有DeepSeek页面:', t?.title || t?.type, t?.url)
    }
    
    if (!t || !t.webSocketDebuggerUrl) {
      console.error('[chatInjector] 无法获取有效的WebSocket调试URL')
      return {
        success: false,
        message: '无法连接到Chrome调试端口',
        data: { error: 'No WebSocket URL' }
      }
    }
    
    console.log('[chatInjector] 连接WebSocket...')
    const ws = new WebSocket(t.webSocketDebuggerUrl)
    await new Promise(res => ws.once('open', res))
    console.log('[chatInjector] WebSocket连接成功')
    
    const call = createCdpCall(ws)
    console.log('[chatInjector] 启用Runtime...')
    await call('Runtime.enable', {})
    console.log('[chatInjector] 切换到前台...')
    await call('Page.bringToFront', {})
    
    const expr = injection(TEXT)
    console.log('[chatInjector] 执行注入脚本，文本长度:', TEXT.length)
    const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    console.log('[chatInjector] CDP执行结果:', JSON.stringify(r, null, 2))
    
    // CDP返回的结构: { result: { result: { value: actualReturnValue } } }
    const result = r?.result?.result?.value || r?.result?.result || r?.result || r
    console.log('[chatInjector] 提取的返回值:', JSON.stringify(result, null, 2))
    console.log(`[chatInjector] 文本注入${result?.ok ? '成功' : '失败'}${result?.selector ? ` (使用选择器: ${result.selector})` : ''}${result?.msg ? ` - ${result.msg}` : ''}`)
    
    // 如果文本注入成功，等待1分钟
    if (result?.ok) {
      console.log('[chatInjector] 文本注入成功，等待1分钟...')
      await new Promise(resolve => setTimeout(resolve, 60000)) // 60000毫秒 = 1分钟
      console.log('[chatInjector] 等待完成')
    }
    
    ws.close()
    
    return {
      success: result?.ok || false,
      message: result?.msg || (result?.ok ? '文本注入成功' : '文本注入失败'),
      data: {
        selector: result?.selector,
        injectedText: TEXT,
        executionMethod: 'cdp',
        rawResult: result
      }
    }
  } catch (error) {
    console.error('[chatInjector] CDP执行异常:', error)
    return {
      success: false,
      message: `CDP执行失败: ${error instanceof Error ? error.message : String(error)}`,
      data: { error: error instanceof Error ? error.message : String(error) }
    }
  }
}

async function runWithWebDriverOrFallback(): Promise<PluginResult> {
  const caps: any = { browserName: 'chrome', 'goog:chromeOptions': { debuggerAddress: '127.0.0.1:9222' } }
  let driver: WebDriver | undefined
  try {
    driver = await new Builder().withCapabilities(caps).build()
  } catch (e) {
    return await runCdpDirect()
  }
  try {
    await driver.get(TARGET_URL)
    let t = await findDeepseekTarget()
    if (!t) {
      await driver.get(TARGET_URL)
      t = await findDeepseekTarget()
    }
    if (!t) {
      return await runCdpDirect()
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
    
    // 如果文本注入成功，等待1分钟
    if (result?.ok) {
      console.log('[chatInjector] 文本注入成功，等待1分钟...')
      await new Promise(resolve => setTimeout(resolve, 60000)) // 60000毫秒 = 1分钟
      console.log('[chatInjector] 等待完成')
    }
    
    ws.close()
    
    return {
      success: result?.ok || false,
      message: result?.msg || (result?.ok ? '文本注入成功' : '文本注入失败'),
      data: {
        selector: result?.selector,
        injectedText: TEXT,
        executionMethod: 'webdriver'
      }
    }
  } finally {
    if (driver) {
      try { await driver.quit() } catch {}
    }
  }
}

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { 
    id: 'chatInjector', 
    name: 'Chat Injector', 
    version: '1.0.0', 
    category: 'chat', 
    enabled: true,
    description: '智能文本注入插件 - 通过CDP协议自动识别网页中的输入框（textarea、contenteditable元素等）并注入预设文本，支持自动发送功能。适用于聊天机器人、表单自动填充等场景。'
  },
  async init(c: PluginContext) { ctx = c },
  async start(): Promise<PluginResult> {
    try { 
      return await runWithWebDriverOrFallback() 
    } catch (e: any) { 
      if (ctx) ctx.log.error(e?.message || String(e))
      return { 
        success: false,
        message: '插件执行失败',
        error: e instanceof Error ? e : new Error(String(e))
      }
    }
  },
  async stop() {},
  async dispose() {}
}

export default plugin