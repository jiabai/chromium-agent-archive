import { Logger } from '../core/types'
import { AdvancedLogger, getGlobalLogger, createLogger } from '../core/logger'

export interface PluginLoggerOptions {
  pluginId: string
  pluginName?: string
  enableColors?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  baseLogger?: AdvancedLogger
}

/**
 * 插件友好的日志包装器
 * 提供结构化的日志输出，包含插件信息
 */
export class PluginLogger implements Logger {
  private pluginLogger: Logger
  private pluginId: string
  private pluginName: string
  private baseLogger: AdvancedLogger

  constructor(options: PluginLoggerOptions) {
    this.pluginId = options.pluginId
    this.pluginName = options.pluginName || options.pluginId
    
    this.baseLogger = options.baseLogger
      ? options.baseLogger
      : createLogger({ enableColors: options.enableColors ?? true, level: options.logLevel || 'info' })

    if (!this.baseLogger) {
      this.baseLogger = getGlobalLogger()
    }

    const created = typeof (this.baseLogger as any)?.createPluginLogger === 'function'
      ? (this.baseLogger as any).createPluginLogger(this.pluginId) as Logger | undefined
      : undefined
    this.pluginLogger = created || {
      debug: (...args: unknown[]) => { this.baseLogger.debug(`[${this.pluginName}]`, ...args) },
      info:  (...args: unknown[]) => { this.baseLogger.info(`[${this.pluginName}]`, ...args) },
      warn:  (...args: unknown[]) => { this.baseLogger.warn(`[${this.pluginName}]`, ...args) },
      error: (...args: unknown[]) => { this.baseLogger.error(`[${this.pluginName}]`, ...args) }
    }
  }

  private ensureLogger(): void {
    if (!this.pluginLogger) {
      const base = this.baseLogger || getGlobalLogger()
      const created = base.createPluginLogger(this.pluginId) as Logger | undefined
      this.pluginLogger = created || {
        debug: (...args: unknown[]) => { base.debug(`[${this.pluginName}]`, ...args) },
        info:  (...args: unknown[]) => { base.info(`[${this.pluginName}]`, ...args) },
        warn:  (...args: unknown[]) => { base.warn(`[${this.pluginName}]`, ...args) },
        error: (...args: unknown[]) => { base.error(`[${this.pluginName}]`, ...args) }
      }
    }
  }

  /**
   * 记录操作开始
   */
  startOperation(operation: string, details?: Record<string, unknown>): void {
    this.info(`开始执行操作: ${operation}`, details)
  }

  /**
   * 记录操作成功完成
   */
  completeOperation(operation: string, details?: Record<string, unknown>): void {
    this.info(`操作完成: ${operation}`, details)
  }

  /**
   * 记录操作失败
   */
  failOperation(operation: string, error: unknown, details?: Record<string, unknown>): void {
    this.error(`操作失败: ${operation}`, { error, ...details })
  }

  /**
   * 记录性能信息
   */
  performance(operation: string, duration: number, details?: Record<string, unknown>): void {
    this.debug(`性能统计: ${operation} 耗时 ${duration}ms`, details)
  }

  // 直接委托给插件日志器
  debug(message: string, ...args: unknown[]): void {
    this.ensureLogger()
    this.pluginLogger.debug(message, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    this.ensureLogger()
    this.pluginLogger.info(message, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.ensureLogger()
    this.pluginLogger.warn(message, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    this.ensureLogger()
    this.pluginLogger.error(message, ...args)
  }

  /**
   * 创建子日志器
   * 用于创建带有额外上下文的日志器
   */
  createSubLogger(context: string): Logger {
    return {
      debug: (message: string, ...args: unknown[]) => {
        this.ensureLogger()
        this.pluginLogger.debug(`[${context}] ${message}`, ...args)
      },
      info: (message: string, ...args: unknown[]) => {
        this.ensureLogger()
        this.pluginLogger.info(`[${context}] ${message}`, ...args)
      },
      warn: (message: string, ...args: unknown[]) => {
        this.ensureLogger()
        this.pluginLogger.warn(`[${context}] ${message}`, ...args)
      },
      error: (message: string, ...args: unknown[]) => {
        this.ensureLogger()
        this.pluginLogger.error(`[${context}] ${message}`, ...args)
      }
    }
  }

  /**
   * 创建子插件日志器
   * 用于创建当前插件的子组件日志器
   */
  createChildLogger(childId: string): PluginLogger {
    const childPluginId = `${this.pluginId}.${childId}`
    const childPluginName = `${this.pluginName}.${childId}`
    
    // 创建新的插件日志器，复用底层配置
    return new PluginLogger({
      pluginId: childPluginId,
      pluginName: childPluginName,
      baseLogger: this.baseLogger
    })
  }
}

/**
 * 插件日志管理器
 * 负责管理所有插件的日志实例
 */
export class PluginLogManager {
  private loggers: Map<string, PluginLogger> = new Map()
  private defaultLogger: AdvancedLogger

  constructor() {
    this.defaultLogger = getGlobalLogger()
  }

  /**
   * 获取插件日志器
   */
  getPluginLogger(pluginId: string, pluginName?: string): PluginLogger {
    const existing = this.loggers.get(pluginId)
    if (existing) {
      return existing
    }

    const logger = new PluginLogger({
      pluginId,
      pluginName: pluginName || pluginId,
      enableColors: true,
      baseLogger: this.defaultLogger
    })

    this.loggers.set(pluginId, logger)
    return logger
  }

  setBaseLogger(logger: AdvancedLogger): void {
    this.defaultLogger = logger
  }

  getBaseLogger(): AdvancedLogger {
    return this.defaultLogger
  }

  /**
   * 移除插件日志器
   */
  removePluginLogger(pluginId: string): void {
    this.loggers.delete(pluginId)
  }

  /**
   * 获取所有活跃的插件日志器
   */
  getActiveLoggers(): string[] {
    return Array.from(this.loggers.keys())
  }

  /**
   * 清理所有插件日志器
   */
  clear(): void {
    this.loggers.clear()
  }
}

// 全局插件日志管理器实例
export const pluginLogManager = new PluginLogManager()

/**
 * 便捷函数：获取插件日志器
 */
export function getPluginLogger(pluginId: string, pluginName?: string): PluginLogger {
  return pluginLogManager.getPluginLogger(pluginId, pluginName)
}

/**
 * 便捷函数：创建插件日志器
 */
export function createPluginLogger(options: PluginLoggerOptions): PluginLogger {
  return new PluginLogger(options)
}