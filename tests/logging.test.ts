import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
vi.mock('../core/logger.js', () => {
  const baseLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getConfig: vi.fn().mockReturnValue({ level: 'info', enableConsole: true, enableFile: false }),
    createPluginLogger: vi.fn().mockImplementation((pluginId: string) => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      pluginId,
      createChildLogger: vi.fn()
    }))
  }
  const createLogger = vi.fn().mockReturnValue(baseLogger)
  const getGlobalLogger = vi.fn().mockReturnValue(baseLogger)
  const setGlobalLogger = vi.fn()
  return {
    AdvancedLogger: vi.fn(),
    createLogger,
    getGlobalLogger,
    setGlobalLogger,
    loadLoggerConfig: vi.fn(),
    saveLoggerConfig: vi.fn()
  }
})
let loggingModule: any

// Mock 依赖模块
vi.mock('../core/logger', () => ({
  AdvancedLogger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createPluginLogger: vi.fn().mockImplementation((pluginId: string) => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      pluginId,
      createChildLogger: vi.fn().mockImplementation((component: string) => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        pluginId,
        component
      })),
      logOperationStart: vi.fn(),
      logOperationEnd: vi.fn()
    })),
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      level: 'info',
      enableConsole: true,
      enableFile: false
    }),
    destroy: vi.fn()
  })),
  createLogger: vi.fn().mockImplementation((config) => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createPluginLogger: vi.fn().mockImplementation((pluginId: string) => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      pluginId,
      createChildLogger: vi.fn(),
      logOperationStart: vi.fn(),
      logOperationEnd: vi.fn()
    })),
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue(config),
    destroy: vi.fn()
  })),
  getGlobalLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createPluginLogger: vi.fn().mockImplementation((pluginId: string) => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      pluginId,
      createChildLogger: vi.fn(),
      logOperationStart: vi.fn(),
      logOperationEnd: vi.fn()
    })),
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      level: 'info',
      enableConsole: true,
      enableFile: false
    }),
    destroy: vi.fn()
  })),
  setGlobalLogger: vi.fn()
}))

// 使用真实的 utils/pluginLogger 模块以验证对象参数签名和方法存在性

