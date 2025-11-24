# 插件开发指南

## 概述

本系统采用插件化架构，支持动态加载和管理插件。每个插件都是一个独立的模块，通过实现 `Plugin` 接口来提供特定的功能。

## 插件接口定义

### PluginMeta 接口

每个插件必须提供元数据信息：

```typescript
export interface PluginMeta {
  id: string              // 插件唯一标识符
  name: string            // 插件显示名称
  version: string       // 插件版本号
  category?: string     // 插件分类（chat, exporters, extractors, maintenance, diagnostics）
  dependsOn?: string[]  // 依赖的其他插件ID
  enabled: boolean       // 是否启用
  order?: number       // 执行顺序（数字越小越先执行）
  description?: string // 插件功能描述
}
```

### Plugin 接口

插件必须实现以下生命周期方法：

```typescript
export interface Plugin {
  meta: PluginMeta
  init(ctx: PluginContext): Promise<void> | void  // 初始化插件
  start(): Promise<PluginResult | void> | PluginResult | void  // 启动插件
  stop(): Promise<void> | void                    // 停止插件
  dispose(): Promise<void> | void                // 销毁插件
}
```

## 插件生命周期

1. **init()**: 插件初始化阶段，获取配置、设置日志等
2. **start()**: 插件执行主要功能，返回执行结果
3. **stop()**: 插件停止运行（可选）
4. **dispose()**: 插件清理资源（可选）

### 生命周期方法的返回类型

插件接口支持灵活的返回类型：
- `init()`: 可以返回 `Promise<void>` 或 `void`
- `start()`: 可以返回 `Promise<PluginResult>`、`PluginResult`、`Promise<void>` 或 `void`
- `stop()` 和 `dispose()`: 可以返回 `Promise<void>` 或 `void`

这种设计允许插件开发者选择是否返回执行结果。如果 `start()` 方法返回 `PluginResult`，系统会记录执行结果；如果返回 `void`，系统会认为插件执行成功。

## 插件开发步骤

### 0. 重要提示：正确的导入路径

**注意**：插件开发中需要使用正确的导入路径：

```typescript
// ✅ 正确的导入方式
import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'

// ❌ 错误的导入方式（文档中可能还保留旧的示例）
import { Plugin, PluginContext, PluginResult } from '../../../core/types'
```

### 1. 创建插件目录

在相应的插件分类目录下创建新插件目录：

```
plugins/
├── chat/           # 聊天相关插件
├── exporters/      # 数据导出插件
├── extractors/     # 数据提取插件
├── maintenance/    # 维护工具插件
└── diagnostics/    # 诊断工具插件
```

### 2. 实现插件类

创建 `index.ts` 文件，实现 Plugin 接口：

```typescript
import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'
```
const plugin: Plugin = {
  meta: {
    id: 'myPlugin',
    name: 'My Plugin',
    version: '1.0.0',
    category: 'chat',
    enabled: true,
    description: '我的插件功能描述'
  },
  
  async init(ctx: PluginContext): Promise<void> {
    // 初始化逻辑
    ctx.log.info('MyPlugin initialized')
  },
  
  async start(): Promise<PluginResult> {
    // 主要功能逻辑
    return {
      success: true,
      message: '插件执行成功',
      data: { /* 返回数据 */ }
    }
  },
  
  async stop(): Promise<void> {
    // 停止逻辑（可选）
  },
  
  async dispose(): Promise<void> {
    // 清理逻辑（可选）
  }
}

export default plugin
```

### 3. 插件配置

在 `config/app.config.json` 中添加插件配置：

```json
{
  "plugins": {
    "myPlugin": {
      "enabled": true,
      "order": 1
    }
  }
}
```

## 插件最佳实践

### 1. 错误处理

```typescript
async start(): Promise<PluginResult> {
  try {
    // 主要逻辑
    return { success: true, message: '成功' }
  } catch (error) {
    return {
      success: false,
      message: `执行失败: ${error.message}`,
      data: { error: error.message }
    }
  }
}
```

### 2. 日志记录

```typescript
async init(context: PluginContext): Promise<void> {
  this.logger = context.log
  this.logger.info('插件初始化开始')
  this.logger.debug('调试信息')
  this.logger.warn('警告信息')
  this.logger.error('错误信息')
}
```

### 3. 配置管理

```typescript
import { ConfigService } from '../../../config'

async init(context: PluginContext): Promise<void> {
  const config = ConfigService.getInstance().get('myPlugin')
  this.timeout = config.timeout || 5000
}
```

## 插件示例

### 简单插件示例

```typescript
import { Plugin, PluginResult } from '../../../core/plugin'
import { PluginContext } from '../../../core/types'

const plugin: Plugin = {
  meta: {
    id: 'helloWorld',
    name: 'Hello World',
    version: '1.0.0',
    category: 'maintenance',
    enabled: true,
    description: '简单的Hello World插件示例'
  },
  
  async init(ctx: PluginContext): Promise<void> {
    ctx.log.info('HelloWorld plugin initialized')
  },
  
  async start(): Promise<PluginResult> {
    console.log('Hello, World!')
    return {
      success: true,
      message: 'Hello World executed successfully',
      data: { message: 'Hello, World!' }
    }
  },
  
  async stop(): Promise<void> {},
  async dispose(): Promise<void> {}
}

export default plugin
```

### 复杂插件示例

参考现有的插件实现：
- **chatInjector**: 使用CDP协议进行文本注入
- **newChatOpener**: 多种策略的元素定位和点击
- **snapshot**: MCP协议集成和文件操作

## 插件测试

### 单元测试

```typescript
import myPlugin from './index'

describe('MyPlugin', () => {
  test('should initialize correctly', async () => {
    const mockContext = {
      log: { info: jest.fn(), error: jest.fn() },
      bus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
      storage: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
      env: 'node'
    }
    await myPlugin.init(mockContext)
    expect(mockContext.log.info).toHaveBeenCalledWith('MyPlugin initialized')
  })
})
```

### 集成测试

```typescript
import { PluginManager } from '../../../core/plugin'

test('should load and execute plugin', async () => {
  const manager = PluginManager.getInstance()
  await manager.loadPlugin('myPlugin')
  const result = await manager.executePlugin('myPlugin')
  expect(result.success).toBe(true)
})
```

## 插件文档

每个插件应该包含以下文档：

1. **功能描述**: 插件的主要功能和用途
2. **使用场景**: 适用的业务场景
3. **配置说明**: 可用的配置选项
4. **依赖关系**: 依赖的其他插件或服务
5. **返回值**: 插件执行结果的格式和含义

## 插件分类指南

- **chat**: 聊天相关的功能插件
- **exporters**: 数据导出和保存插件
- **extractors**: 数据提取和分析插件
- **maintenance**: 系统维护和工具插件
- **diagnostics**: 诊断和调试插件

选择合适的分类有助于插件的组织和管理。