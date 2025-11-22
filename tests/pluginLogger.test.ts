import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
let PluginLogger: any
let PluginLogManager: any
let getPluginLogger: any
let createPluginLogger: any
let AdvancedLogger: any
let createLogger: any
let getGlobalLogger: any

// Mock AdvancedLogger
vi.mock('../core/logger', () => {
  const createPluginLoggerMock = vi.fn().mockImplementation((pluginId: string) => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    pluginId
  }))
  
  const mockAdvancedLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createPluginLogger: createPluginLoggerMock,
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      level: 'info',
      enableConsole: true,
      enableFile: false
    }),
    destroy: vi.fn()
  }
  
  return {
    AdvancedLogger: vi.fn().mockImplementation(() => mockAdvancedLogger),
    createLogger: vi.fn().mockImplementation((config) => mockAdvancedLogger),
    getGlobalLogger: vi.fn(() => mockAdvancedLogger),
    setGlobalLogger: vi.fn()
  }
})

describe('PluginLogger', () => {
  let pluginLogger: any
  let mockCreateLogger: any
  const getBase = () => {
    const c = (createLogger as any).mock?.results?.[0]?.value
    const g = (getGlobalLogger as any)?.mock?.results?.[0]?.value
    return c || g
  }
  const getPlugin = () => {
    const base: any = getBase()
    return base?.createPluginLogger?.mock?.results?.[0]?.value
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const utilsMod = await import('../utils/pluginLogger')
    const coreMod = await import('../core/logger')
    PluginLogger = utilsMod.PluginLogger
    PluginLogManager = utilsMod.PluginLogManager
    getPluginLogger = utilsMod.getPluginLogger
    createPluginLogger = utilsMod.createPluginLogger
    AdvancedLogger = coreMod.AdvancedLogger
    createLogger = coreMod.createLogger
    getGlobalLogger = coreMod.getGlobalLogger
    pluginLogger = new PluginLogger({ pluginId: 'test-plugin' })
    mockCreateLogger = createLogger as any
  })

  describe('基础功能', () => {
    it('应该创建插件日志器实例', () => {
      expect(pluginLogger).toBeDefined()
      expect(pluginLogger.pluginId).toBe('test-plugin')
      expect(typeof pluginLogger.debug).toBe('function')
      expect(typeof pluginLogger.info).toBe('function')
      expect(typeof pluginLogger.warn).toBe('function')
      expect(typeof pluginLogger.error).toBe('function')
      
      // 验证基础方法存在
    })

    it('应该正确调用基础日志器的 createPluginLogger 方法', () => {
      const base: any = getBase()
      expect(base?.createPluginLogger).toBeDefined()
      expect(base.createPluginLogger).toHaveBeenCalledWith('test-plugin')
    })

    it('应该支持不同日志级别的方法调用', () => {
      // 调用各种日志方法
      pluginLogger.debug('debug message')
      pluginLogger.info('info message')
      pluginLogger.warn('warn message')
      pluginLogger.error('error message')
      
      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.debug).toHaveBeenCalledWith('debug message')
        expect(plugin.info).toHaveBeenCalledWith('info message')
        expect(plugin.warn).toHaveBeenCalledWith('warn message')
        expect(plugin.error).toHaveBeenCalledWith('error message')
      } else {
        const base: any = getBase()
        expect(base.debug).toHaveBeenCalledWith('[test-plugin]', 'debug message')
        expect(base.info).toHaveBeenCalledWith('[test-plugin]', 'info message')
        expect(base.warn).toHaveBeenCalledWith('[test-plugin]', 'warn message')
        expect(base.error).toHaveBeenCalledWith('[test-plugin]', 'error message')
      }
    })

    it('应该支持结构化日志数据', () => {
      const data = { key: 'value', number: 42 }
      pluginLogger.info('structured message', data)

      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.info).toHaveBeenCalledWith('structured message', data)
      } else {
        const base: any = getBase()
        expect(base.info).toHaveBeenCalledWith('[test-plugin]', 'structured message', data)
      }
    })

    it('应该正确处理错误对象', () => {
      const error = new Error('test error')
      pluginLogger.error('error occurred', error)

      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.error).toHaveBeenCalledWith('error occurred', error)
      } else {
        const base: any = getBase()
        expect(base.error).toHaveBeenCalledWith('[test-plugin]', 'error occurred', error)
      }
    })
  })

  describe('操作记录', () => {
    it('应该记录操作开始', () => {
      pluginLogger.startOperation('operation-name')

      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.info).toHaveBeenCalledWith(
          expect.stringContaining('开始执行操作'),
          expect.any(Object)
        )
      } else {
        const base: any = getBase()
        const calls = (base.info as any).mock?.calls || []
        const matched = calls.some((args: any[]) => String(args[0]) === '[test-plugin]' && /开始执行操作/.test(String(args[1])))
        expect(matched).toBe(true)
      }
    })

    it('应该记录操作成功完成', () => {
      pluginLogger.completeOperation('operation-name', { result: 'success' })

      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.info).toHaveBeenCalledWith(
          expect.stringContaining('操作完成'),
          expect.objectContaining({ result: 'success' })
        )
      } else {
        const base: any = getBase()
        expect(base.info).toHaveBeenCalledWith(
          '[test-plugin]',
          expect.stringContaining('操作完成'),
          expect.objectContaining({ result: 'success' })
        )
      }
    })

    it('应该记录操作失败', () => {
      const error = new Error('test error')
      pluginLogger.failOperation('operation-name', error, { context: 'test' })

      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.error).toHaveBeenCalledWith(
          expect.stringContaining('操作失败'),
          expect.objectContaining({ error, context: 'test' })
        )
      } else {
        const base: any = getBase()
        expect(base.error).toHaveBeenCalledWith(
          '[test-plugin]',
          expect.stringContaining('操作失败'),
          expect.objectContaining({ error, context: 'test' })
        )
      }
    })

    it('应该记录性能信息', () => {
      pluginLogger.performance('operation-name', 150, { details: 'test' })

      expect((createLogger as any).mock?.calls?.length).toBeGreaterThan(0)
      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.debug).toHaveBeenCalledWith(
          expect.stringContaining('性能统计'),
          expect.objectContaining({ details: 'test' })
        )
      } else {
        const base: any = getBase()
        const calls = (base.debug as any).mock?.calls || []
        const matched = calls.some((args: any[]) => String(args[0]) === '[test-plugin]' && /性能统计/.test(String(args[1])))
        expect(matched).toBe(true)
      }
    })
  })

  describe('子日志器', () => {
    it('应该创建子日志器', () => {
      const childLogger = pluginLogger.createSubLogger('child-component')

      expect(childLogger).toBeDefined()
      expect(typeof childLogger.debug).toBe('function')
      expect(typeof childLogger.info).toBe('function')
      expect(typeof childLogger.warn).toBe('function')
      expect(typeof childLogger.error).toBe('function')
    })

    it('应该在子日志器日志中包含组件信息', () => {
      const childLogger = pluginLogger.createSubLogger('child-component')
      childLogger.info('child message')

      expect((createLogger as any).mock?.calls?.length).toBeGreaterThan(0)
      const plugin: any = getPlugin()
      if (plugin) {
        expect(plugin.info).toHaveBeenCalledWith('[child-component] child message')
      } else {
        const base: any = getBase()
        const calls = (base.info as any).mock?.calls || []
        const matched = calls.some((args: any[]) => String(args[0]) === '[test-plugin]' && String(args[1]) === '[child-component] child message')
        expect(matched).toBe(true)
      }
    })

    it('应该创建子插件日志器', () => {
      const childLogger = pluginLogger.createChildLogger('child-component')

      expect(childLogger).toBeDefined()
      expect(childLogger).toBeInstanceOf(PluginLogger)
    })
  })


})

