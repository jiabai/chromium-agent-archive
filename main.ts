import { SimpleEventBus } from './core/eventBus'
import { PluginManager } from './core/pluginManager'
import { PluginContext, Logger, Storage } from './core/types'
import { getPlugins } from './config/plugin-registry'

class MemoryStorage implements Storage {
  private map = new Map<string, unknown>()
  async get<T = unknown>(key: string): Promise<T | undefined> { return this.map.get(key) as T | undefined }
  async set<T = unknown>(key: string, value: T): Promise<void> { this.map.set(key, value as unknown) }
  async remove(key: string): Promise<void> { this.map.delete(key) }
}

function createLogger(): Logger {
  return {
    debug: (...args: unknown[]) => { console.debug(...args) },
    info: (...args: unknown[]) => { console.info(...args) },
    warn: (...args: unknown[]) => { console.warn(...args) },
    error: (...args: unknown[]) => { console.error(...args) }
  }
}

async function main(): Promise<void> {
  const bus = new SimpleEventBus()
  const log = createLogger()
  const storage = new MemoryStorage()
  const ctx: PluginContext = { bus, log, storage, env: 'node' }
  const pm = new PluginManager()
  for (const p of getPlugins()) pm.register(p)
  await pm.initAll(ctx)
  await pm.startAll()
  const stop = async () => { await pm.stopAll(); await pm.disposeAll() }
  process.on('SIGINT', () => { stop().then(() => process.exit(0)) })
  process.on('SIGTERM', () => { stop().then(() => process.exit(0)) })
}

main().catch(e => { console.error(e); process.exit(1) })