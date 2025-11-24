# 项目文档中心

欢迎来到 Chromium Agent 项目文档中心！这里包含了项目的所有核心文档和使用指南。

## 📚 文档结构

### 核心文档
- [📋 插件开发指南](plugin-development-guide.md) - 完整的插件开发教程和最佳实践
- [⚙️ 配置管理系统](config/README.md) - 配置系统的详细说明和使用方法
- [🔄 工作流控制](workflow-control.md) - 插件系统的执行顺序和失败处理机制
- [📊 日志系统指南](logging-guide.md) - 日志配置和使用说明
- [🧪 测试文档](testing-guide.md) - 测试策略和测试用例说明

### 快速导航
- **新用户**: 从 [插件开发指南](plugin-development-guide.md) 开始
- **开发者**: 查看 [配置管理系统](config/README.md) 和 [工作流控制](workflow-control.md)
- **维护者**: 参考 [日志系统指南](logging-guide.md) 和 [测试文档](testing-guide.md)

## 📖 模块文档

### 核心系统
- `core/` - 核心系统架构和插件管理
- `config/` - 配置管理系统
- `shared/` - 共享工具和服务

### 插件系统
- `plugins/` - 所有插件的实现和文档
  - `chat/` - 聊天相关插件
  - `exporters/` - 数据导出插件
  - `extractors/` - 数据提取插件
  - `maintenance/` - 系统维护插件
  - `diagnostics/` - 诊断和调试插件

### 工具和脚本
- `scripts/` - 实用脚本和工具
  - [插件信息显示工具](scripts/plugin-info-display.ts) - 显示插件详细信息的工具
- `tests/` - 测试用例和测试工具
- `examples/` - 使用示例和演示

## 🔍 文档查找指南

1. **按功能查找**: 根据你要实现的功能选择对应的文档
2. **按模块查找**: 根据代码模块查找相关文档
3. **按角色查找**: 根据你的角色（用户/开发者/维护者）选择合适的内容

## 📋 文档标准

所有文档都遵循以下标准：
- ✅ 包含完整的功能说明
- ✅ 提供代码示例和使用场景
- ✅ 说明配置选项和参数
- ✅ 包含错误处理和最佳实践
- ✅ 提供测试和验证方法

## 🤝 贡献指南

如果你发现文档有问题或想要改进：

1. 在 GitHub 上提交 Issue
2. 或者直接提交 Pull Request
3. 遵循项目的文档编写规范

## 🆘 获取帮助

如果在使用文档时遇到问题：
- 查看相关模块的代码注释
- 在 GitHub Issues 中搜索类似问题
- 创建新的 Issue 寻求帮助

---

**📍 当前位置**: `docs/index.md` | **[返回项目根目录](../README.md)**