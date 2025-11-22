import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { AdvancedLogger, createLogger, getGlobalLogger, setGlobalLogger } from '../core/logger'

// Mock fs 模块
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    rename: vi.fn(),
    unlink: vi.fn(),
    appendFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}))

// Mock console 方法
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
}

global.console = { ...console, ...mockConsole }

describe('AdvancedLogger', () => {
  let logger: AdvancedLogger
  let mockFs: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = vi.mocked(fs)
    
    // 默认 mock 返回值
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.stat.mockRejectedValue(new Error('File not found'))
    mockFs.readdir.mockResolvedValue([])
  })

  afterEach(() => {
    if (logger) {
      logger.destroy()
    }
  })

  describe('基础功能', () => {
    it('应该创建日志器实例', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('应该根据日志级别过滤日志', () => {
      logger = createLogger({
        level: 'warn',
        enableConsole: true,
        enableFile: false
      })

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('warn message'))
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('error message'))
    })

    it('应该在控制台输出格式化的日志', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableColors: false,
        timestampFormat: 'iso'
      })

      logger.info('test message', { data: 'value' })

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO \] test message/)
      )
    })

    it('应该支持颜色输出', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableColors: true
      })

      logger.info('colored message')

      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('\x1b[32m'))
    })
  })

  describe('插件日志', () => {
    it('应该创建插件日志器', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      const pluginLogger = logger.createPluginLogger('test-plugin')

      expect(pluginLogger).toBeDefined()
      expect(typeof pluginLogger.debug).toBe('function')
      expect(typeof pluginLogger.info).toBe('function')
      expect(typeof pluginLogger.warn).toBe('function')
      expect(typeof pluginLogger.error).toBe('function')
    })

    it('应该在插件日志中包含插件ID', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableColors: false
      })

      const pluginLogger = logger.createPluginLogger('my-plugin')
      pluginLogger.info('plugin message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[my-plugin]')
      )
    })
  })

  describe('文件日志', () => {
    it('应该创建日志目录', async () => {
      logger = createLogger({
        level: 'info',
        enableConsole: false,
        enableFile: true,
        logDir: './test-logs'
      })

      // 等待初始化
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockFs.mkdir).toHaveBeenCalledWith('./test-logs', { recursive: true })
    })

    it('应该在文件轮转时创建带时间戳的文件名', async () => {
      const largeFileStats = { size: 11 * 1024 * 1024 } // 11MB
      mockFs.stat.mockResolvedValue(largeFileStats)

      logger = createLogger({
        level: 'info',
        enableConsole: false,
        enableFile: true,
        logDir: './test-logs',
        maxFileSize: 10 * 1024 * 1024
      })

      // 等待初始化并写入一些日志
      await new Promise(resolve => setTimeout(resolve, 100))
      logger.info('test message')
      await new Promise(resolve => setTimeout(resolve, 1100)) // 等待刷新

      expect(mockFs.rename).toHaveBeenCalled()
    })
  })

  describe('全局日志器', () => {
    it('应该获取全局日志器实例', () => {
      const globalLogger1 = getGlobalLogger()
      const globalLogger2 = getGlobalLogger()

      expect(globalLogger1).toBe(globalLogger2)
    })

    it('应该设置自定义全局日志器', () => {
      const customLogger = createLogger({ level: 'debug' })
      setGlobalLogger(customLogger)

      const globalLogger = getGlobalLogger()
      expect(globalLogger).toBe(customLogger)
    })
  })

  describe('配置管理', () => {
    it('应该更新配置', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false
      })

      logger.updateConfig({ level: 'debug' })
      const config = logger.getConfig()

      expect(config.level).toBe('debug')
    })

    it('应该在配置更新时正确处理文件日志开关', async () => {
      logger = createLogger({
        level: 'info',
        enableConsole: false,
        enableFile: false
      })

      // 启用文件日志
      logger.updateConfig({ enableFile: true, logDir: './test-logs' })
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockFs.mkdir).toHaveBeenCalled()
    })
  })

  describe('时间戳格式', () => {
    it('应该支持ISO格式时间戳', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableColors: false,
        timestampFormat: 'iso'
      })

      logger.info('test message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
      )
    })

    it('应该支持短时间戳格式', () => {
      logger = createLogger({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableColors: false,
        timestampFormat: 'short'
      })

      logger.info('test message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}\/\d{2}\/\d{2}[\s\w]+:\d{2}:\d{2}/)
      )
    })
  })
})