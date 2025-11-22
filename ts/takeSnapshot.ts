import fs from 'fs'
import path from 'path'
import readline from 'readline'

const MCP_SERVER_CONFIG = { command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222'], env: { ...process.env, NODE_ENV: 'production' } }
const TIMEOUT_CONFIG = { MCP_CONNECTION_TIMEOUT: 30000, TOOL_CALL_TIMEOUT: 60000, CLEANUP_TIMEOUT: 5000 }
const RETRY_CONFIG = { MAX_RETRIES: 3, RETRY_DELAY: 2000, BACKOFF_MULTIPLIER: 2 }
const FILE_NAME_CONFIG = { MAX_BASE_NAME_LENGTH: 100, ALLOWED_FILENAME_CHARS: /[^a-zA-Z0-9-_]/g, ALLOWED_EXTENSION_CHARS: /[^a-zA-Z0-9]/g }

function getTextFromContentParts(parts: any[]): string {
  try {
    if (!Array.isArray(parts)) return ''
    const out: string[] = []
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      try {
        if (typeof (p as any)?.text === 'string') out.push((p as any).text)
        else if (typeof p === 'string') out.push(p as string)
        else if (p && typeof p === 'object') {
          if ((p as any).type === 'json' && (p as any).json) out.push(JSON.stringify((p as any).json))
          else out.push(JSON.stringify(p))
        }
      } catch {}
    }
    const result = out.join('\n')
    return result
  } catch { return '' }
}

function extractSnapshotData(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  const mJson = raw.match(/```json\r?\n([\s\S]*?)\r?\n```/i)
  if (mJson) {
    try { const parsed = JSON.parse(mJson[1]); return JSON.stringify(parsed, null, 2) } catch {}
  }
  const mText = raw.match(/```text\r?\n([\s\S]*?)\r?\n```/i)
  if (mText) return mText[1]
  if (raw.includes('base64,') || /^[A-Za-z0-9+/]*={0,2}$/.test(raw.replace(/\s/g, ''))) return raw
  return raw
}

function generateSafeFilename(toolName: string, extension: string, outputDir: string): string {
  const baseName = `snapshot-${toolName}`
  const safeBaseName = baseName.replace(FILE_NAME_CONFIG.ALLOWED_FILENAME_CHARS, '-')
  const safeExtension = extension.replace(FILE_NAME_CONFIG.ALLOWED_EXTENSION_CHARS, '')
  if (!safeExtension) throw new Error('Invalid file extension')
  const basePath = path.join(outputDir, `${safeBaseName}.${safeExtension}`)
  if (!fs.existsSync(basePath)) return basePath
  let counter = 1
  while (counter <= 999) {
    const numberedPath = path.join(outputDir, `${safeBaseName}-${counter}.${safeExtension}`)
    if (!fs.existsSync(numberedPath)) return numberedPath
    counter++
  }
  throw new Error('Too many existing files, cannot generate unique filename')
}

function validateOutputPath(outputPath: string): string {
  const resolvedPath = path.resolve(outputPath)
  const cwd = process.cwd()
  if (!resolvedPath.startsWith(cwd)) throw new Error(`Output path must be within project directory: ${cwd}`)
  if (outputPath.includes('..') || outputPath.includes('~')) throw new Error('Path traversal detected in output path')
  return resolvedPath
}

async function executeWithRetry<T>(operation: () => Promise<T>, operationName: string, maxRetries: number = RETRY_CONFIG.MAX_RETRIES): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { const result = await operation(); return result } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) { const delay = RETRY_CONFIG.RETRY_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1); await new Promise(res => setTimeout(res, delay)) }
    }
  }
  throw lastError
}

async function startMcpClient(): Promise<{ client: any; transport: any }> {
  const mod = (await import('@modelcontextprotocol/sdk/client/index.js')) as any
  const mod2 = (await import('@modelcontextprotocol/sdk/client/stdio.js')) as any
  const { Client } = mod
  const { StdioClientTransport } = mod2
  const transport = new StdioClientTransport(MCP_SERVER_CONFIG)
  const client = new Client({ name: 'chrome-mcp-snapshot-client', version: '1.0.0' }, { capabilities: {} })
  const connectPromise = client.connect(transport)
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('MCP connection timeout')), TIMEOUT_CONFIG.MCP_CONNECTION_TIMEOUT))
  await Promise.race([connectPromise, timeoutPromise])
  return { client, transport }
}

async function stopMcpClient(mcpInstance: { client?: any; transport?: any }): Promise<void> {
  if (mcpInstance?.client) { await mcpInstance.client.close() }
  if (mcpInstance?.transport) { await mcpInstance.transport.close() }
}

