import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { Builder, WebDriver } from 'selenium-webdriver'
import WebSocket from 'ws'
import { createCdpCall, CdpCall } from '../../../shared/cdp'

type CdpTarget = { type?: string; title?: string; url: string; webSocketDebuggerUrl: string }

const BASE = process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222'
const TARGET_URL = 'https://chat.deepseek.com'
const TEXT = '请搜索NemoVideo这家公司的信息'

// 等待时间配置
const POLLING_INTERVAL = 1000 // 每秒检查一次
const ANSWER_COMPLETE_TIMEOUT = 30000 // 最多等待30秒
const CONTENT_STABLE_THRESHOLD = 2000 // 内容2秒不变则认为完成

function injection(text: string): string {
  const s = JSON.stringify(text)
  return `(() => {
    const sels = ["textarea","[contenteditable=\\"true\\"]","[role=\\"textbox\\"]","input[type=\\"text\\"]",".ProseMirror","div[aria-label]","div[placeholder]","[data-slate-editor]","[data-testid*=\\"editor\\"]","[data-lexical-editor]"]
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
      'button[type=\\"submit\\"]',
      'button[aria-label*=\\"发送\\"]',
      'button[aria-label*=\\"Send\\"]',
      '[role=\\"button\\"][aria-label*=\\"发送\\"]',
      '[role=\\"button\\"][aria-label*=\\"Send\\"]',
      '[data-testid*=\\"send\\"]',
      '[aria-label*=\\"提交\\"]',
      '[aria-label*=\\"Submit\\"]'
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

// 检测回答是否完成的脚本
function detectAnswerComplete(): string {
  return `(() => {
    // 寻找可能的回答容器
    const possibleSelectors = [
      // DeepSeek特定的选择器
      '[data-testid*="conversation-turn"]:last-child .prose',
      '[data-testid*="assistant-message"]',
      '.assistant-message',
      '.ai-response',
      '[data-role="assistant"]',
      // 通用的回答容器
      '.message.assistant',
      '.chat-message.assistant',
      '.response-content',
      '.answer-content',
      // 基于内容的选择器
      'div[class*="message"]:last-child div[class*="content"]',
      '.prose:last-child',
      // 更通用的选择器
      'main div > div > div:last-child',
      '.chat-container > div:last-child .content'
    ]

    let answerContainer = null
    let usedSelector = null
    
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent.trim().length > 0) {
        answerContainer = element
        usedSelector = selector
        break
      }
    }

    if (!answerContainer) {
      return { 
        hasAnswer: false, 
        isComplete: false, 
        reason: 'no_answer_container',
        content: '',
        contentLength: 0
      }
    }

    const content = answerContainer.textContent.trim()
    const contentLength = content.length

    // 检查是否有打字动画指示器
    const typingIndicators = [
      '[data-testid*="typing"]',
      '.typing-indicator',
      '.loading-dots',
      '[class*="typing"]',
      '[class*="loading"]',
      '.animate-pulse'
    ]

    let isTyping = false
    let typingSelector = null
    
    for (const indicator of typingIndicators) {
      const element = document.querySelector(indicator)
      if (element && element.offsetParent !== null) { // 元素可见
        isTyping = true
        typingSelector = indicator
        break
      }
    }

    // 检查内容是否以常见的中断字符结尾
    const incompletePatterns = [
      /[，。！？；：]$/, // 中文标点
      /[,!?;:]$/, // 英文标点
      /\.{3}$/, // 省略号
      /\s+$/ // 空白字符
    ]

    const hasIncompleteEnding = incompletePatterns.some(pattern => 
      pattern.test(content)
    )

    // 检查是否有复制按钮等完成标识
    const completionIndicators = [
      '[data-testid*="copy"]',
      'button[aria-label*="copy"]',
      'button[title*="复制"]',
      '.copy-button',
      '[class*="copy"]'
    ]

    let hasCompletionIndicator = false
    for (const indicator of completionIndicators) {
      const element = document.querySelector(indicator)
      if (element && element.offsetParent !== null) {
        hasCompletionIndicator = true
        break
      }
    }

    // 综合判断
    const isComplete = !isTyping && 
                      contentLength > 0 && 
                      (hasCompletionIndicator || !hasIncompleteEnding)

    return {
      hasAnswer: true,
      isComplete,
      reason: isTyping ? 'typing_in_progress' : 
              contentLength === 0 ? 'empty_content' :
              hasCompletionIndicator ? 'has_completion_indicator' :
              'content_stable',
      content: content.substring(0, 200), // 返回前200字符
      contentLength,
      containerSelector: usedSelector,
      typingSelector,
      hasCompletionIndicator
    }
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

// 等待回答完成的函数
async function waitForAnswerComplete(call: CdpCall): Promise<{ complete: boolean; finalContent?: string; reason?: string; duration: number }> {
  const startTime = Date.now()
  let lastContent = ''
  let lastContentChangeTime = startTime
  let checkCount = 0

  console.log('[chatInjector] 开始监测DeepSeek回答状态...')

  while (Date.now() - startTime < ANSWER_COMPLETE_TIMEOUT) {
    checkCount++
    
    try {
      const result = await call('Runtime.evaluate', { 
        expression: detectAnswerComplete(), 
        awaitPromise: true, 
        returnByValue: true 
      })
      
      const detectionResult = result?.result?.result?.value || result?.result?.result || result?.result || result
      
      if (!detectionResult?.hasAnswer) {
        console.log(`[chatInjector] 第${checkCount}次检查: 未找到回答容器`)
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL))
        continue
      }

      const currentContent = detectionResult.content || ''
      const currentTime = Date.now()
      
      console.log(`[chatInjector] 第${checkCount}次检查: 内容长度=${detectionResult.contentLength}, 完成状态=${detectionResult.isComplete}, 原因=${detectionResult.reason}`)
      
      // 如果内容发生变化，更新最后变化时间
      if (currentContent !== lastContent) {
        lastContentChangeTime = currentTime
        lastContent = currentContent
        console.log(`[chatInjector] 内容发生变化，长度: ${detectionResult.contentLength}`)
      }
      
      // 如果检测到回答完成
      if (detectionResult.isComplete) {
        const duration = Date.now() - startTime
        console.log(`[chatInjector] 回答完成检测成功！耗时: ${duration}ms, 最终内容长度: ${detectionResult.contentLength}`)
        return {
          complete: true,
          finalContent: currentContent,
          reason: detectionResult.reason,
          duration
        }
      }
      
      // 如果内容在稳定阈值时间内没有变化，也认为完成
      if (currentTime - lastContentChangeTime >= CONTENT_STABLE_THRESHOLD && detectionResult.contentLength > 0) {
        const duration = Date.now() - startTime
        console.log(`[chatInjector] 内容稳定检测成功！耗时: ${duration}ms, 内容长度: ${detectionResult.contentLength}`)
        return {
          complete: true,
          finalContent: currentContent,
          reason: 'content_stable_timeout',
          duration
        }
      }
      
    } catch (error) {
      console.error(`[chatInjector] 检测过程中出错:`, error)
    }
    
    // 等待下一次检查
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL))
  }
  
  // 超时
  const duration = Date.now() - startTime
  console.log(`[chatInjector] 回答完成检测超时！耗时: ${duration}ms`)
  return {
    complete: false,
    reason: 'timeout',
    duration
  }
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
    
    // 注入问题
    const expr = injection(TEXT)
    console.log('[chatInjector] 执行注入脚本，文本长度:', TEXT.length)
    const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    
    const result = r?.result?.result?.value || r?.result?.result || r?.result || r
    console.log('[chatInjector] 文本注入结果:', JSON.stringify(result, null, 2))
    console.log(`[chatInjector] 文本注入${result?.ok ? '成功' : '失败'}${result?.selector ? ` (使用选择器: ${result.selector})` : ''}${result?.msg ? ` - ${result.msg}` : ''}`)
    
    if (!result?.ok) {
      ws.close()
      return {
        success: false,
        message: result?.msg || '文本注入失败',
        data: {
          selector: result?.selector,
          injectedText: TEXT,
          executionMethod: 'cdp',
          rawResult: result
        }
      }
    }
    
    // 等待回答完成
    console.log('[chatInjector] 开始等待DeepSeek回答...')
    const answerResult = await waitForAnswerComplete(call)
    
    ws.close()
    
    return {
      success: true,
      message: answerResult.complete ? '问题注入和回答检测完成' : '问题注入成功但回答检测超时',
      data: {
        selector: result?.selector,
        injectedText: TEXT,
        executionMethod: 'cdp',
        answerDetection: {
          complete: answerResult.complete,
          finalContent: answerResult.finalContent,
          reason: answerResult.reason,
          duration: answerResult.duration
        },
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
    
    // 注入问题
    const expr = injection(TEXT)
    const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    const result = r?.result?.result?.value || r?.result?.result || r?.result || r
    
    if (!result?.ok) {
      ws.close()
      return {
        success: false,
        message: result?.msg || '文本注入失败',
        data: {
          selector: result?.selector,
          injectedText: TEXT,
          executionMethod: 'webdriver',
          rawResult: result
        }
      }
    }
    
    // 等待回答完成
    console.log('[chatInjector] 开始等待DeepSeek回答...')
    const answerResult = await waitForAnswerComplete(call)
    
    ws.close()
    
    return {
      success: true,
      message: answerResult.complete ? '问题注入和回答检测完成' : '问题注入成功但回答检测超时',
      data: {
        selector: result?.selector,
        injectedText: TEXT,
        executionMethod: 'webdriver',
        answerDetection: {
          complete: answerResult.complete,
          finalContent: answerResult.finalContent,
          reason: answerResult.reason,
          duration: answerResult.duration
        },
        rawResult: result
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
    id: 'chatInjectorEnhanced', 
    name: 'Chat Injector Enhanced', 
    version: '2.0.0', 
    category: 'chat', 
    enabled: true,
    description: '增强版智能文本注入插件 - 通过CDP协议自动识别网页中的输入框并注入预设文本，新增DeepSeek回答完成检测功能，可监测打字机效果结束。支持轮询检测、内容稳定性判断和超时保护。'
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