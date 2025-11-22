# 配置管理系统文档

## 概述

本项目采用集中化的配置管理系统，通过统一的配置服务（ConfigService）来管理所有配置项，替代分散的环境变量使用。配置支持多种来源（环境变量、配置文件、默认值），并提供类型安全和验证机制。

## 配置结构

配置系统采用分层结构，主要包含以下模块：

### 1. Chrome 配置
```typescript
chrome: {
  baseUrl: string;      // Chrome DevTools 基础URL
  port: number;       // Chrome 调试端口
  headless: boolean;  // 是否无头模式
}
```

### 2. OpenAI 配置
```typescript
openai: {
  apiKey: string;     // OpenAI API密钥
  baseURL: string;    // API基础URL
  model: string;      // 使用模型
  maxTokens: number;  // 最大token数
  temperature: number;// 温度参数
}
```

### 3. LLM 配置
```typescript
llm: {
  provider: 'openai' | 'anthropic';  // LLM提供商
  enabled: boolean;                  // 是否启用
}
```

### 4. 新对话配置
```typescript
newChat: {
  targetUrl: string;     // 目标聊天URL
  axName: string;       // 可访问性名称
  axRole: string;       // 可访问性角色
  axTimeout: number;    // 可访问性查询超时
  frameTimeout: number; // 框架操作超时
  cdpTimeout: number;   // CDP调用超时
  maxTotal: number;     // 最大总超时
}
```

### 5. 历史清理配置
```typescript
clearHistory: {
  enabled: boolean;     // 是否启用
  interval: number;     // 清理间隔(毫秒)
}
```

### 6. MCP 配置
```typescript
mcp: {
  command: string;      // MCP命令
  args: string[];       // 命令参数
  env: Record<string, string>; // 环境变量
}
```

### 7. 快照配置
```typescript
snapshot: {
  enabled: boolean;     // 是否启用快照
  directory: string;    // 快照保存目录
}
```

### 8. 插件配置
```typescript
plugins: {
  [pluginId: string]: {
    enabled: boolean;   // 插件是否启用
    order: number;      // 插件加载顺序
    // ...其他插件特定配置
  }
}
```

## 使用方法

### 1. 获取配置服务实例
```typescript
import { ConfigService } from './config'

const configService = ConfigService.getInstance()
```

### 2. 获取完整配置
```typescript
const config = configService.get()
console.log(config.openai.apiKey)
```

### 3. 获取特定模块配置
```typescript
const openaiConfig = configService.get('openai')
const chromeConfig = configService.get('chrome')
```

### 4. 在插件中使用配置
```typescript
// 在插件初始化时获取配置
async init(context: PluginContext) {
  this.config = ConfigService.getInstance().get()
}

// 在插件功能中使用配置
async start() {
  const targetUrl = this.config.newChat.targetUrl
  const timeout = this.config.newChat.axTimeout
}
```

## 配置优先级

配置系统按以下优先级加载配置：

1. **环境变量** - 最高优先级，覆盖其他所有配置
2. **配置文件** - 中等优先级，提供默认配置
3. **默认值** - 最低优先级，内置的默认配置

### 环境变量映射

环境变量会自动映射到配置路径：
- `OPENAI_API_KEY` → `openai.apiKey`
- `CHROME_BASE_URL` → `chrome.baseUrl`
- `NEWCHAT_TARGET_URL` → `newChat.targetUrl`
- 等等...

## 配置文件

### 默认配置文件
- 路径: `config/app.config.json`
- 包含所有模块的默认配置

### Schema验证
- 路径: `config/schema.json`
- 定义配置结构和验证规则
- 确保配置的类型安全和完整性

## 迁移指南

### 从环境变量迁移

**旧代码（使用环境变量）:**
```typescript
const apiKey = process.env.OPENAI_API_KEY
const timeout = parseInt(process.env.TIMEOUT || '30000')
```

**新代码（使用配置服务）:**
```typescript
const config = ConfigService.getInstance().get()
const apiKey = config.openai.apiKey
const timeout = config.newChat.axTimeout
```

### 插件配置迁移

**旧代码（硬编码配置）:**
```typescript
const TARGET_URL = 'chat.deepseek.com'
const AX_NAME = '新对话'
const TIMEOUT = 30000
```

**新代码（使用配置）:**
```typescript
const config = ConfigService.getInstance().get()
const targetUrl = config.newChat.targetUrl
const axName = config.newChat.axName
const timeout = config.newChat.axTimeout
```

## 最佳实践

1. **始终使用配置服务** - 不要直接读取环境变量
2. **类型安全** - 使用TypeScript接口确保配置类型正确
3. **默认值** - 为所有配置项提供合理的默认值
4. **验证** - 利用schema验证确保配置有效性
5. **模块化** - 按功能模块组织配置结构

## 故障排除

### 配置未生效
1. 检查环境变量是否正确设置
2. 确认配置文件路径存在且格式正确
3. 查看控制台是否有配置加载错误

### 类型错误
1. 检查配置项名称是否拼写正确
2. 确认配置值类型与schema定义匹配
3. 使用TypeScript接口进行类型检查

### 配置冲突
1. 检查环境变量是否覆盖了期望的配置文件值
2. 确认配置加载顺序是否符合预期
3. 使用`configService.get()`查看实际加载的配置

## 更新日志

### v1.0.0
- 实现集中化配置管理系统
- 支持多源配置加载（环境变量、配置文件、默认值）
- 提供类型安全的配置接口
- 支持配置验证和schema检查
- 重构所有插件使用新的配置系统