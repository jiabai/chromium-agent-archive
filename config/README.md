# 配置管理系统文档

**📍 文档位置**: `config/README.md` | **[返回文档中心](../docs/README.md)**

## 概述

本项目采用集中化的配置管理系统，通过统一的配置服务（ConfigService）来管理所有配置项，替代分散的环境变量使用。配置支持多种来源（环境变量、配置文件、默认值），并提供类型安全和验证机制。

## 配置结构

配置系统采用分层结构，主要包含以下模块：

### 1. Chrome 配置
```typescript
chrome: {
  devtoolsUrl: string;  // Chrome DevTools 连接URL
  timeoutMs: number;    // 超时时间（毫秒）
}
```

### 2. OpenAI 配置
```typescript
openai: {
  apiKey: string;       // OpenAI API密钥
  baseURL?: string;     // API基础URL（可选）
  timeout: number;      // 请求超时时间
  maxRetries: number;  // 最大重试次数
}
```

### 3. LLM 配置
```typescript
llm: {
  apiKey: string;           // LLM API密钥
  baseURL: string;          // API基础URL
  timeout: number;          // 请求超时时间
  maxRetries: number;       // 最大重试次数
  model: string;            // 使用模型名称
  maxTokens: number;        // 最大token数
  htmlMaxChars: number;     // HTML内容最大字符数
  jsonMaxChars: number;     // JSON内容最大字符数
}
```

### 4. 新对话配置
```typescript
newChat: {
  axName: string;         // 可访问性元素名称
  axRole: string;         // 可访问性元素角色
  cdpTimeoutMs: number;   // CDP调用超时（毫秒）
  maxTotalMs: number;     // 最大总超时时间（毫秒）
  axTimeoutMs: number;    // 可访问性查询超时（毫秒）
  frameTimeoutMs: number; // 框架操作超时（毫秒）
}
```

### 5. 历史清理配置
```typescript
clearHistory: {
  timeoutMs: number;    // 清理操作超时时间（毫秒）
}
```

### 6. MCP 配置
```typescript
mcp: {
  command: string;              // MCP命令
  args: string[];               // 命令参数数组
  env: Record<string, string>;  // 环境变量
}
```

### 7. 快照配置
```typescript
snapshot: {
  connectionTimeout: number;     // 连接超时时间
  toolCallTimeout: number;       // 工具调用超时时间
  cleanupTimeout: number;       // 清理超时时间
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试延迟时间
  backoffMultiplier: number;     // 退避乘数
  maxBaseNameLength: number;    // 基础名称最大长度
  allowedFilenameChars: RegExp; // 允许的文件名字符正则
  allowedExtensionChars: RegExp;// 允许的扩展名字符正则
}
```

### 8. 插件配置
```typescript
plugins: {
  [pluginId: string]: {
    enabled: boolean;   // 插件是否启用
    order: number;    // 插件加载顺序
  }
}
```

### 9. 全局配置
```typescript
{
  logLevel: 'debug' | 'info' | 'warn' | 'error';  // 日志级别
  outputDir: string;                              // 输出目录路径
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
const llmConfig = configService.get('llm')
```

### 4. 更新配置
```typescript
// 更新单个模块
configService.update('openai', {
  apiKey: 'new-api-key'
})

// 更新多个模块
configService.updatePartial({
  openai: { apiKey: 'new-key' },
  chrome: { devtoolsUrl: 'http://localhost:9222' },
  llm: { apiKey: 'new-llm-key', model: 'gpt-4' }
})

// 验证配置
const isValid = configService.validate()
if (!isValid) {
  console.error('配置验证失败')
}
```

### 5. 保存配置到文件
```typescript
// 保存当前配置到 app.config.json
await configService.saveConfig()
```

### 6. 在插件中使用配置
```typescript
// 在插件初始化时获取配置
async init(context: PluginContext) {
  this.config = ConfigService.getInstance().get()
}

// 在插件功能中使用配置
async start() {
  const devtoolsUrl = this.config.chrome.devtoolsUrl
  const timeout = this.config.newChat.axTimeoutMs
  const model = this.config.llm.model
}
```

## 配置优先级

配置系统按以下优先级加载配置：

1. **环境变量** - 最高优先级，覆盖其他所有配置
2. **配置文件** - 中等优先级，提供默认配置
3. **默认值** - 最低优先级，内置的默认配置

### 配置验证

系统会自动验证配置的有效性，包括：
- API 密钥格式验证
- 超时时间范围检查
- 必填字段完整性检查
- URL 格式验证

使用 `configService.validate()` 手动触发验证。

### 环境变量映射

环境变量会自动映射到配置路径：
- `CHROME_DEVTOOLS_URL` → `chrome.devtoolsUrl`
- `CHROME_TIMEOUT_MS` → `chrome.timeoutMs`
- `OPENAI_API_KEY` → `openai.apiKey`
- `OPENAI_BASE_URL` → `openai.baseURL`
- `OPENAI_TIMEOUT` → `openai.timeout`
- `OPENAI_MAX_RETRIES` → `openai.maxRetries`
- `SILICONFLOW_API_KEY` → `llm.apiKey`（作为备选）
- `LLM_BASE_URL` → `llm.baseURL`
- `LLM_TIMEOUT` → `llm.timeout`
- `LLM_MAX_RETRIES` → `llm.maxRetries`
- `MODEL_NAME` → `llm.model`
- `LLM_MAX_TOKENS` → `llm.maxTokens`
- `HTML_MAX_CHARS` → `llm.htmlMaxChars`
- `JSON_MAX_CHARS` → `llm.jsonMaxChars`
- `NEWCHAT_AX_NAME` → `newChat.axName`
- `NEWCHAT_AX_ROLE` → `newChat.axRole`
- `CDP_TIMEOUT_MS` → `newChat.cdpTimeoutMs`
- `NEWCHAT_MAX_TOTAL_MS` → `newChat.maxTotalMs`
- `NEWCHAT_AX_TIMEOUT_MS` → `newChat.axTimeoutMs`
- `NEWCHAT_FRAME_TIMEOUT_MS` → `newChat.frameTimeoutMs`
- `CLEAR_TIMEOUT_MS` → `clearHistory.timeoutMs`
- `LOG_LEVEL` → `logLevel`
- `OUTPUT_DIR` → `outputDir`

## 配置文件

### 默认配置文件
- 路径: `config/app.config.json`
- 包含所有模块的默认配置
- 自动创建和加载，无需手动创建

### 环境配置文件
- 路径: `.env`（项目根目录）
- 可选的环境变量配置文件
- 会被自动加载并覆盖默认配置

## 迁移指南

### 从环境变量迁移

**旧代码（直接读取环境变量）:**
```typescript
const apiKey = process.env.OPENAI_API_KEY
const devtoolsUrl = process.env.CHROME_DEVTOOLS_URL
```

**新代码（使用配置服务）:**
```typescript
const config = ConfigService.getInstance().get()
const apiKey = config.openai.apiKey
const devtoolsUrl = config.chrome.devtoolsUrl
```

### 插件配置迁移

**旧代码（硬编码配置）:**
```typescript
const AX_NAME = '新对话'
const CDP_TIMEOUT = 10000
const MAX_TOTAL_TIMEOUT = 20000
const MODEL_NAME = 'gpt-3.5-turbo'
```

**新代码（使用配置）:**
```typescript
const config = ConfigService.getInstance().get()
const axName = config.newChat.axName
const cdpTimeout = config.newChat.cdpTimeoutMs
const maxTotalTimeout = config.newChat.maxTotalMs
const modelName = config.llm.model
```

## 最佳实践

1. **使用类型安全**: 利用 TypeScript 接口确保配置的类型安全
2. **环境变量优先**: 对于敏感信息（如 API 密钥）优先使用环境变量
3. **模块化配置**: 按功能模块组织配置，提高可维护性
4. **配置验证**: 在应用启动时验证配置的有效性
5. **文档同步**: 保持配置文档与实际配置结构同步
6. **API 密钥管理**: 使用环境变量存储敏感信息，避免硬编码
7. **超时配置**: 合理设置各种超时时间，避免过长或过短
8. **模型选择**: 根据需求选择合适的 LLM 模型，平衡性能和成本

## 故障排除

### 配置未生效
1. 检查环境变量是否正确设置
2. 确认配置文件路径存在且格式正确
3. 查看控制台是否有配置加载错误
4. 使用 `configService.validate()` 检查配置验证错误

### 类型错误
1. 检查配置项名称是否拼写正确
2. 确认配置值类型与接口定义匹配
3. 查看 TypeScript 编译错误提示

### 配置冲突
1. 检查环境变量是否覆盖了期望的配置文件值
2. 确认配置加载顺序是否符合预期
3. 使用 `configService.getAll()` 查看实际加载的完整配置
4. 检查必填字段是否缺失（如 API 密钥）

### API 密钥问题
1. 确保设置了 `OPENAI_API_KEY` 或 `SILICONFLOW_API_KEY`
2. 检查 API 密钥是否有效
3. 确认使用的 LLM 服务提供商

### 连接超时问题
1. 检查 `chrome.devtoolsUrl` 是否正确
2. 确认 Chrome DevTools 端口是否开放
3. 调整 `chrome.timeoutMs` 超时时间
4. 检查网络连接状态

### LLM 服务问题
1. 验证 API 密钥权限和配额
2. 检查 `llm.baseURL` 是否正确
3. 确认模型名称是否可用
4. 调整 `llm.timeout` 和 `llm.maxRetries` 参数

## 更新日志

### v2.0.0
- 重构配置结构，简化字段命名
- 新增 LLM 配置模块，支持多种 LLM 服务
- 更新环境变量映射，增加更多配置选项
- 优化配置验证机制
- 移除 schema.json 验证，改为代码内验证

### v1.0.0
- 实现集中化配置管理系统
- 支持多源配置加载（环境变量、配置文件、默认值）
- 提供类型安全的配置接口
- 支持配置验证和schema检查
- 重构所有插件使用新的配置系统