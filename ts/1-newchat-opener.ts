import WebSocket from 'ws'

type CdpTarget = { type: string; title?: string; url: string; webSocketDebuggerUrl: string }
type CdpOptions = { timeout?: number }
type CdpCall = (method: string, params?: any, options?: CdpOptions) => Promise<any>
type ClickResult = { ok: boolean; backendNodeId?: number; x?: number; y?: number; via?: string }

const BASE = process.env.CHROME_DEVTOOLS_URL || 'http://127.0.0.1:9222'
const TARGET_URL = 'https://chat.deepseek.com'
const AX_NAME = process.env.NEWCHAT_AX_NAME || '开启新对话'
const AX_ROLE = process.env.NEWCHAT_AX_ROLE || 'button'
const CDP_TIMEOUT_MS = parseInt(process.env.CDP_TIMEOUT_MS || '10000', 10)
const MAX_TOTAL_MS = parseInt(process.env.NEWCHAT_MAX_TOTAL_MS || '20000', 10)
const AX_TIMEOUT_MS = parseInt(process.env.NEWCHAT_AX_TIMEOUT_MS || '6000', 10)
const FRAME_TIMEOUT_MS = parseInt(process.env.NEWCHAT_FRAME_TIMEOUT_MS || '6000', 10)

async function j(path: string): Promise<any> {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`)
  const text = await r.text()
  try { return JSON.parse(text) } catch (parseError: any) { throw new Error(`Invalid JSON response: ${parseError.message}`) }
}

async function ensureTarget(): Promise<CdpTarget> {
  const list = await j('/json/list')
  let t: CdpTarget | undefined = Array.isArray(list) ? list.find((x: any) => x && x.type === 'page' && typeof x.url === 'string' && x.url.includes('chat.deepseek.com')) : undefined
  if (t) return t
  const response = await fetch(`${BASE}/json/new?${encodeURIComponent(TARGET_URL)}`)
  if (!response.ok) throw new Error(`Failed to create new tab: ${response.status}`)
  const text = await response.text()
  try { return JSON.parse(text) as CdpTarget } catch (parseError: any) { throw new Error(`Invalid JSON response: ${parseError.message}`) }
}

function cdp(ws: WebSocket): CdpCall {
  let id = 0
  const map = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; tid?: any; method?: string }>()
  ws.on('message', (m: any) => {
    try {
      const d = JSON.parse(m.toString())
      if (d && typeof d.id === 'number' && map.has(d.id)) {
        const v = map.get(d.id)
        const resolve = v?.resolve as (v: any) => void
        const reject = v?.reject as (e: any) => void
        const tid = v?.tid
        map.delete(d.id)
        if (tid) clearTimeout(tid)
        if (d.error) reject(new Error(typeof d.error.message === 'string' ? d.error.message : 'cdp error'))
        else resolve(d)
      }
    } catch {}
  })
  ws.on('error', (err: any) => {
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
  return async (method: string, params?: any, options?: CdpOptions): Promise<any> => {
    id += 1
    ws.send(JSON.stringify({ id, method, params }))
    return await new Promise((resolve, reject) => {
      const to = options && typeof options.timeout === 'number' ? options.timeout : CDP_TIMEOUT_MS
      const tid = setTimeout(() => {
        if (map.has(id)) {
          map.delete(id)
          reject(new Error(`cdp timeout for ${method}`))
        }
      }, to)
      map.set(id, { resolve, reject, tid, method })
    })
  }
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

async function clickByAX(call: CdpCall): Promise<ClickResult> {
  const ax = await call('Accessibility.getFullAXTree', {}, { timeout: AX_TIMEOUT_MS })
  const nodes = ax?.nodes || []
  const cands = [] as Array<{ bid?: number; nid?: number }>
  for (const n of nodes) {
    const role = n?.role?.value || ''
    const name = n?.name?.value || ''
    const bid = n?.backendDOMNodeId as number | undefined
    const nid = n?.nodeId as number | undefined
    if (!(bid || nid)) continue
    if (name && name.includes(AX_NAME) && role === AX_ROLE) cands.push({ bid, nid })
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
      if (typeof val === 'string' && val.includes(AX_NAME)) {
        await call('Runtime.callFunctionOn', { objectId: oid, functionDeclaration: 'function(){ this.scrollIntoView({block:"center",inline:"center"}); this.click() }', awaitPromise: true })
        return { ok: true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'callFunctionOn' }
      }
    }
  } catch {}
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: picked.cx, y: picked.cy, button: 'left', clickCount: 1 })
  return { ok: true, backendNodeId: picked.bid, x: picked.cx, y: picked.cy, via: 'dispatchMouseEvent' }
}

async function clickByDOM(call: CdpCall): Promise<ClickResult> {
  const expr = `(() => { const t = ${JSON.stringify(AX_NAME)}; const spans = Array.from(document.querySelectorAll('span')); let s = spans.find(x => ((x.textContent||'').trim())===t) || spans.find(x => ((x.textContent||'').trim()).includes(t)); if (!s) { const all = Array.from(document.querySelectorAll('*')); s = all.find(x => ((x.textContent||'').trim()).includes(t)) || null; } let el = s ? (s.closest('button,[role=\\"button\\"],a[role=\\"button\\"],div[role=\\"button\\"]')||s) : null; if (!el) return { ok:false }; try { el.scrollIntoView({block:'center',inline:'center'}) } catch {} const r = el.getBoundingClientRect(); if (r.width<=0 || r.height<=0) return { ok:false }; const cx = r.left + r.width/2; const cy = r.top + r.height/2; try { el.click() } catch {} return { ok:true, x: Math.round(cx), y: Math.round(cy), via: 'runtime' } })()`
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  const v = r?.result?.result?.value as ClickResult | undefined
  if (!v || !v.ok) return { ok:false }
  return v
}

async function clickByFrames(call: CdpCall): Promise<ClickResult> {
  const ft = await call('Page.getFrameTree', {})
  const frames = [] as string[]
  const stack = [ft?.frameTree].filter(Boolean)
  while (stack.length) {
    const n = stack.pop()
    if (n?.frame?.id) frames.push(n.frame.id)
    const ch = n?.childFrames || []
    for (const c of ch) stack.push(c)
  }
  for (const fid of frames) {
    try {
      const iw = await call('Page.createIsolatedWorld', { frameId: fid, worldName: 'newchat', grantUniveralAccess: true }, { timeout: FRAME_TIMEOUT_MS })
      const expr = `(() => { const t = ${JSON.stringify(AX_NAME)}; const spans = Array.from(document.querySelectorAll('span')); let s = spans.find x => ((x.textContent||'').trim())===t) || spans.find(x => ((x.textContent||'').trim()).includes(t)); if (!s) { const all = Array.from(document.querySelectorAll('*')); s = all.find(x => ((x.textContent||'').trim()).includes(t)) || null; } let el = s ? (s.closest('button,[role=\\"button\\"],a[role=\\"button\\"],div[role=\\"button\\"]')||s) : null; if (!el) return { ok:false }; try { el.scrollIntoView({block:'center',inline:'center'}) } catch {} const r = el.getBoundingClientRect(); if (r.width<=0 || r.height<=0) return { ok:false }; const cx = r.left + r.width/2; const cy = r.top + r.height/2; try { el.click() } catch {} return { ok:true, x: Math.round(cx), y: Math.round(cy), via: 'frame' } })()`
      const rv = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, contextId: iw?.executionContextId })
      const v = rv?.result?.result?.value as ClickResult | undefined
      if (v && v.ok) return v
    } catch {}
  }
  return { ok:false }
}

async function clickByAXQuery(call: CdpCall): Promise<ClickResult> {
  const doc = await call('DOM.getDocument', { depth: 0 })
  const nid = doc?.root?.nodeId as number | undefined
  if (!nid) return { ok:false }
  try {
    const q = await call('Accessibility.queryAXTree', { nodeId: nid, accessibleName: AX_NAME }, { timeout: AX_TIMEOUT_MS })
    const arr = q?.nodes || []
    const filtered = arr.filter((n: any) => (n?.role?.value || '') === AX_ROLE)
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
    const qs = ['textarea','[contenteditable=\"true\"]','[role=\"textbox\"]','input[type=\"text\"]','.ProseMirror']
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

async function main(): Promise<void> {
  try {
    const t = await ensureTarget()
    const ws = new WebSocket(t.webSocketDebuggerUrl)
    ws.on('error', (error: any) => { process.exit(1) })
    await new Promise(res => ws.once('open', res))
    const call = cdp(ws)
    await call('Runtime.enable', {})
    await call('DOM.enable', {})
    await call('Accessibility.enable', {})
    await call('Page.enable', {})
    await call('Page.bringToFront', {})
    let r: ClickResult = { ok:false }
    const start = Date.now()
    for (let attempt=0; attempt<5 && !r.ok; attempt++) {
      r = await clickByAXQuery(call)
      if (!r.ok) r = await clickByAX(call)
      if (!r.ok) r = await clickByDOM(call)
      if (!r.ok) r = await clickByFrames(call)
      if (!r.ok) await new Promise(rs => setTimeout(rs, 500))
      if (Date.now() - start > MAX_TOTAL_MS) break
    }
    if (!r.ok) {
      const v = await verifyNewChat(call)
      if (v && v.ok) r = v
    }
    if (!r.ok && r.x!==undefined && r.y!==undefined) {
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
      r = { ok: true, x: r.x, y: r.y, via: 'fallback' }
    }
    ws.close()
    setTimeout(() => { process.exit(0) }, 100)
  } catch (error: any) {
    process.exit(1)
  }
}

main().catch((e: any) => { process.exit(1) })