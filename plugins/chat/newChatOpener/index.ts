import { Plugin } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { ConfigService } from '../../../config'
import WebSocket from 'ws'
import { createCdpCall, CdpCall } from '../../../shared/cdp'

type CdpTarget = { type?: string; title?: string; url: string; webSocketDebuggerUrl: string }
type ClickResult = { ok: boolean; backendNodeId?: number; x?: number; y?: number; via?: string }

async function j(path: string, base: string): Promise<any> {
  const r = await fetch(`${base}${path}`)
  const t = await r.text()
  try { return JSON.parse(t) } catch { throw new Error('invalid json') }
}

async function ensureTarget(config: any): Promise<CdpTarget> {
  const baseUrl = config.chrome?.devtoolsUrl || 'http://127.0.0.1:9222'
  const targetUrl = config.newChat?.targetUrl || 'https://chat.deepseek.com'
  const list = await j('/json/list', baseUrl)
  let t: CdpTarget | undefined = Array.isArray(list) ? list.find((x: any) => x && x.type === 'page' && typeof x.url === 'string' && x.url.includes(new URL(targetUrl).host)) : undefined
  if (t) return t
  const r = await fetch(`${baseUrl}/json/new?${encodeURIComponent(targetUrl)}`)
  const txt = await r.text()
  try { return JSON.parse(txt) as CdpTarget } catch { throw new Error('invalid json') }
}

async function pickNode(call: CdpCall, backendIds: number[]): Promise<{ bid: number; cx: number; cy: number } | null> {
  let best: { bid: number; cx: number; cy: number; area: number } | null = null
  for (const bid of backendIds) {
    const bm = await call('DOM.getBoxModel', { backendNodeId: bid })
    const q = bm?.model?.content || bm?.model?.border || bm?.model?.margin
    if (!q || q.length < 8) continue
    const xs = [q[0], q[2], q[4], q[6]]
    const ys = [q[1], q[3], q[5], q[7]]
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const width = Math.max(0, maxX - minX)
    const height = Math.max(0, maxY - minY)
    if (width < 1 || height < 1) continue
    const area = width * height
    const cx = (q[0] + q[2] + q[4] + q[6]) / 4
    const cy = (q[1] + q[3] + q[5] + q[7]) / 4
    if (!best || area > best.area) best = { bid, cx, cy, area }
  }
  if (!best) return null
  return { bid: best.bid, cx: Math.round(best.cx), cy: Math.round(best.cy) }
}

async function clickByAX(call: CdpCall, config: any): Promise<ClickResult> {
  const ax = await call('Accessibility.getFullAXTree', {}, { timeout: config.newChat.axTimeoutMs })
  const nodes = ax?.nodes || []
  const cands = [] as Array<{ bid?: number; nid?: number }>
  for (const n of nodes) {
    const role = n?.role?.value || ''
    const name = n?.name?.value || ''
    const bid = n?.backendDOMNodeId as number | undefined
    const nid = n?.nodeId as number | undefined
    if (!(bid || nid)) continue
    if (name && name.includes(config.newChat.axName) && role === config.newChat.axRole) cands.push({ bid, nid })
  }
  const bids = cands.map(x => x.bid).filter(Boolean) as number[]
  const picked = bids.length ? await pickNode(call, bids) : null
  if (!picked) return { ok: false }
  try {
    const rn = await call('DOM.resolveNode', { backendNodeId: picked.bid })
    const oid = rn?.object?.objectId
    if (oid) {
      const txt = await call('Runtime.callFunctionOn', { objectId: oid, functionDeclaration: 'function(){ return (this.innerText||this.textContent||"") }', returnByValue: true })
      const val = txt?.result?.result?.value || ''
      if (typeof val === 'string' && val.includes(config.newChat.axName)) {
        await call('Runtime.callFunctionOn', { objectId: oid, functionDeclaration: 'function(){ this.scrollIntoView({block:"center",inline:"center"}); this.click() }', awaitPromise: true })
        return { ok: true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'callFunctionOn' }
      }
    }
  } catch {}
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
  return { ok: true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'dispatchMouseEvent' }
}

async function clickByDOM(call: CdpCall, config: any): Promise<ClickResult> {
  const expr = `(() => { const t = ${JSON.stringify(config.newChat.axName)}; const spans = Array.from(document.querySelectorAll('span')); let s = spans.find(x => ((x.textContent||'').trim())===t) || spans.find(x => ((x.textContent||'').trim()).includes(t)); if (!s) { const all = Array.from(document.querySelectorAll('*')); s = all.find(x => ((x.textContent||'').trim()).includes(t)) || null; } let el = s ? (s.closest('button,[role=\\"button\\"],a[role=\\"button\\"],div[role=\\"button\\"]')||s) : null; if (!el) return { ok:false }; try { el.scrollIntoView({block:'center',inline:'center'}) } catch {} const r = el.getBoundingClientRect(); if (r.width<=0 || r.height<=0) return { ok:false }; const cx = r.left + r.width/2; const cy = r.top + r.height/2; try { el.click() } catch {} return { ok:true, x: Math.round(cx), y: Math.round(cy), via: 'runtime' } })()`
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  const v = r?.result?.result?.value as ClickResult | undefined
  if (!v || !v.ok) return { ok:false }
  return v
}

