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
  const startTime = Date.now()
  const bus = new SimpleEventBus()
  const log = createLogger()
  const storage = new MemoryStorage()
  const ctx: PluginContext = { bus, log, storage, env: 'node' }
  const pm = new PluginManager()
  
  // 注册所有插件
  for (const p of getPlugins()) pm.register(p)
  await pm.initAll(ctx)
  
  // 获取启用的插件并按order排序
  const enabledPlugins = getPlugins()
    .filter(p => p.meta.enabled !== false)
    .sort((a, b) => (a.meta.order || 0) - (b.meta.order || 0))
  
  if (enabledPlugins.length === 0) {
    log.info('没有启用的插件，跳过执行')
    return
  }
  
  // 构建工作流规则：前一个失败就停止执行
  const rules: Array<{ pluginId: string; onSuccess?: string; onFailure?: string }> = []
  for (let i = 0; i < enabledPlugins.length - 1; i++) {
    const currentPlugin = enabledPlugins[i]
    const nextPlugin = enabledPlugins[i + 1]
    
    // 成功时执行下一个插件，失败时停止（不设置onFailure）
    rules.push({
      pluginId: currentPlugin.meta.id,
      onSuccess: nextPlugin.meta.id
      // onFailure 不设置，失败时自然停止
    })
  }
  
  // 最后一个插件不需要后续规则
  const lastPlugin = enabledPlugins[enabledPlugins.length - 1]
  rules.push({
    pluginId: lastPlugin.meta.id
    // 最后一个插件，无后续操作
  })
  
  // 执行工作流
  log.info(`开始执行插件工作流，共 ${enabledPlugins.length} 个插件`)
  const results = await pm.startWorkflow({
    starts: [enabledPlugins[0].meta.id], // 从第一个插件开始
    rules: rules,
    skipDisabled: true
  })
  
  // 检查结果
  const failedResults = results.filter(r => !r.success)
  if (failedResults.length > 0) {
    log.error(`工作流执行失败，${failedResults.length} 个插件失败:`)
    failedResults.forEach(r => {
      log.error(`  - ${r.pluginId}: ${r.message}${r.error ? ` (${r.error.message})` : ''}`)
    })
  } else {
    log.info('所有插件执行成功')
  }
  
  // 确保程序正常退出
  const stop = async () => { 
    await pm.stopAll()
    await pm.disposeAll()
  }
  
  // 执行清理并退出
  await stop()
  
  // 计算总执行时间
  const endTime = Date.now()
  const totalTime = endTime - startTime
  const seconds = (totalTime / 1000).toFixed(2)
  log.info(`脚本总执行时间: ${totalTime}ms (${seconds}s)`)
  
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })