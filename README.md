# 项目概览

基于 Chrome DevTools Protocol 的智能代理系统，支持插件化架构和多种 AI 服务集成。

## 🎯 项目特色

- **智能对话管理**: 自动化处理聊天对话流程
- **多 AI 服务支持**: 集成 OpenAI、SiliconFlow 等多种 LLM 服务
- **插件化扩展**: 灵活的功能扩展机制
- **配置驱动**: 集中化的配置管理系统
- **日志追踪**: 完整的操作日志和调试支持
- **工作流控制**: 智能的插件执行顺序和失败处理机制
- **MCP 集成**: 支持 Model Context Protocol 协议

## 📚 文档导航

### 🎯 核心文档
- **[📖 文档中心](docs/README.md)** - 完整的文档导航和概览
- **[🔧 配置系统](config/README.md)** - 配置管理系统详解
- **[📊 日志系统](docs/logging-guide.md)** - 日志系统使用指南
- **[🧪 测试文档](tests/README.md)** - 测试模块说明

### 🚀 快速开始

#### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

#### 安装步骤
1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd chromium-agent-archive
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env 文件并配置必要的 API 密钥
   cp .env.example .env
   # 编辑 .env 文件，添加你的 API 密钥
   ```

#### 开发命令
1. **开发模式**（热重载）
   ```bash
   npm run dev
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **运行测试**
   ```bash
   npm test
   ```

4. **测试覆盖度**
   ```bash
   npm run test:coverage
   ```

5. **启动应用**
   ```bash
   npm start
   ```

## 📁 项目结构

```
├── config/          # 配置管理系统
├── core/            # 核心模块（日志、插件、事件）
├── docs/            # 项目文档
├── plugins/         # 插件目录
│   ├── chat/        # 聊天相关插件
│   ├── diagnostics/ # 诊断工具插件
│   ├── exporters/   # 数据导出插件
│   ├── extractors/  # 数据提取插件
│   └── maintenance/ # 维护工具插件
├── shared/          # 共享模块（CDP、MCP、OpenAI）
├── tests/           # 测试文件
├── ts/              # TypeScript 示例和脚本
├── utils/           # 工具模块
└── scripts/         # 脚本文件
```

## 🔧 核心功能

- ✅ **插件化架构** - 支持动态加载和管理插件
- ✅ **统一日志** - 完整的日志系统支持
- ✅ **配置管理** - 集中化的配置系统
- ✅ **CDP 集成** - Chrome DevTools Protocol 封装
- ✅ **MCP 集成** - Model Context Protocol 支持
- ✅ **AI 服务** - OpenAI 等 AI 服务集成
- ✅ **事件系统** - 插件间通信机制
- ✅ **工作流控制** - 插件执行顺序和失败处理

## � 使用示例

### 基本使用
```typescript
import { ConfigService } from './config/config.service'
import { ChromeCDP } from './shared/cdp'

// 获取配置
const configService = ConfigService.getInstance()
const config = configService.get()

// 使用 CDP 连接 Chrome
const cdp = new ChromeCDP(config.chrome.devtoolsUrl)
await cdp.connect()
```

### 插件开发
```typescript
import { Plugin, PluginContext, PluginMetadata } from './core/types'
import { ConfigService } from './config/config.service'

// 创建自定义插件
export class MyPlugin implements Plugin {
  meta: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    enabled: true,
    order: 1
  }
  
  private config!: ConfigService
  
  async init(context: PluginContext): Promise<void> {
    this.config = ConfigService.getInstance()
    context.log.info('MyPlugin initialized')
  }
  
  async start(): Promise<void> {
    // 插件逻辑
    console.log('Plugin started')
  }
  
  async stop(): Promise<void> {
    // 清理逻辑
  }
}
```

### 环境配置
项目使用 `.env` 文件进行配置，主要配置项包括：

```bash
# Chrome DevTools 配置
CHROME_DEVTOOLS_URL=http://localhost:9222

# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key-here

# 其他 LLM 服务配置
SILICONFLOW_API_KEY=your-siliconflow-api-key-here
MODEL_NAME=Qwen/Qwen2.5-7B-Instruct

# 日志配置
LOG_LEVEL=info

# 输出配置
OUTPUT_DIR=./output
```

完整的配置项请参考 `.env.example` 文件。

##  了解更多

请访问 **[文档中心](docs/README.md)** 获取完整的文档和使用指南。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- Chrome DevTools Protocol 团队
- OpenAI 提供的优秀 API
- 所有贡献者和支持者