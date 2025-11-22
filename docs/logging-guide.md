# 日志系统使用指南

**📍 文档位置**: `docs/logging-guide.md` | **[返回文档中心](README.md)**

## 功能特性

✅ **可配置的日志级别** - debug, info, warn, error, silent
✅ **格式化的日志输出** - 带时间戳、插件信息、颜色支持
✅ **文件日志存储** - 自动创建日志目录，结构化存储
✅ **日志轮转机制** - 基于文件大小和时间自动轮转
✅ **插件友好的日志接口** - 专为插件系统设计

## 快速开始

### 1. 基础使用

```typescript
import { createLogger } from '../core/logging.js'

// 创建日志器
const logger = createLogger({
  level: 'info',
  enableConsole: true,
  enableFile: true,
  logDir: './logs'
})

// 使用日志器
logger.info('应用启动成功')
logger.warn('这是一个警告信息')
logger.error('发生错误:', new Error('示例错误'))
```

### 2. 插件日志

```typescript
import { getPluginLogger } from '../core/logging.js'

// 获取插件日志器
const pluginLog = getPluginLogger('chatInjector', 'Chat注入器')

// 使用插件日志器
pluginLog.info('开始注入文本')
pluginLog.debug('调试信息', { someData: 'value' })
pluginLog.error('注入失败', { error: error.message })

// 使用便捷方法
pluginLog.startOperation('文本注入')
pluginLog.completeOperation('文本注入', { result: '成功' })
pluginLog.failOperation('文本注入', error, { selector: '#input' })
```

### 3. 配置选项

```typescript
const logger = createLogger({
  level: 'debug',           // 日志级别
  enableConsole: true,      // 控制台输出
  enableFile: true,        // 文件输出
  logDir: './logs',        // 日志目录
  maxFileSize: 10 * 1024 * 1024,  // 最大文件大小 (10MB)
  maxFiles: 5,             // 最大文件数量
  enableColors: true,      // 启用颜色
  timestampFormat: 'iso'   // 时间戳格式
})
```

## 日志级别说明

- **debug**: 调试信息，最详细的日志
- **info**: 一般信息，默认级别
- **warn**: 警告信息
- **error**: 错误信息
- **silent**: 静默模式，不输出任何日志

## 日志格式

### 控制台输出
```
2024-01-15T10:30:45.123Z [INFO] [chatInjector] 文本注入成功
2024-01-15T10:30:45.456Z [ERROR] [chatInjector] 注入失败: 选择器未找到
```

### 文件输出
```
2024-01-15T10:30:45.123Z [INFO] [chatInjector] 文本注入成功
2024-01-15T10:30:45.456Z [ERROR] [chatInjector] 注入失败: 选择器未找到
```

## 插件集成示例

### 修改现有插件

```typescript
// 原代码
console.log('注入文本:', text)

// 新代码
import { getPluginLogger } from '../../core/logging.js'

const logger = getPluginLogger('chatInjector', 'Chat注入器')
logger.info('注入文本', { text, selector })
```

### 完整插件示例

```typescript
import { PluginContext } from '../core/types.js'
import { getPluginLogger } from '../core/logging.js'

export async function run(ctx: PluginContext, text: string): Promise<void> {
  const logger = getPluginLogger('myPlugin', '我的插件')
  
  logger.startOperation('处理任务', { text })
  
  try {
    // 执行任务
    logger.debug('处理中...', { step: 1 })
    
    // 模拟工作
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    logger.completeOperation('处理任务', { result: '成功' })
  } catch (error) {
    logger.failOperation('处理任务', error, { text })
    throw error
  }
}
```

## 日志轮转

日志系统会自动处理以下情况：

1. **文件大小轮转**: 当日志文件超过 `maxFileSize` 时自动创建新文件
2. **数量限制**: 保留最多 `maxFiles` 个日志文件
3. **时间戳**: 自动为轮转的文件添加时间戳

## 性能考虑

- 日志写入是异步的，使用缓冲区机制
- 每秒自动刷新缓冲区到文件
- 缓冲区大小超过100条记录时立即刷新
- 支持优雅关闭，确保所有日志都被写入

## 错误处理

日志系统具有健壮的错误处理：

- 文件写入失败时自动降级到控制台输出
- 配置加载失败时使用默认配置
- 轮转失败时不会影响正常日志记录
- 所有错误都会被记录到控制台

## 最佳实践

1. **使用适当的日志级别**: debug用于调试，info用于重要事件，warn用于警告，error用于错误
2. **包含有用的上下文**: 在日志中包含相关的数据和信息
3. **使用插件日志器**: 为每个插件使用独立的日志器，便于区分和调试
4. **定期清理日志**: 配置合适的 `maxFiles` 参数，避免磁盘空间不足
5. **结构化日志**: 使用对象格式记录复杂数据，便于后续分析