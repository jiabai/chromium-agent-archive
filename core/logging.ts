/**
 * 日志系统入口文件
 * 提供统一的日志管理接口
 */

export {
  AdvancedLogger,
  createLogger,
  getGlobalLogger,
  setGlobalLogger,
  loadLoggerConfig,
  saveLoggerConfig,
  type LogLevel,
  type LoggerConfig
} from './logger.js'

export {
  PluginLogger,
  PluginLogManager,
  pluginLogManager,
  getPluginLogger,
  createPluginLogger,
  type PluginLoggerOptions
} from '../utils/pluginLogger.js'

// 默认导出全局日志器
export { getGlobalLogger as default } from './logger.js'