async function executeSnapshotTool(client: any, toolName: string, toolArgs: any): Promise<any> {
  const toolCallPromise = client.callTool({ name: toolName, arguments: toolArgs })
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Tool execution timeout after ${TIMEOUT_CONFIG.TOOL_CALL_TIMEOUT}ms`)), TIMEOUT_CONFIG.TOOL_CALL_TIMEOUT))
  const result = await Promise.race([toolCallPromise, timeoutPromise])
  return result
}

function showHelp(): void {
  console.log('用法: node takeSnapshot.ts [工具名] [选项]')
}

async function selectToolInteractively(availableTools: Set<string>): Promise<string | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const toolArray = Array.from(availableTools)
  const snapshotTools = toolArray.filter(name => ['take_screenshot', 'take_snapshot', 'evaluate_script'].includes(name))
  if (snapshotTools.length === 0) { rl.close(); return null }
  snapshotTools.forEach((tool, index) => { console.log(`${index + 1}. ${tool}`) })
  console.log('0. 取消')
  return new Promise(resolve => { rl.question('\n请选择工具 (输入数字): ', answer => { const choice = parseInt(answer, 10); rl.close(); if (choice === 0) resolve(null); else if (choice >= 1 && choice <= snapshotTools.length) resolve(snapshotTools[choice - 1]); else resolve(null) }) })
}

type ParsedArgs = { action: 'list' } | { action: 'use_tool'; preferredTool: string }

function parseCommandLineArguments(): ParsedArgs {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h') || args.includes('help')) { showHelp(); process.exit(0) }
  if (args.includes('--list') || args.includes('-l')) { return { action: 'list' } }
  const toolArg = args[0] || 'auto'
  return { action: 'use_tool', preferredTool: toolArg }
}

async function capturePageSnapshot(): Promise<void> {
  const args = parseCommandLineArguments()
  let mcp: { client: any; transport: any } | null = null
  try {
    mcp = await startMcpClient()
    const { client } = mcp
    let tools: any
    try { tools = await client.listTools() } catch (error: any) { throw error }
    const availableTools: Set<string> = new Set<string>((tools?.tools || []).map((t: any) => t?.name as string))
    if (args.action === 'list') { Array.from(availableTools).forEach(tool => console.log(tool)); return }
    let selectedTool: string | null = null
    let fileExtension = 'html'
    if ((args as any).preferredTool === 'interactive') {
      selectedTool = await selectToolInteractively(availableTools)
      if (!selectedTool) return
    } else if ((args as any).preferredTool === 'auto') {
      if (availableTools.has('take_screenshot')) { selectedTool = 'take_screenshot'; fileExtension = 'png' }
      else if (availableTools.has('take_snapshot')) { selectedTool = 'take_snapshot'; fileExtension = 'json' }
      else if (availableTools.has('evaluate_script')) { selectedTool = 'evaluate_script'; fileExtension = 'json' }
    } else {
      if (availableTools.has((args as any).preferredTool)) { selectedTool = (args as any).preferredTool; fileExtension = selectedTool === 'take_screenshot' ? 'png' : 'json' } else { process.exit(1) }
    }
    if (!selectedTool) return
    let snapshotResult: any = null
    if (selectedTool === 'take_screenshot') { snapshotResult = await executeSnapshotTool(client, 'take_screenshot', { format: 'png', fullPage: true }) }
    else if (selectedTool === 'take_snapshot') { snapshotResult = await executeSnapshotTool(client, 'take_snapshot', { verbose: true }) }
    else if (selectedTool === 'evaluate_script') { snapshotResult = await executeSnapshotTool(client, 'evaluate_script', { function: `() => { return { url: window.location.href, title: document.title, timestamp: new Date().toISOString(), html: document.documentElement.outerHTML, viewport: { width: window.innerWidth, height: window.innerHeight } } }` }) }
    if (snapshotResult) {
      const raw = getTextFromContentParts(snapshotResult?.content)
      const snapshotData = extractSnapshotData(raw)
      const outputDir = path.join(process.cwd(), 'output')
      const outPath = generateSafeFilename(selectedTool, fileExtension, outputDir)
      validateOutputPath(outPath)
      try { fs.mkdirSync(outputDir, { recursive: true }) } catch {}
      if (selectedTool === 'take_screenshot') {
        const base64Pattern = /base64,([A-Za-z0-9+/\n\r]*={0,2})/
        const base64Match = snapshotData.match(base64Pattern)
        if (base64Match) { const base64Data = base64Match[1].replace(/[\n\r]/g, ''); fs.writeFileSync(outPath, base64Data, 'base64') } else { fs.writeFileSync(outPath, snapshotData || raw, 'utf8') }
      } else { fs.writeFileSync(outPath, snapshotData || raw, 'utf8') }
    }
  } catch (error: any) { throw error } finally {
    if (mcp) { try { await stopMcpClient(mcp) } catch {} }
    setTimeout(() => { process.exit(0) }, 100)
  }
}

process.on('SIGINT', async () => { process.exit(0) })
process.on('SIGTERM', async () => { process.exit(0) })
process.on('uncaughtException', (error: any) => { console.error('Uncaught Exception:', error); process.exit(1) })
process.on('unhandledRejection', (reason: any, promise: any) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason); process.exit(1) })

capturePageSnapshot().catch((error: any) => { console.error('Failed to capture snapshot:', error); process.exit(1) })

export { getTextFromContentParts, extractSnapshotData, generateSafeFilename, validateOutputPath, startMcpClient, stopMcpClient, executeSnapshotTool, capturePageSnapshot }