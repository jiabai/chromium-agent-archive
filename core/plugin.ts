import { PluginMeta, PluginContext } from './types'

export interface Plugin {
  meta: PluginMeta
  init(ctx: PluginContext): Promise<void> | void
  start(): Promise<void> | void
  stop(): Promise<void> | void
  dispose(): Promise<void> | void
}