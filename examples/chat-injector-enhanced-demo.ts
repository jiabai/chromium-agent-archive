import { PluginManager } from '../../core/pluginManager'
import { createLogger } from '../../core/logger'
import chatInjectorEnhanced from '../plugins/chat/chatInjectorEnhanced'

/**
 * Chat Injector Enhanced 插件使用示例
 * 
 * 演示如何使用增强版聊天注入插件，包括回答完成检测功能
 */

async function main() {
  // 创建日志器
  const logger = createLogger('ChatInjectorEnhanced-Demo')
  
  console.log('🚀 开始 Chat Injector Enhanced 插件演示')
  console.log('=' .repeat(50))
  
  // 创建插件管理器
  const pluginManager = new PluginManager(logger)
  
  try {
    // 注册增强版插件
    console.log('📋 注册 Chat Injector Enhanced 插件...')
    await pluginManager.register(chatInjectorEnhanced)
    console.log('✅ 插件注册成功')
    
    // 获取插件信息
    const pluginInfo = pluginManager.getPlugin('chatInjectorEnhanced')
    console.log('🔍 插件信息:')
    console.log(`   ID: ${pluginInfo?.meta.id}`)
    console.log(`   名称: ${pluginInfo?.meta.name}`)
    console.log(`   版本: ${pluginInfo?.meta.version}`)
    console.log(`   描述: ${pluginInfo?.meta.description}`)
    console.log('')
    
    // 启动插件
    console.log('🎯 启动插件，开始注入问题并检测回答...')
    console.log('   请确保:')
    console.log('   - Chrome浏览器已启动并开启调试端口 (9222)')
    console.log('   - DeepSeek页面已打开 (https://chat.deepseek.com)')
    console.log('   - 网络连接正常')
    console.log('')
    
    const startTime = Date.now()
    
    // 执行插件
    const result = await pluginManager.startPlugin('chatInjectorEnhanced')
    
    const duration = Date.now() - startTime
    
    console.log('📊 执行结果:')
    console.log(`   整体成功: ${result.success ? '✅' : '❌'}`)
    console.log(`   执行消息: ${result.message}`)
    console.log(`   总耗时: ${duration}ms`)
    console.log('')
    
    if (result.data) {
      console.log('📈 详细信息:')
      console.log(`   注入方法: ${result.data.executionMethod}`)
      console.log(`   使用选择器: ${result.data.selector}`)
      console.log(`   注入文本: ${result.data.injectedText}`)
      console.log('')
      
      if (result.data.answerDetection) {
        const detection = result.data.answerDetection
        console.log('🔍 回答检测结果:')
        console.log(`   检测成功: ${detection.complete ? '✅' : '❌'}`)
        console.log(`   检测耗时: ${detection.duration}ms`)
        console.log(`   完成原因: ${detection.reason}`)
        if (detection.finalContent) {
          console.log(`   回答内容预览: ${detection.finalContent}...`)
        }
        console.log('')
      }
    }
    
    if (!result.success && result.error) {
      console.log('❌ 错误信息:')
      console.log(`   ${result.error}`)
      console.log('')
    }
    
  } catch (error) {
    console.error('💥 演示过程中发生错误:', error)
    if (error instanceof Error) {
      console.error(`错误类型: ${error.name}`)
      console.error(`错误消息: ${error.message}`)
      console.error(`错误堆栈: ${error.stack}`)
    }
  } finally {
    // 清理资源
    console.log('🧹 清理资源...')
    await pluginManager.dispose()
    console.log('✅ 演示完成')
    console.log('=' .repeat(50))
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('无法启动演示:', error)
    process.exit(1)
  })
}

export { main }