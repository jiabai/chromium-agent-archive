# 日志模块测试文档

**📍 文档位置**: `tests/README.md` | **[返回文档中心](../docs/index.md)**

## 测试结构

测试文件位于 `tests/` 目录下，包含以下测试文件：

### 1. `logger.test.ts` - 核心日志器测试
测试 `core/logger.ts` 的功能：
- ✅ 基础功能测试（创建实例、日志级别过滤、格式化输出）
- ✅ 插件日志测试（创建插件日志器、包含插件ID）
- ✅ 文件日志测试（创建目录、日志轮转）
- ✅ 全局日志器测试（单例模式、自定义设置）
- ✅ 配置管理测试（更新配置、文件日志开关）
- ✅ 时间戳格式测试（ISO格式、短格式）

### 2. `pluginLogger.test.ts` - 插件日志器测试
测试 `utils/pluginLogger.ts` 的功能：
- ✅ 基础功能测试（创建实例、包含插件ID、不同级别）
- ✅ 结构化日志测试（支持数据和错误对象）
- ✅ 性能统计测试（操作开始/结束、耗时记录）
- ✅ 子日志器测试（创建子日志器、多级嵌套）
- ✅ 日志级别过滤测试
- ✅ PluginLogManager 单例模式测试
- ✅ 插件日志器管理测试（创建、缓存、获取所有）
- ✅ 基础日志器管理测试（更新、重新创建）
- ✅ 便捷函数测试（getPluginLogger、createPluginLogger）

### 3. `logging.test.ts` - 集成测试
测试 `core/logging.ts` 的模块集成：
- ✅ 模块导出测试（所有类和函数正确导出）
- ✅ createLogger 函数测试（创建实例、配置、插件日志器）
- ✅ getGlobalLogger 函数测试（单例模式、插件支持）
- ✅ setGlobalLogger 函数测试
- ✅ PluginLogger 集成测试（创建实例、子日志器）
- ✅ PluginLogManager 集成测试（实例获取、插件管理）
- ✅ 便捷函数集成测试
- ✅ 默认导出测试
- ✅ 实际使用场景测试（基础日志、插件日志、子组件、性能统计）

### 4. `setup.ts` - 测试环境配置
- 全局测试配置和 Mock 设置
- 控制台方法 Mock
- 文件系统 Mock
- 测试环境清理

## 运行测试

### 安装依赖
```bash
npm install
```

### 运行所有测试
```bash
npm test
```

### 运行测试并监听文件变化
```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告
```bash
npm run test:coverage
```

## 测试覆盖率

测试覆盖了以下模块：
- ✅ `core/logger.ts` - 核心日志功能
- ✅ `utils/pluginLogger.ts` - 插件专用日志功能
- ✅ `core/logging.ts` - 统一日志接口

## 测试特点

1. **全面覆盖**：涵盖所有主要功能和边界情况
2. **Mock 隔离**：使用 Vitest Mock 隔离外部依赖
3. **集成测试**：验证模块间的正确集成
4. **实际场景**：模拟真实使用场景进行测试
5. **性能测试**：包含性能统计相关的测试用例

## 持续集成

测试配置支持在 CI/CD 环境中运行，可以通过以下命令进行自动化测试：

```bash
npm test
```

覆盖率报告将生成在 `coverage/` 目录下，包含 HTML 和 JSON 格式的报告。