export type PluginCategory = 'chat' | 'exporters' | 'extractors' | 'maintenance' | 'diagnostics'

export interface PluginMeta {
  id: string
  name: string
  version: string
  category?: string
  dependsOn?: string[]
  enabled: boolean
  order?: number
  description?: string
}

export interface Event {
  type: string
  payload?: unknown
}

export interface EventBus {
  on(type: string, handler: (e: Event) => void): void
  off(type: string, handler: (e: Event) => void): void
  emit(e: Event): void
}

export interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

export interface Storage {
  get<T = unknown>(key: string): Promise<T | undefined>
  set<T = unknown>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

export interface PluginContext {
  bus: EventBus
  log: Logger
  storage: Storage
  env: 'cli' | 'node'
}