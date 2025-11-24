import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
import { ConfigService } from '../../../config'

/**
 * 示例插件 - 展示插件描述功能
 * 
 * 功能说明：
 * - 演示如何创建带有详细描述的插件
 * - 展示插件生命周期的各个阶段
 * - 提供插件开发的最佳实践示例
 * 
 * 使用场景：
 * - 插件开发学习
 * - 系统功能测试
 * - 插件框架验证
 * 
 * 配置选项：
 * - message: 自定义输出消息
 * - delay: 延迟执行时间（毫秒）
 * - repeat: 重复执行次数
 */

let config: any = null
let logger: any = null
let ctx: PluginContext | null = null

async function init(context: PluginContext): Promise<void> {
  ctx = context
  logger = context.log
  // 获取插件配置（如果不存在则使用默认配置）
  const pluginConfig = ConfigService.getInstance().get('plugins') || {}
  config = pluginConfig.exampleWithDescription || { enabled: true }
  
  logger.info('🚀 示例插件初始化开始')
  logger.info(`插件ID: exampleWithDescription`)
  logger.info(`插件名称: 示例插件（带描述）`)
  logger.info(`插件描述: 这是一个展示插件描述功能的示例插件，演示如何创建带有详细功能说明、使用场景和配置选项的插件。适用于插件开发学习和框架功能测试。`)
  logger.info(`配置选项: ${JSON.stringify(config, null, 2)}`)
}

async function start(): Promise<PluginResult> {
  try {
    logger.info('📋 插件执行开始')
    
    const message = config.message || 'Hello from example plugin!'
    const delay = config.delay || 0
    const repeat = config.repeat || 1
    
    if (delay > 0) {
      logger.info(`⏱️  延迟执行: ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    const results: string[] = []
    for (let i = 0; i < repeat; i++) {
      const msg = `${message} (第${i + 1}次)`
      logger.info(`💬 ${msg}`)
      results.push(msg)
    }
    
    logger.info('✅ 插件执行完成')
    
    return {
      success: true,
      message: `示例插件成功执行完成，共输出${results.length}条消息`,
      data: {
        messages: results,
        config: config,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error: any) {
    logger.error(`❌ 插件执行失败: ${error.message}`)
    return {
      success: false,
      message: `示例插件执行失败: ${error.message}`,
      data: { error: error.message }
    }
  }
}

async function stop(): Promise<void> {
  logger.info('⏹️  插件停止')
}

async function dispose(): Promise<void> {
  logger.info('🧹 插件资源清理')
  config = null
  logger = null
  ctx = null
}

const plugin: Plugin = {
  meta: {
    id: 'exampleWithDescription',
    name: '示例插件（带描述）',
    version: '1.0.0',
    category: 'maintenance',
    enabled: true,
    order: 999,
    description: '这是一个展示插件描述功能的示例插件，演示如何创建带有详细功能说明、使用场景和配置选项的插件。适用于插件开发学习和框架功能测试。'
  },
  init,
  start,
  stop,
  dispose
}

export default plugin