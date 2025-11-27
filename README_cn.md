# 项目概览

基于 Chrome DevTools Protocol 的智能代理系统，支持插件架构和多种 AI 服务集成。

## 🚀 项目介绍

这是一个功能强大的浏览器自动化代理系统，专为处理复杂的网页交互和 AI 对话场景而设计。系统通过 Chrome DevTools Protocol (CDP) 与浏览器深度集成，实现智能对话管理、数据提取和自动化操作。

### 💡 核心能力

- **🤖 智能对话处理**：自动识别和处理网页上的对话界面，支持多种聊天平台
- **📊 智能数据提取**：智能提取网页中的对话内容、链接、历史记录等关键信息
- **🔄 自动化工作流**：基于插件的可配置工作流，支持失败重试和顺序控制
- **🧠 AI 服务集成**：无缝集成 OpenAI、SiliconFlow 等多种 LLM 服务
- **📸 页面快照**：支持页面状态捕获和诊断
- **🔧 灵活扩展**：插件架构支持自定义功能扩展

### 🎯 典型应用场景

- **客服对话分析**：自动提取和分析客服对话记录
- **内容监控**：监控特定网页的内容变化和更新
- **数据采集**：从复杂的网页界面中提取结构化数据
- **自动化测试**：基于 CDP 的浏览器自动化测试
- **AI 对话集成**：将网页对话与 AI 服务集成

### 🔗 技术架构

系统采用分层架构设计：
- **核心层**：提供插件管理、事件总线、配置管理等基础服务
- **插件层**：实现具体的业务功能，如对话提取、数据导出等
- **服务层**：集成 CDP、OpenAI、MCP 等外部服务
- **工具层**：提供日志、存储、工具函数等支持

## 🎯 项目特性

- **🤖 智能对话管理**：自动处理聊天对话流程，支持多种对话平台
- **🧠 多 AI 服务支持**：集成 OpenAI、SiliconFlow 等多种 LLM 服务，支持智能对话分析
- **🔌 插件扩展**：灵活的功能扩展机制，支持插件的动态加载和管理
- **⚙️ 配置驱动**：集中式配置管理系统，支持多环境配置
- **📋 日志跟踪**：完整的操作日志和调试支持，支持多级日志记录
- **🔄 工作流控制**：智能的插件执行顺序和失败处理机制，支持失败重试
- **🌐 MCP 集成**：支持 Model Context Protocol，实现标准化的 AI 服务集成
- **📊 智能数据提取**：自动识别和提取网页中的结构化数据
- **🎯 精准元素定位**：基于 CDP 的精准 DOM 元素操作和交互
- **🔒 安全可靠**：完整的错误处理和异常恢复机制

## 📚 文档导航

### 🎯 核心文档
- **[📖 文档中心](docs/index.md)** - 完整的文档导航和概览
- **[🔧 配置系统](config/README.md)** - 配置管理系统详情
- **[📊 日志系统](docs/logging-guide.md)** - 日志系统使用指南
- **[🧪 测试文档](tests/README.md)** - 测试模块说明

### 🔧 系统要求

#### 基础环境
- **Node.js**：18.0 或更高版本
- **npm/yarn**：包管理器
- **Chrome 浏览器**：支持 DevTools Protocol
- **操作系统**：Windows/macOS/Linux

#### 可选依赖
- **Chrome 远程调试端口**：用于 CDP 连接
- **AI 服务 API 密钥**：OpenAI、SiliconFlow 等服务

### 🚀 快速开始

#### 环境准备
- **Node.js**：18.0 或更高版本
- **包管理器**：npm 或 yarn
- **Chrome 浏览器**：最新版本（支持 DevTools Protocol）
- **Git**：用于克隆项目

#### 安装步骤

##### 1. 克隆项目
```bash
git clone <repository-url>
cd chromium-agent-archive
```

##### 2. 安装依赖
```bash
npm install
```

##### 3. 配置环境变量
```bash
# 创建环境配置文件
cp .env.example .env
# 编辑 .env 文件，配置必要的 API 密钥和参数
```

##### 4. 启动 Chrome 远程调试（可选）
如果需要使用 CDP 功能，确保 Chrome 以远程调试模式启动：
```bash
# Windows 用户可以使用提供的脚本
.\scripts\Start-Chrome-9222.ps1

# 或手动启动 Chrome
chrome.exe --remote-debugging-port=9222
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

4. **测试覆盖率**
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

- ✅ **插件架构** - 支持插件的动态加载和管理
- ✅ **统一日志** - 完整的日志系统支持
- ✅ **配置管理** - 集中式配置系统
- ✅ **CDP 集成** - Chrome DevTools Protocol 封装
- ✅ **MCP 集成** - Model Context Protocol 支持
- ✅ **AI 服务** - 集成 OpenAI 等 AI 服务
- ✅ **事件系统** - 插件间通信机制
- ✅ **工作流控制** - 插件执行顺序和失败处理

## 💻 使用示例

### 基本用法
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
    context.log.info('MyPlugin 已初始化')
  }
  
  async start(): Promise<void> {
    // 插件逻辑
    console.log('插件已启动')
  }
  
  async stop(): Promise<void> {
    // 清理逻辑
  }
}
```

### 环境配置
项目使用 `.env` 文件进行配置。主要配置项包括：

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

## 📖 了解更多

请访问 **[文档中心](docs/index.md)** 获取完整的文档和使用指南。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- Chrome DevTools Protocol 团队
- OpenAI 提供优秀的 API
- 所有贡献者和支持者