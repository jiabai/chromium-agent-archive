import WebSocket from 'ws'

export type CdpOptions = { timeout?: number }
export type CdpCall = (method: string, params?: any, options?: CdpOptions) => Promise<any>

export function createCdpCall(ws: WebSocket, timeoutMs: number = 30000): CdpCall {
  let id = 0
  const map = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; tid?: any }>()
  ws.on('message', (m: any) => {
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
  ws.on('error', () => {
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
      const to = options && typeof options.timeout === 'number' ? options.timeout : timeoutMs
      const tid = setTimeout(() => {
        if (map.has(id)) {
          map.delete(id)
          reject(new Error(`cdp timeout for ${method}`))
        }
      }, to)
      map.set(id, { resolve, reject, tid })
    })
  }
}