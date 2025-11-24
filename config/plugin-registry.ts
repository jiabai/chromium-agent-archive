import { Plugin } from '../core/plugin'
import { ConfigService } from './config.service'

import chatInjector from '../plugins/chat/chatInjector/index'
import newChatOpener from '../plugins/chat/newChatOpener/index'
import clearHistory from '../plugins/maintenance/clearHistory/index'
import totalLinks from '../plugins/extractors/totalLinks/index'
import snapshot from '../plugins/diagnostics/snapshot/index'
import llmPing from '../plugins/diagnostics/llmPing/index'
import historyRecord from '../plugins/extractors/historyRecord/index'
import deepSeekDomExport from '../plugins/exporters/deepSeekDom/index'
import conversationThread from '../plugins/extractors/conversationThread/index'

const byId: Record<string, Plugin> = {
  newChatOpener,
  chatInjector,
  clearHistory,
  totalLinks,
  snapshot,
  llmPing,
  historyRecord,
  deepSeekDomExport,
  conversationThread
}

export function getPlugins(): Plugin[] {
  const configService = ConfigService.getInstance()
  const pluginConfigs = configService.get('plugins')
  
  const list: Plugin[] = []
  
  const sortedPluginIds = Object.entries(pluginConfigs)
    .filter(([, config]) => config.enabled)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id]) => id)
  
  for (const id of sortedPluginIds) {
    const p = byId[id]
    if (!p) continue
    p.meta.enabled = true
    list.push(p)
  }
  
  return list
}

export function getAllPlugins(): Plugin[] {
  const configService = ConfigService.getInstance()
  const pluginConfigs = configService.get('plugins')
  
  const list: Plugin[] = []
  
  for (const [id, plugin] of Object.entries(byId)) {
    const config = pluginConfigs[id]
    if (config) {
      plugin.meta.enabled = config.enabled
    }
    list.push(plugin)
  }
  
  return list
}