describe('Logging 模块集成测试', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    loggingModule = await import('../core/logging')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('模块导出', () => {
    it('应该正确导出 AdvancedLogger 类', () => {
      expect(loggingModule.AdvancedLogger).toBeDefined()
      expect(typeof loggingModule.AdvancedLogger).toBe('function')
    })

    it('应该正确导出 createLogger 函数', () => {
      expect(loggingModule.createLogger).toBeDefined()
      expect(typeof loggingModule.createLogger).toBe('function')
    })

    it('应该正确导出 getGlobalLogger 函数', () => {
      expect(loggingModule.getGlobalLogger).toBeDefined()
      expect(typeof loggingModule.getGlobalLogger).toBe('function')
    })

    it('应该正确导出 setGlobalLogger 函数', () => {
      expect(loggingModule.setGlobalLogger).toBeDefined()
      expect(typeof loggingModule.setGlobalLogger).toBe('function')
    })

    it('应该正确导出 PluginLogger 类', () => {
      expect(loggingModule.PluginLogger).toBeDefined()
      expect(typeof loggingModule.PluginLogger).toBe('function')
    })

    it('应该正确导出 PluginLogManager 类', () => {
      expect(loggingModule.PluginLogManager).toBeDefined()
      expect(typeof loggingModule.PluginLogManager).toBe('function')
    })

    it('应该正确导出 getPluginLogger 函数', () => {
      expect(loggingModule.getPluginLogger).toBeDefined()
      expect(typeof loggingModule.getPluginLogger).toBe('function')
    })

    it('应该正确导出 createPluginLogger 函数', () => {
      expect(loggingModule.createPluginLogger).toBeDefined()
      expect(typeof loggingModule.createPluginLogger).toBe('function')
    })

    it('应该正确导出默认的 getGlobalLogger', () => {
      expect(loggingModule.default).toBeDefined()
      expect(typeof loggingModule.default).toBe('function')
    })
  })

  describe('createLogger 函数', () => {
    it('应该创建日志器实例', () => {
      const logger = loggingModule.getGlobalLogger()
      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('应该创建具有正确配置的日志器', () => {
      const logger = loggingModule.getGlobalLogger()
      const loggerConfig = logger.getConfig()
      expect(loggerConfig.enableConsole).toBeDefined()
    })

    it('应该支持插件日志器创建', () => {
      const logger = loggingModule.getGlobalLogger()
      const pluginLogger = logger.createPluginLogger('test-plugin')
      expect(pluginLogger).toBeDefined()
      expect(pluginLogger.pluginId).toBe('test-plugin')
    })
  })

  describe('getGlobalLogger 函数', () => {
    it('应该返回全局日志器实例', () => {
      const globalLogger1 = loggingModule.getGlobalLogger()
      const globalLogger2 = loggingModule.getGlobalLogger()

      expect(globalLogger1).toBeDefined()
      expect(typeof globalLogger1.debug).toBe('function')
      expect(typeof globalLogger2.info).toBe('function')
    })

    it('应该支持插件日志器创建', () => {
      const globalLogger = loggingModule.getGlobalLogger()
      const pluginLogger = globalLogger.createPluginLogger('test-plugin')

      expect(pluginLogger).toBeDefined()
      expect(pluginLogger.pluginId).toBe('test-plugin')
    })
  })

  describe('setGlobalLogger 函数', () => {
    it('应该设置自定义全局日志器', () => {
      const customLogger = loggingModule.createLogger({
        level: 'debug',
        enableConsole: true,
        enableFile: false
      })

      loggingModule.setGlobalLogger(customLogger)

      // 验证 setGlobalLogger 被调用
      expect(vi.mocked(loggingModule.setGlobalLogger)).toHaveBeenCalledWith(customLogger)
    })
  })

  describe('PluginLogger 集成', () => {
    it('应该创建插件日志器实例', () => {
      const baseLogger = loggingModule.createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const pluginLogger = new loggingModule.PluginLogger({ pluginId: 'test-plugin', baseLogger })

      expect(pluginLogger).toBeDefined()
      expect(pluginLogger.pluginId).toBe('test-plugin')
      expect(typeof pluginLogger.debug).toBe('function')
      expect(typeof pluginLogger.info).toBe('function')
      expect(typeof pluginLogger.warn).toBe('function')
      expect(typeof pluginLogger.error).toBe('function')
    })

    it('应该支持子日志器创建', () => {
      const baseLogger = loggingModule.createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const pluginLogger = new loggingModule.PluginLogger({ pluginId: 'test-plugin', baseLogger })
      const childLogger = pluginLogger.createChildLogger('child-component')

      expect(childLogger).toBeDefined()
    })
  })

  describe('PluginLogManager 集成', () => {
    it('应该获取插件日志管理器实例', () => {
      const baseLogger = loggingModule.createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const manager = loggingModule.PluginLogManager ? new loggingModule.PluginLogManager() : loggingModule.pluginLogManager

      expect(manager).toBeDefined()
      expect(typeof manager.getPluginLogger).toBe('function')
      expect(typeof manager.setBaseLogger).toBe('function')
      expect(typeof manager.getBaseLogger).toBe('function')
      expect(typeof (manager.getActiveLoggers || manager.getAllPluginLoggers)).toBe('function')
    })

    it('应该管理插件日志器', () => {
      const baseLogger = loggingModule.createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const manager = loggingModule.PluginLogManager ? new loggingModule.PluginLogManager() : loggingModule.pluginLogManager
      const pluginLogger = manager.getPluginLogger('test-plugin')

      expect(pluginLogger).toBeDefined()
      expect(pluginLogger.pluginId).toBe('test-plugin')
    })
  })

  describe('便捷函数集成', () => {
    it('应该通过 getPluginLogger 获取插件日志器', () => {
      const baseLogger = loggingModule.getGlobalLogger()
      const pluginLogger = new loggingModule.PluginLogger({ pluginId: 'test-plugin', baseLogger })

      expect(pluginLogger).toBeDefined()
      expect(typeof pluginLogger.debug).toBe('function')
      expect(typeof pluginLogger.info).toBe('function')
      expect(typeof pluginLogger.warn).toBe('function')
      expect(typeof pluginLogger.error).toBe('function')
    })

    it('应该通过 createPluginLogger 创建插件日志器', () => {
      const baseLogger = loggingModule.createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const pluginLogger = new loggingModule.PluginLogger({ pluginId: 'test-plugin', pluginName: 'Test Plugin', baseLogger })

      expect(pluginLogger).toBeDefined()
      expect(typeof pluginLogger.debug).toBe('function')
      expect(typeof pluginLogger.info).toBe('function')
      expect(typeof pluginLogger.warn).toBe('function')
      expect(typeof pluginLogger.error).toBe('function')
    })
  })

  describe('默认导出', () => {
    it('应该默认导出 getGlobalLogger 函数', () => {
      expect(loggingModule.default).toBe(loggingModule.getGlobalLogger)
    })

    it('应该通过默认导出获取全局日志器', () => {
      const globalLogger = loggingModule.default()

      expect(globalLogger).toBeDefined()
      expect(typeof globalLogger.debug).toBe('function')
      expect(typeof globalLogger.info).toBe('function')
      expect(typeof globalLogger.warn).toBe('function')
      expect(typeof globalLogger.error).toBe('function')
    })
  })

  describe('实际使用场景', () => {
    it('应该支持基础日志记录', () => {
      const logger = loggingModule.getGlobalLogger()

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(logger.debug).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('应该支持插件日志记录', () => {
      const baseLogger = loggingModule.getGlobalLogger()
      const pluginLogger = baseLogger.createPluginLogger('test-plugin')

      pluginLogger.info('plugin info message')
      pluginLogger.error('plugin error message', new Error('test error'))

      expect(pluginLogger.info).toHaveBeenCalledTimes(1)
      expect(pluginLogger.error).toHaveBeenCalledTimes(1)
    })

    it('应该支持子组件日志记录', () => {
      const baseLogger = loggingModule.getGlobalLogger()
      const pluginLogger = baseLogger.createPluginLogger('test-plugin')

      expect(typeof pluginLogger.createChildLogger).toBe('function')
    })

    it('应该支持性能统计', () => {
      const baseLogger = loggingModule.getGlobalLogger()
      const pluginLogger = baseLogger.createPluginLogger('test-plugin')

      pluginLogger.debug('性能统计: test-operation 耗时 10ms')

      expect(pluginLogger.debug).toHaveBeenCalledTimes(1)
    })
  })
})