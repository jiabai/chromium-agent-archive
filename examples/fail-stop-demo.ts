import { SimpleEventBus } from '../core/eventBus'
import { PluginManager } from '../core/pluginManager'
import { Plugin, PluginResult } from '../core/plugin'
import { PluginContext } from '../core/types'

// 模拟插件 - 成功的插件
class SuccessPlugin implements Plugin {
  meta = { id: 'newChatOpener', name: 'New Chat Opener', version: '1.0.0', category: 'chat' as const, enabled: true, order: 1 }
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('初始化 New Chat Opener 插件')
  }
  
  async start(): Promise<PluginResult> {
    console.log('🟢 执行 New Chat Opener 插件 - 成功')
    return { success: true, message: '成功打开新对话' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

// 模拟插件 - 会失败的插件
class FailurePlugin implements Plugin {
  meta = { id: 'chatInjector', name: 'Chat Injector', version: '1.0.0', category: 'chat' as const, enabled: true, order: 2 }
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('初始化 Chat Injector 插件')
  }
  
  async start(): Promise<PluginResult> {
    console.log('🔴 执行 Chat Injector 插件 - 失败')
    return { success: false, message: '注入失败：无法找到聊天输入框' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

// 模拟插件 - 不应该被执行的插件
class ShouldNotExecutePlugin implements Plugin {
  meta = { id: 'clearHistory', name: 'Clear History', version: '1.0.0', category: 'maintenance' as const, enabled: true, order: 3 }
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('初始化 Clear History 插件')
  }
  
  async start(): Promise<PluginResult> {
    console.log('⚠️  这个插件不应该被执行！')
    return { success: true, message: '历史记录已清除' }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

// 演示函数
async function demonstrateFailStopBehavior(): Promise<void> {
  console.log('\n🚀 演示：前一个插件失败时停止执行后续插件\n')
  
  const bus = new SimpleEventBus()
  const log = {
    debug: (...args: unknown[]) => console.debug('🐛', ...args),
    info: (...args: unknown[]) => console.info('ℹ️ ', ...args),
    warn: (...args: unknown[]) => console.warn('⚠️ ', ...args),
    error: (...args: unknown[]) => console.error('❌', ...args)
  }
  const storage = {
    get: async <T = unknown>(key: string): Promise<T | undefined> => undefined,
    set: async <T = unknown>(key: string, value: T): Promise<void> => {},
    remove: async (key: string): Promise<void> => {}
  }
  
  const ctx: PluginContext = { bus, log, storage, env: 'node' }
  const pm = new PluginManager()
  
  // 注册插件
  pm.register(new SuccessPlugin())
  pm.register(new FailurePlugin())
  pm.register(new ShouldNotExecutePlugin())
  
  await pm.initAll(ctx)
  
  // 获取插件并按order排序
  const plugins = [
    { meta: { id: 'newChatOpener', order: 1 } },
    { meta: { id: 'chatInjector', order: 2 } },
    { meta: { id: 'clearHistory', order: 3 } }
  ]
  
  // 构建工作流规则
  const rules = [
    { pluginId: 'newChatOpener', onSuccess: 'chatInjector' },
    { pluginId: 'chatInjector' } // 失败时停止
  ]
  
  console.log('📋 执行计划：')
  console.log('  1. New Chat Opener (应该成功)')
  console.log('  2. Chat Injector (会失败)')
  console.log('  3. Clear History (不应该被执行，因为前一个失败)\n')
  
  // 执行工作流
  const results = await pm.startWorkflow({
    starts: ['newChatOpener'],
    rules: rules,
    skipDisabled: true
  })
  
  console.log('\n📊 执行结果：')
  results.forEach((result, index) => {
    const status = result.success ? '✅ 成功' : '❌ 失败'
    console.log(`  ${index + 1}. ${result.pluginId}: ${status} - ${result.message}`)
  })
  
  const failedCount = results.filter(r => !r.success).length
  if (failedCount > 0) {
    console.log(`\n🛑 检测到 ${failedCount} 个插件失败，后续插件已跳过执行`)
  }
  
  console.log('\n✨ 演示完成！\n')
  
  await pm.stopAll()
  await pm.disposeAll()
}

// 运行演示
if (require.main === module) {
  demonstrateFailStopBehavior().catch(error => {
    console.error('演示失败:', error)
    process.exit(1)
  })
}