describe('PluginLogManager', () => {
  let manager: PluginLogManager

  beforeEach(() => {
    vi.clearAllMocks()
    // 创建新的 PluginLogManager 实例
    manager = new PluginLogManager()
  })

  describe('插件日志器管理', () => {
    it('应该为插件创建日志器', () => {
      const pluginLogger = manager.getPluginLogger('test-plugin')

      expect(pluginLogger).toBeDefined()
      expect(pluginLogger).toBeInstanceOf(PluginLogger)
    })

    it('应该为相同插件返回相同的日志器实例', () => {
      const logger1 = manager.getPluginLogger('test-plugin')
      const logger2 = manager.getPluginLogger('test-plugin')

      expect(logger1).toBe(logger2)
    })

    it('应该为不同插件创建不同的日志器实例', () => {
      const logger1 = manager.getPluginLogger('plugin1')
      const logger2 = manager.getPluginLogger('plugin2')

      expect(logger1).not.toBe(logger2)
    })

    it('应该获取所有活跃的插件日志器', () => {
      manager.getPluginLogger('plugin1')
      manager.getPluginLogger('plugin2')
      manager.getPluginLogger('plugin3')

      const activeLoggers = manager.getActiveLoggers()

      expect(activeLoggers).toHaveLength(3)
      expect(activeLoggers).toContain('plugin1')
      expect(activeLoggers).toContain('plugin2')
      expect(activeLoggers).toContain('plugin3')
    })

    it('应该移除插件日志器', () => {
      const logger = manager.getPluginLogger('test-plugin')
      manager.removePluginLogger('test-plugin')

      const activeLoggers = manager.getActiveLoggers()
      expect(activeLoggers).not.toContain('test-plugin')
    })

    it('应该清理所有插件日志器', () => {
      manager.getPluginLogger('plugin1')
      manager.getPluginLogger('plugin2')
      manager.clear()

      const activeLoggers = manager.getActiveLoggers()
      expect(activeLoggers).toHaveLength(0)
    })
  })
})

describe('便捷函数', () => {
  it('应该通过 getPluginLogger 获取插件日志器', () => {
    const logger = getPluginLogger('test-plugin')

    expect(logger).toBeDefined()
    expect(logger.pluginId).toBe('test-plugin')
  })

  it('应该通过 createPluginLogger 创建插件日志器', () => {
    const logger = createPluginLogger({
      pluginId: 'test-plugin',
      pluginName: 'Test Plugin'
    })
    
    expect(logger).toBeDefined()
    expect(logger).toBeInstanceOf(PluginLogger)
  })
})
vi.mock('../core/logger', () => {
  const createPluginLoggerMock = vi.fn().mockImplementation((pluginId: string) => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    pluginId
  }))
  const mockAdvancedLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createPluginLogger: createPluginLoggerMock,
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({ level: 'info', enableConsole: true, enableFile: false }),
    destroy: vi.fn()
  }
  return {
    AdvancedLogger: vi.fn().mockImplementation(() => mockAdvancedLogger),
    createLogger: vi.fn().mockImplementation((config) => mockAdvancedLogger),
    getGlobalLogger: vi.fn(() => mockAdvancedLogger),
    setGlobalLogger: vi.fn()
  }
})