import { Plugin, PluginResult } from './plugin'
import { PluginContext } from './types'

export class PluginExecutionResult {
  constructor(
    public pluginId: string,
    public success: boolean,
    public message?: string,
    public data?: Record<string, unknown>,
    public error?: Error,
    public executionTime?: number
  ) {}
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private executionResults: PluginExecutionResult[] = []
  
  public getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }
  
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
  
  async startAll(): Promise<PluginExecutionResult[]> {
    this.executionResults = []
    for (const p of this.plugins.values()) {
      if (p.meta.enabled === false) continue
      
      const startTime = Date.now()
      let result: PluginExecutionResult
      
      try {
        const pluginResult = await p.start()
        const executionTime = Date.now() - startTime
        
        if (pluginResult) {
          result = new PluginExecutionResult(
            p.meta.id,
            pluginResult.success,
            pluginResult.message,
            pluginResult.data,
            pluginResult.error,
            executionTime
          )
        } else {
          // 兼容旧插件，假设执行成功
          result = new PluginExecutionResult(p.meta.id, true, undefined, undefined, undefined, executionTime)
        }
      } catch (error) {
        const executionTime = Date.now() - startTime
        result = new PluginExecutionResult(
          p.meta.id,
          false,
          'Plugin execution failed',
          undefined,
          error instanceof Error ? error : new Error(String(error)),
          executionTime
        )
      }
      
      this.executionResults.push(result)
    }
    
    return this.executionResults
  }
  
  async startWorkflow(config: { starts: string[]; rules: Array<{ pluginId: string; onSuccess?: string; onFailure?: string }>; skipDisabled?: boolean }): Promise<PluginExecutionResult[]> {
    this.executionResults = []
    const successMap = new Map<string, boolean>()
    const visited = new Set<string>()
    const ruleMap = new Map<string, { onSuccess?: string; onFailure?: string }>()
    for (const r of config.rules) ruleMap.set(r.pluginId, { onSuccess: r.onSuccess, onFailure: r.onFailure })
    const queue: string[] = []
    for (const s of config.starts) if (typeof s === 'string' && s) queue.push(s)
    while (queue.length) {
      const id = queue.shift() as string
      const p = this.plugins.get(id)
      if (!p) continue
      if (config.skipDisabled && p.meta.enabled === false) continue
      if (visited.has(id)) continue
      const deps = Array.isArray(p.meta.dependsOn) ? p.meta.dependsOn : []
      let depsOk = true
      for (const d of deps) { if (!successMap.get(d)) { depsOk = false; break } }
      let res: PluginExecutionResult
      const startTime = Date.now()
      if (!depsOk) {
        res = new PluginExecutionResult(id, false, 'Dependency not met', undefined, undefined, 0)
      } else {
        // 添加插件执行日志
        console.log(`正在执行插件: ${id}`)
        try {
          const r = await p.start()
          const t = Date.now() - startTime
          if (r) {
            res = new PluginExecutionResult(id, r.success, r.message, r.data, r.error, t)
            console.log(`插件 ${id} 执行完成，状态: ${r.success ? '成功' : '失败'}${r.message ? `, 消息: ${r.message}` : ''}`)
          } else {
            res = new PluginExecutionResult(id, true, undefined, undefined, undefined, t)
            console.log(`插件 ${id} 执行完成，状态: 成功`)
          }
        } catch (e) {
          const t = Date.now() - startTime
          res = new PluginExecutionResult(id, false, 'Plugin execution failed', undefined, e instanceof Error ? e : new Error(String(e)), t)
          console.log(`插件 ${id} 执行失败，错误: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      this.executionResults.push(res)
      successMap.set(id, !!res.success)
      visited.add(id)

      // 在每个插件执行结束后暂停5秒钟
      console.log(`插件 ${id} 执行完成，暂停5秒...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const rule = ruleMap.get(id)
      const nextId = res.success ? rule?.onSuccess : rule?.onFailure
      if (nextId && !visited.has(nextId)) queue.push(nextId)
    }
    return [...this.executionResults]
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
  
  getExecutionResults(): PluginExecutionResult[] {
    return [...this.executionResults]
  }
}