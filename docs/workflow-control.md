# 插件系统工作流控制

## 功能概述

插件系统现在支持**前一个任务失败就不再执行后续任务**的功能。这是通过使用 `PluginManager` 的 `startWorkflow` 方法实现的，替代了原来的 `startAll` 方法。

## 工作原理

### 之前的行为（startAll）
- 所有启用的插件都会被执行，无论前一个插件是否失败
- 没有条件化的执行控制

### 新的行为（工作流）
- 插件按配置的 `order` 顺序执行
- 前一个插件失败时，后续插件将不会被执行
- 提供了详细的执行日志和错误信息

## 配置说明

插件的执行顺序由配置文件中的 `order` 字段决定：

```json
{
  "plugins": {
    "newChatOpener": {
      "enabled": true,
      "order": 1
    },
    "chatInjector": {
      "enabled": true,
      "order": 2
    },
    "clearHistory": {
      "enabled": true,
      "order": 3
    }
  }
}
```

## 执行示例

### 成功场景
```
🚀 开始执行插件工作流，共 3 个插件
🟢 执行 newChatOpener - 成功
🟢 执行 chatInjector - 成功
🟢 执行 clearHistory - 成功
✅ 所有插件执行成功
```

### 失败场景
```
🚀 开始执行插件工作流，共 3 个插件
🟢 执行 newChatOpener - 成功
🔴 执行 chatInjector - 失败
🛑 检测到 1 个插件失败，后续插件已跳过执行
```

## 代码实现

主要修改在 `main.ts` 文件中：

1. **插件排序**：按 `order` 字段对启用的插件进行排序
2. **工作流规则构建**：为每个插件配置成功时的下一个执行插件
3. **失败停止**：失败时不设置 `onFailure`，自然停止执行
4. **结果检查**：提供详细的执行结果和错误信息

```typescript
// 构建工作流规则：前一个失败就停止执行
const rules: Array<{ pluginId: string; onSuccess?: string; onFailure?: string }> = []
for (let i = 0; i < enabledPlugins.length - 1; i++) {
  const currentPlugin = enabledPlugins[i]
  const nextPlugin = enabledPlugins[i + 1]
  
  // 成功时执行下一个插件，失败时停止（不设置onFailure）
  rules.push({
    pluginId: currentPlugin.meta.id,
    onSuccess: nextPlugin.meta.id
    // onFailure 不设置，失败时自然停止
  })
}
```

## 测试

运行测试验证功能：

```bash
# 运行工作流失败停止测试
npm test -- tests/workflow-fail-stop.test.ts

# 运行演示脚本
npx tsx examples/fail-stop-demo.ts
```

## 注意事项

1. **向后兼容**：此修改保持了与现有插件的完全兼容性
2. **性能影响**：工作流控制增加了少量开销，但提供了更好的错误处理
3. **调试友好**：详细的日志信息有助于快速定位问题
4. **灵活扩展**：可以轻松添加更复杂的工作流规则

## 扩展功能

基于当前的工作流框架，可以轻松扩展支持：

- **重试机制**：失败时自动重试
- **条件分支**：基于结果选择不同的执行路径
- **并行执行**：无依赖的插件并行执行
- **超时控制**：插件执行超时处理