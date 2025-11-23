import { PluginManager } from '../core/pluginManager'
import { Plugin, PluginResult } from '../core/plugin'
import { PluginContext } from '../core/types'
import { SimpleEventBus } from '../core/eventBus'

// 创建一个会失败的 chatInjector 插件
class FailingChatInjector implements Plugin {
  meta = { 
    id: 'chatInjector', 
    name: 'Chat Injector (Failing)', 
    version: '1.0.0', 
    category: 'chat' as const, 
    enabled: true, 
    order: 2 
  }
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('初始化 Chat Injector 插件 (模拟失败版本)')
  }
  
  async start(): Promise<PluginResult> {
    console.log('🔴 Chat Injector 插件执行 - 模拟失败')
    return { 
      success: false, 
      message: '无法找到聊天输入框，页面结构可能已更改'
    }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

// 创建一个不应该被执行的插件
class ShouldNotExecutePlugin implements Plugin {
  meta = { 
    id: 'clearHistory', 
    name: 'Clear History', 
    version: '1.0.0', 
    category: 'maintenance' as const, 
    enabled: true, 
    order: 3 
  }
  
  executed = false
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('初始化 Clear History 插件')
  }
  
  async start(): Promise<PluginResult> {
    this.executed = true
    console.log('⚠️  这个插件不应该被执行！（如果看到这条消息说明失败停止功能有问题）')
    return { 
      success: true, 
      message: '历史记录已清除'
    }
  }
  
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
}

async function testRealWorldFailStop(): Promise<void> {
  console.log('\n🧪 真实场景测试：Chat Injector 失败时停止执行\n')
  
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
  
  // 从配置注册插件（模拟真实场景）
  const { getPlugins } = await import('../config/plugin-registry')
  const realPlugins = getPlugins()
  
  // 注册 newChatOpener（真实的）
  const newChatOpener = realPlugins.find(p => p.meta.id === 'newChatOpener')
  if (newChatOpener) {
    pm.register(newChatOpener)
  }
  
  // 注册会失败的 chatInjector（模拟的）
  const failingChatInjector = new FailingChatInjector()
  pm.register(failingChatInjector)
  
  // 注册不应该被执行的 clearHistory（测试用）
  const shouldNotExecute = new ShouldNotExecutePlugin()
  pm.register(shouldNotExecute)
  
  await pm.initAll(ctx)
  
  console.log('📋 测试场景：')
  console.log('  1. newChatOpener (应该成功)')
  console.log('  2. chatInjector (会失败，模拟真实失败场景)')
  console.log('  3. clearHistory (不应该被执行，因为 chatInjector 失败)\n')
  
  // 获取启用的插件并按order排序
  const enabledPlugins = [
    { meta: { id: 'newChatOpener', order: 1 } },
    { meta: { id: 'chatInjector', order: 2 } },
    { meta: { id: 'clearHistory', order: 3 } }
  ]
  
  // 构建工作流规则
  const rules = [
    { pluginId: 'newChatOpener', onSuccess: 'chatInjector' },
    { pluginId: 'chatInjector' } // 失败时停止
  ]
  
  try {
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
    
    // 关键验证
    if (shouldNotExecute.executed) {
      console.log('\n❌ 测试失败：clearHistory 插件被执行了，说明失败停止功能有问题！')
    } else {
      console.log('\n✅ 测试通过：clearHistory 插件没有被执行，失败停止功能正常！')
    }
    
  } catch (error) {
    console.error('执行工作流出错:', error)
  }
  
  console.log('\n✨ 真实场景测试完成！\n')
  
  await pm.stopAll()
  await pm.disposeAll()
}

// 运行测试
if (require.main === module) {
  testRealWorldFailStop().catch(error => {
    console.error('测试失败:', error)
    process.exit(1)
  })
}