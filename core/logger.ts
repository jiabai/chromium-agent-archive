import { Logger } from './types'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  logDir: string
  maxFileSize: number // bytes
  maxFiles: number
  enableColors: boolean
  timestampFormat: 'iso' | 'short' | 'custom'
  customTimestampFormat?: string
}

interface LogEntry {
  timestamp: Date
  level: LogLevel
  pluginId?: string
  message: string
  args: unknown[]
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
}

const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m'
}

export class AdvancedLogger implements Logger {
  private config: LoggerConfig
  private currentLogFile: string | null = null
  private logBuffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private currentDate: string | null = null

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: true,
      logDir: join(process.cwd(), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableColors: process.stdout.isTTY,
      timestampFormat: 'iso',
      ...config
    }

    if (this.config.enableFile) {
      this.initializeFileLogging()
    }
  }

  private async initializeFileLogging(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true })
      this.currentLogFile = await this.getCurrentLogFile()
      this.currentDate = new Date().toISOString().split('T')[0]
      this.startFlushInterval()
    } catch (error) {
      console.error('Failed to initialize file logging:', error)
      this.config.enableFile = false
    }
  }

  private async getCurrentLogFile(): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseName = `app-${timestamp}.log`
    const logFile = join(this.config.logDir, baseName)

    try {
      const stats = await fs.stat(logFile)
      if (stats.size > this.config.maxFileSize) {
        await this.rotateLogFile(logFile)
      }
    } catch {
      // File doesn't exist, which is fine
    }

    return logFile
  }

  private getLogFilePathForDate(dateStr: string): string {
    const baseName = `app-${dateStr}.log`
    return join(this.config.logDir, baseName)
  }

  private async rotateLogFile(currentFile: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const rotatedName = `${currentFile}.${timestamp}`
    
    try {
      await fs.rename(currentFile, rotatedName)
      await this.cleanupOldLogs()
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logDir)
      const logFiles = files
        .filter(f => f.startsWith('app-') && f.includes('.log'))
        .map(f => ({
          name: f,
          path: join(this.config.logDir, f)
        }))

      if (logFiles.length > this.config.maxFiles) {
        // Sort by modification time and remove oldest
        const stats = await Promise.all(
          logFiles.map(async f => ({
            ...f,
            mtime: (await fs.stat(f.path)).mtime
          }))
        )
        
        stats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
        
        const toRemove = stats.slice(0, stats.length - this.config.maxFiles)
        await Promise.all(toRemove.map(f => fs.unlink(f.path)))
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]
  }

  private formatTimestamp(date: Date): string {
    switch (this.config.timestampFormat) {
      case 'iso':
        return date.toISOString()
      case 'short':
        return date.toLocaleString()
      case 'custom':
        if (this.config.customTimestampFormat) {
          return this.formatCustomDate(date, this.config.customTimestampFormat)
        }
        return date.toISOString()
      default:
        return date.toISOString()
    }
  }

  private formatCustomDate(date: Date, format: string): string {
    const replacements: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
      'DD': date.getDate().toString().padStart(2, '0'),
      'HH': date.getHours().toString().padStart(2, '0'),
      'mm': date.getMinutes().toString().padStart(2, '0'),
      'ss': date.getSeconds().toString().padStart(2, '0'),
      'ms': date.getMilliseconds().toString().padStart(3, '0')
    }

    return format.replace(/YYYY|MM|DD|HH|mm|ss|ms/g, match => replacements[match])
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp)
    const level = entry.level.toUpperCase().padEnd(5)
    const pluginInfo = entry.pluginId ? `[${entry.pluginId}] ` : ''
    
    const baseMessage = `${timestamp} [${level}] ${pluginInfo}${entry.message}`
    
    if (entry.args.length > 0) {
      const argsStr = entry.args.map(arg => this.serializeArg(arg)).join(' ')
      return `${baseMessage} ${argsStr}`
    }
    
    return baseMessage
  }

  private serializeArg(arg: unknown): string {
    if (arg instanceof Error) {
      return JSON.stringify({ name: arg.name, message: arg.message, stack: arg.stack }, null, 2)
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const message = this.formatMessage(entry)
    
    if (this.config.enableColors) {
      const color = COLORS[entry.level]
      return `${color}${message}${COLORS.reset}`
    }
    
    return message
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    
    // If buffer gets too large, flush immediately
    if (this.logBuffer.length > 100) {
      this.flushBuffer()
    }
  }

  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    
    this.flushInterval = setInterval(() => {
      this.flushBuffer()
    }, 1000) // Flush every second
    if (typeof this.flushInterval.unref === 'function') {
      this.flushInterval.unref()
    }
  }

  private async flushBuffer(): Promise<void> {
    if (!this.config.enableFile || this.logBuffer.length === 0) {
      return
    }

    const entries = [...this.logBuffer]
    this.logBuffer = []

    try {
      const groups = new Map<string, LogEntry[]>()
      for (const e of entries) {
        const d = e.timestamp.toISOString().split('T')[0]
        const arr = groups.get(d) || []
        arr.push(e)
        groups.set(d, arr)
      }

      for (const [dateStr, groupEntries] of groups.entries()) {
        const content = groupEntries.map(entry => this.formatMessage(entry)).join('\n') + '\n'
        const targetFile = this.getLogFilePathForDate(dateStr)

        try {
          const stats = await fs.stat(targetFile)
          if (stats.size + Buffer.byteLength(content) > this.config.maxFileSize) {
            await this.rotateLogFile(targetFile)
          }
        } catch {
          // file not exist, will be created by append
        }

        await fs.appendFile(targetFile, content)

        if (this.currentDate !== dateStr) {
          this.currentDate = dateStr
          this.currentLogFile = targetFile
        }
      }
    } catch (error) {
      console.error('Failed to write to log file:', error)
      // Re-add entries to buffer for retry
      this.logBuffer.unshift(...entries)
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    this.logWithPlugin(level, undefined, message, ...args)
  }

  private logWithPlugin(level: LogLevel, pluginId: string | undefined, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      pluginId,
      message,
      args
    }

    // Console output
    if (this.config.enableConsole) {
      const consoleMessage = this.formatConsoleMessage(entry)
      // 安全地调用 console 方法
      switch (level) {
        case 'debug':
          console.debug(consoleMessage)
          break
        case 'info':
          console.info(consoleMessage)
          break
        case 'warn':
          console.warn(consoleMessage)
          break
        case 'error':
          console.error(consoleMessage)
          break
        default:
          console.log(consoleMessage)
      }
    }

    // File output
    if (this.config.enableFile) {
      this.addToBuffer(entry)
    }
  }

  // Logger interface implementation
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args)
  }

  // Plugin-specific logger
  createPluginLogger(pluginId: string): Logger {
    return {
      debug: (message: string, ...args: unknown[]) => {
        this.logWithPlugin('debug', pluginId, message, ...args)
      },
      info: (message: string, ...args: unknown[]) => {
        this.logWithPlugin('info', pluginId, message, ...args)
      },
      warn: (message: string, ...args: unknown[]) => {
        this.logWithPlugin('warn', pluginId, message, ...args)
      },
      error: (message: string, ...args: unknown[]) => {
        this.logWithPlugin('error', pluginId, message, ...args)
      }
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    const oldFileEnabled = this.config.enableFile
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.enableFile !== undefined) {
      if (newConfig.enableFile && !oldFileEnabled) {
        this.initializeFileLogging()
      } else if (!newConfig.enableFile && oldFileEnabled) {
        this.stopFlushInterval()
      }
    }
  }

  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // Cleanup
  async destroy(): Promise<void> {
    this.stopFlushInterval()
    await this.flushBuffer()
  }

  private stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }
}

// Global logger instance
let globalLogger: AdvancedLogger | null = null

export function createLogger(config?: Partial<LoggerConfig>): AdvancedLogger {
  return new AdvancedLogger(config)
}

export function getGlobalLogger(): AdvancedLogger {
  if (!globalLogger) {
    globalLogger = createLogger()
  }
  return globalLogger
}

export function setGlobalLogger(logger: AdvancedLogger): void {
  globalLogger = logger
}

// Configuration loading utilities
export async function loadLoggerConfig(configPath: string): Promise<Partial<LoggerConfig>> {
  try {
    const configData = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(configData)
  } catch (error) {
    console.warn('Failed to load logger config, using defaults:', error)
    return {}
  }
}

export async function saveLoggerConfig(configPath: string, config: Partial<LoggerConfig>): Promise<void> {
  try {
    await fs.mkdir(dirname(configPath), { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save logger config:', error)
  }
}