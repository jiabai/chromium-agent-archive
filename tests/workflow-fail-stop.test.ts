import { describe, it, expect, beforeEach } from 'vitest'
import { PluginManager } from '../core/pluginManager'
import { Plugin, PluginResult } from '../core/plugin'
import { PluginContext } from '../core/types'

// 模拟插件
class SuccessPlugin implements Plugin {
  meta = { id: 'success-plugin', name: 'Success Plugin', version: '1.0.0', category: 'test' as const, enabled: true, order: 1 }
  
  async init(ctx: PluginContext): Promise<void> {}
  
  async start(): Promise<PluginResult> {
    return { success: true, message: 'Success' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

class FailurePlugin implements Plugin {
  meta = { id: 'failure-plugin', name: 'Failure Plugin', version: '1.0.0', category: 'test' as const, enabled: true, order: 2 }
  
  async init(ctx: PluginContext): Promise<void> {}
  
  async start(): Promise<PluginResult> {
    return { success: false, message: 'Plugin failed intentionally' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

class NeverExecutedPlugin implements Plugin {
  meta = { id: 'never-executed-plugin', name: 'Never Executed Plugin', version: '1.0.0', category: 'test' as const, enabled: true, order: 3 }
  
  executed = false
  
  async init(ctx: PluginContext): Promise<void> {}
  
  async start(): Promise<PluginResult> {
    this.executed = true
    return { success: true, message: 'This should not be executed' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

describe('插件失败停止执行测试', () => {
  let pm: PluginManager
  let ctx: PluginContext
  
  beforeEach(() => {
    pm = new PluginManager()
    ctx = {
      bus: { emit: async () => {}, on: () => {}, off: () => {} },
      log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      storage: { get: async () => undefined, set: async () => {}, remove: async () => {} },
      env: 'node'
    }
  })
  
  it('前一个插件失败时，后续插件不应该被执行', async () => {
    // 创建插件实例
    const successPlugin = new SuccessPlugin()
    const failurePlugin = new FailurePlugin()
    const neverExecutedPlugin = new NeverExecutedPlugin()
    
    // 注册插件
    pm.register(successPlugin)
    pm.register(failurePlugin)
    pm.register(neverExecutedPlugin)
    
    await pm.initAll(ctx)
    
    // 构建工作流规则：前一个失败就停止
    const rules = [
      { pluginId: 'success-plugin', onSuccess: 'failure-plugin' },
      { pluginId: 'failure-plugin' } // 失败时停止，不设置onSuccess
      // never-executed-plugin 没有规则，不应该被执行
    ]
    
    // 执行工作流
    const results = await pm.startWorkflow({
      starts: ['success-plugin'],
      rules: rules,
      skipDisabled: true
    })
    
    // 验证结果
    expect(results).toHaveLength(2) // 只有两个插件被执行
    expect(results[0].pluginId).toBe('success-plugin')
    expect(results[0].success).toBe(true)
    expect(results[1].pluginId).toBe('failure-plugin')
    expect(results[1].success).toBe(false)
    
    // 关键验证：第三个插件不应该被执行
    expect(neverExecutedPlugin.executed).toBe(false)
  })
  
  it('所有插件成功时，应该按顺序执行所有插件', async () => {
    // 创建插件实例
    const successPlugin1 = new SuccessPlugin()
    successPlugin1.meta.id = 'success-plugin-1'
    successPlugin1.meta.order = 1
    
    const successPlugin2 = new SuccessPlugin()
    successPlugin2.meta.id = 'success-plugin-2'
    successPlugin2.meta.order = 2
    
    const successPlugin3 = new SuccessPlugin()
    successPlugin3.meta.id = 'success-plugin-3'
    successPlugin3.meta.order = 3
    
    // 注册插件
    pm.register(successPlugin1)
    pm.register(successPlugin2)
    pm.register(successPlugin3)
    
    await pm.initAll(ctx)
    
    // 构建工作流规则
    const rules = [
      { pluginId: 'success-plugin-1', onSuccess: 'success-plugin-2' },
      { pluginId: 'success-plugin-2', onSuccess: 'success-plugin-3' },
      { pluginId: 'success-plugin-3' }
    ]
    
    // 执行工作流
    const results = await pm.startWorkflow({
      starts: ['success-plugin-1'],
      rules: rules,
      skipDisabled: true
    })
    
    // 验证结果
    expect(results).toHaveLength(3) // 所有插件都被执行
    expect(results.every(r => r.success)).toBe(true)
    expect(results[0].pluginId).toBe('success-plugin-1')
    expect(results[1].pluginId).toBe('success-plugin-2')
    expect(results[2].pluginId).toBe('success-plugin-3')
  })
})