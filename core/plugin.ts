import { PluginMeta, PluginContext } from './types'

export interface PluginResult {
  success: boolean
  message?: string
  data?: Record<string, unknown>
  error?: Error
}

export interface Plugin {
  meta: PluginMeta
  init(ctx: PluginContext): Promise<void> | void
  start(): Promise<PluginResult | void> | PluginResult | void
  stop(): Promise<void> | void
  dispose(): Promise<void> | void
}