async function clickByFrames(call: CdpCall, config: any): Promise<ClickResult> {
  const ft = await call('Page.getFrameTree', {})
  const frames = [] as string[]
  const stack = [ft?.frameTree].filter(Boolean)
  while (stack.length) {
    const n = stack.pop() as any
    if (n?.frame?.id) frames.push(n.frame.id)
    const ch = n?.childFrames || []
    for (const c of ch) stack.push(c)
  }
  for (const fid of frames) {
    try {
      const iw = await call('Page.createIsolatedWorld', { frameId: fid, worldName: 'newchat', grantUniveralAccess: true }, { timeout: config.newChat.frameTimeoutMs })
      const expr = `(() => { const t = ${JSON.stringify(config.newChat.axName)}; const spans = Array.from(document.querySelectorAll('span')); let s = spans.find(x => ((x.textContent||'').trim())===t) || spans.find(x => ((x.textContent||'').trim()).includes(t)); if (!s) { const all = Array.from(document.querySelectorAll('*')); s = all.find(x => ((x.textContent||'').trim()).includes(t)) || null; } let el = s ? (s.closest('button,[role="button"],a[role="button"],div[role="button"]')||s) : null; if (!el) return { ok:false }; try { el.scrollIntoView({block:'center',inline:'center'}) } catch {} const r = el.getBoundingClientRect(); if (r.width<=0 || r.height<=0) return { ok:false }; const cx = r.left + r.width/2; const cy = r.top + r.height/2; try { el.click() } catch {} return { ok:true, x: Math.round(cx), y: Math.round(cy), via: 'frame' } })()`
      const rv = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, contextId: iw?.executionContextId })
      const v = rv?.result?.result?.value as ClickResult | undefined
      if (v && v.ok) return v
    } catch {}
  }
  return { ok:false }
}

async function clickByAXQuery(call: CdpCall, config: any): Promise<ClickResult> {
  const doc = await call('DOM.getDocument', { depth: 0 })
  const nid = doc?.root?.nodeId as number | undefined
  if (!nid) return { ok:false }
  try {
    const q = await call('Accessibility.queryAXTree', { nodeId: nid, accessibleName: config.newChat.axName }, { timeout: config.newChat.axTimeoutMs })
    const arr = q?.nodes || []
    const filtered = arr.filter((n: any) => (n?.role?.value || '') === config.newChat.axRole)
    const bids = filtered.map((n: any) => n.backendDOMNodeId || null).filter(Boolean) as number[]
    if (bids.length === 0) return { ok:false }
    const picked = await pickNode(call, bids)
    if (!picked) return { ok:false }
    try {
      const rn = await call('DOM.resolveNode', { backendNodeId: picked.bid })
      const oid = rn?.object?.objectId
      if (oid) {
        await call('Runtime.callFunctionOn', { objectId: oid, functionDeclaration: 'function(){ this.scrollIntoView({block:"center",inline:"center"}); this.click() }', awaitPromise: true })
        return { ok:true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'axQuery' }
      }
    } catch {}
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
    return { ok:true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'axQueryDispatch' }
  } catch {
    return { ok:false }
  }
}

async function verifyNewChat(call: CdpCall): Promise<ClickResult> {
  const expr = `(() => {
    const qs = ['textarea','[contenteditable="true"]','[role="textbox"]','input[type="text"]','.ProseMirror']
    let el = null
    for (const q of qs){ const e = document.querySelector(q); if (e) { el = e; break } }
    if (!el) return { ok:false }
    const tag = (el.tagName||'').toLowerCase()
    const editable = tag==='textarea' || (tag==='input' && el.type==='text') || !!el.isContentEditable
    const val = (el.value!==undefined ? el.value : (el.textContent||'')).trim()
    const ph = el.getAttribute('placeholder') || ''
    const phMatch = /输入|消息|message|chat|send/i.test(ph)
    if (editable && val.length===0 && phMatch) return { ok:true, via:'verify' }
    return { ok:false }
  })()`
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  return (r?.result?.result?.value as ClickResult) || { ok:false }
}

let ctx: PluginContext | null = null

const plugin: Plugin = {
  meta: { 
    id: 'newChatOpener', 
    name: 'New Chat Opener', 
    version: '1.0.0', 
    category: 'chat', 
    enabled: true,
    description: '智能新聊天开启器 - 通过多种策略（AX查询、DOM选择、帧遍历等）自动寻找并点击网页中的"新聊天"或"新建对话"按钮，支持多框架页面和复杂的SPA应用。适用于自动化开启新的聊天会话。'
  },
  async init(c: PluginContext) { ctx = c },
  async start() {
    try {
      const config = ConfigService.getInstance().getAll()
      const t = await ensureTarget(config)
      const ws = new WebSocket(t.webSocketDebuggerUrl)
      await new Promise(res => ws.once('open', res))
      const call = createCdpCall(ws, config.newChat.cdpTimeoutMs)
      await call('Runtime.enable', {})
      await call('DOM.enable', {})
      await call('Accessibility.enable', {})
      await call('Page.enable', {})
      await call('Page.bringToFront', {})
      let r: ClickResult = { ok:false }
      const startTs = Date.now()
      for (let attempt=0; attempt<5 && !r.ok; attempt++) {
        r = await clickByAXQuery(call, config)
        if (!r.ok) r = await clickByAX(call, config)
        if (!r.ok) r = await clickByDOM(call, config)
        if (!r.ok) r = await clickByFrames(call, config)
        if (!r.ok) await new Promise(rs => setTimeout(rs, 500))
        if (Date.now() - startTs > config.newChat.maxTotalMs) break
      }
      if (!r.ok) {
        const v = await verifyNewChat(call)
        if (v && v.ok) r = v
      }
      if (!r.ok && r.x!==undefined && r.y!==undefined) {
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
      }
      try { ws.close() } catch {}
    } catch (e: any) { if (ctx) ctx.log.error(e?.message || String(e)) }
  },
  async stop() {},
  async dispose() {}
}

export default plugin

