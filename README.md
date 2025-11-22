# 项目概览

基于 Chrome DevTools Protocol 的智能代理系统，支持插件化架构和多种 AI 服务集成。

## 🎯 项目特色

- **智能对话管理**: 自动化处理聊天对话流程
- **多 AI 服务支持**: 集成 OpenAI、SiliconFlow 等多种 LLM 服务
- **插件化扩展**: 灵活的功能扩展机制
- **配置驱动**: 集中化的配置管理系统
- **日志追踪**: 完整的操作日志和调试支持

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

#### 运行项目
1. **运行测试**
   ```bash
   npm test
   ```

2. **开发模式**
   ```bash
   npm run test:watch
   ```

3. **启动应用**
   ```bash
   npm start
   ```

## 📁 项目结构

```
├── config/          # 配置管理系统
├── core/            # 核心模块（日志、插件、事件）
├── docs/            # 项目文档
├── plugins/         # 插件目录
├── shared/          # 共享模块（CDP、MCP、OpenAI）
├── tests/           # 测试文件
├── ts/              # TypeScript 示例和脚本
└── utils/           # 工具模块
```

## 🔧 核心功能

- ✅ **插件化架构** - 支持动态加载和管理插件
- ✅ **统一日志** - 完整的日志系统支持
- ✅ **配置管理** - 集中化的配置系统
- ✅ **CDP 集成** - Chrome DevTools Protocol 封装
- ✅ **AI 服务** - OpenAI 等 AI 服务集成
- ✅ **事件系统** - 插件间通信机制

## � 使用示例

### 基本使用
```typescript
import { ConfigService } from './config'

// 获取配置
const config = ConfigService.getInstance().get()

// 使用 CDP 连接 Chrome
const cdp = new ChromeCDP(config.chrome.devtoolsUrl)
await cdp.connect()
```

### 插件开发
```typescript
// 创建自定义插件
export class MyPlugin implements Plugin {
  async init(context: PluginContext) {
    this.config = ConfigService.getInstance().get()
  }
  
  async start() {
    // 插件逻辑
  }
}
```

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