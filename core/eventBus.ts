import { Event, EventBus } from './types'

export class SimpleEventBus implements EventBus {
  private handlers: Map<string, Set<(e: Event) => void>> = new Map()
  on(type: string, handler: (e: Event) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
  }
  off(type: string, handler: (e: Event) => void): void {
    const set = this.handlers.get(type)
    if (set) set.delete(handler)
  }
  emit(e: Event): void {
    const set = this.handlers.get(e.type)
    if (!set) return
    for (const h of set) {
      try { h(e) } catch {}
    }
  }
}