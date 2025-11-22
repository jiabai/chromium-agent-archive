import { Plugin } from './plugin'
import { PluginContext } from './types'

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  register(plugin: Plugin): void {
    const id = plugin.meta.id
    if (this.plugins.has(id)) throw new Error(`duplicate plugin id: ${id}`)
    this.plugins.set(id, plugin)
  }
  async initAll(ctx: PluginContext): Promise<void> {
    for (const p of this.plugins.values()) {
      try { await p.init(ctx) } catch {}
    }
  }
  async startAll(): Promise<void> {
    for (const p of this.plugins.values()) {
      if (p.meta.enabled === false) continue
      try { await p.start() } catch {}
    }
  }
  async stopAll(): Promise<void> {
    for (const p of this.plugins.values()) {
      try { await p.stop() } catch {}
    }
  }
  async disposeAll(): Promise<void> {
    for (const p of this.plugins.values()) {
      try { await p.dispose() } catch {}
    }
  }
}