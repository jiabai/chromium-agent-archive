# 项目文档中心

本项目采用分布式文档管理策略，各模块文档位于其专业目录，同时在此提供统一的文档导航和概览。

## 📚 文档结构

### 核心文档
| 文档 | 位置 | 描述 |
|------|------|------|
| [日志系统指南](logging-guide.md) | `docs/logging-guide.md` | 日志系统的使用指南和最佳实践 |
| [配置管理系统](config/README.md) | `config/README.md` | 配置系统的架构、使用方法和迁移指南 |
| [测试文档](tests/README.md) | `tests/README.md` | 测试模块的结构说明和运行指南 |

### 快速导航

#### 🚀 开始使用
- [日志系统指南](logging-guide.md) - 了解如何使用日志系统
- [配置管理系统](config/README.md) - 学习配置管理的使用方法

#### 🔧 开发维护
- [测试文档](tests/README.md) - 运行测试和了解测试结构
- [配置管理系统](config/README.md) - 配置系统的详细文档

#### 📖 模块文档

##### 核心模块 (`core/`)
- `logger.ts` - 核心日志器实现
- `logging.ts` - 统一日志接口
- `plugin.ts` - 插件基类
- `pluginManager.ts` - 插件管理器
- `eventBus.ts` - 事件总线

##### 配置模块 (`config/`)
- `config.service.ts` - 配置服务主类
- `plugin-registry.ts` - 插件注册管理
- `types.ts` - 配置类型定义

##### 工具模块 (`utils/`)
- `pluginLogger.ts` - 插件专用日志器

##### 共享模块 (`shared/`)
- `cdp.ts` - Chrome DevTools Protocol 封装
- `mcp.ts` - MCP 协议相关
- `openai.ts` - OpenAI API 封装

## 📋 文档分类

### 用户文档
面向最终用户的使用指南：
- [日志系统指南](logging-guide.md)

### 开发文档
面向开发者的技术文档：
- [配置管理系统](config/README.md)
- [测试文档](tests/README.md)

### API 文档
各模块的接口说明包含在相应的模块文档中。

## 🔍 文档查找指南

1. **使用指南** → 查看 `docs/` 目录下的 `.md` 文件
2. **模块详情** → 查看各模块目录下的 `README.md`
3. **API 参考** → 查看 TypeScript 源码中的类型定义和注释
4. **示例代码** → 查看 `ts/` 目录下的示例文件

## 📄 文档标准

本项目文档遵循以下标准：

- **清晰性**: 文档结构清晰，易于导航
- **完整性**: 涵盖主要功能和使用场景
- **实用性**: 提供具体的代码示例和最佳实践
- **维护性**: 与代码同步更新，保持准确性

## 🤝 文档贡献

欢迎贡献文档改进：

1. 保持文档与其模块同步更新
2. 遵循现有的文档结构和格式
3. 提供清晰的代码示例
4. 更新相关的导航和索引

## 📞 获取帮助

如文档未能解决您的问题：

1. 查看具体模块的 `README.md` 文件
2. 检查 TypeScript 源码中的类型定义
3. 查看 `tests/` 目录中的测试用例了解使用方式