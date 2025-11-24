# Chat Injector Enhanced 插件

这是一个增强版的智能文本注入插件，专为DeepSeek等AI聊天平台设计，具备回答完成检测功能。

## 功能特点

### 核心功能
- **智能文本注入**：自动识别网页中的输入框（textarea、contenteditable元素等）
- **自动发送**：注入文本后自动触发发送操作
- **多平台支持**：支持DeepSeek、ChatGPT等AI聊天平台

### 增强功能（新）
- **回答完成检测**：智能检测AI回答是否完成，特别针对打字机效果
- **轮询监测**：实时监测回答状态变化
- **多重检测策略**：
  - 内容变化检测
  - 打字动画检测
  - 完成标识检测（如复制按钮）
  - 内容稳定性判断
- **超时保护**：防止无限等待，可配置超时时间

## 检测原理

插件使用多种策略检测回答完成状态：

1. **DOM元素检测**：寻找可能的回答容器元素
2. **打字状态检测**：检测是否有打字动画指示器
3. **内容稳定性**：内容在一定时间内无变化则认为稳定
4. **完成标识检测**：查找复制按钮等完成标识
5. **智能判断**：综合多种因素判断回答是否完成

## 配置参数

在代码顶部可以修改以下参数：

```typescript
const POLLING_INTERVAL = 1000        // 检测间隔（毫秒）
const ANSWER_COMPLETE_TIMEOUT = 30000  // 超时时间（毫秒）
const CONTENT_STABLE_THRESHOLD = 2000    // 内容稳定阈值（毫秒）
```

## 使用方法

### 基本使用
```typescript
import chatInjectorEnhanced from './plugins/chat/chatInjectorEnhanced'

// 在插件管理器中注册
pluginManager.register(chatInjectorEnhanced)
```

### 自定义问题文本
修改插件中的 `TEXT` 常量：
```typescript
const TEXT = '你的问题文本'
```

## 返回结果

插件返回详细的结果信息：

```typescript
{
  success: boolean,           // 整体执行是否成功
  message: string,            // 执行结果描述
  data: {
    selector: string,         // 使用的输入框选择器
    injectedText: string,     // 注入的文本
    executionMethod: string,  // 执行方法（cdp/webdriver）
    answerDetection: {       // 回答检测结果
      complete: boolean,      // 是否检测到回答完成
      finalContent: string,     // 最终回答内容（前200字符）
      reason: string,         // 完成原因
      duration: number        // 检测耗时（毫秒）
    }
  }
}
```

## 检测状态说明

回答检测可能返回以下状态：

- `typing_in_progress`: 打字机效果正在进行
- `empty_content`: 回答内容为空
- `has_completion_indicator`: 发现完成标识（如复制按钮）
- `content_stable`: 内容已稳定
- `content_stable_timeout`: 内容稳定超时
- `timeout`: 整体检测超时

## 日志输出

插件提供详细的日志输出，包括：
- 文本注入过程和结果
- 回答检测的每次检查详情
- 内容变化情况
- 最终检测结果和耗时

## 错误处理

插件具备完善的错误处理机制：
- 网络连接错误处理
- CDP通信错误处理
- 页面元素查找失败处理
- 超时和异常情况处理

## 性能优化

- 使用CDP协议直接操作页面，性能高效
- 智能选择器匹配，快速定位元素
- 合理的检测间隔，平衡准确性和性能
- 内存使用优化，及时清理资源