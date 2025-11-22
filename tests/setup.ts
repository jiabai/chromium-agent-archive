import { vi } from 'vitest'
import { promises as fs } from 'fs'

// 全局测试配置
global.console = {
  ...console,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
}

// Mock fs 模块的默认行为
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockRejectedValue(new Error('File not found')),
    readdir: vi.fn().mockResolvedValue([]),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue(new Error('File not found')),
    writeFile: vi.fn().mockResolvedValue(undefined)
  }
}))

// 清理测试环境
beforeEach(() => {
  vi.clearAllMocks()
})

// 测试完成后清理
afterEach(() => {
  vi.restoreAllMocks()
})