import fs from 'fs'

const MCP_SERVER_CONFIG = {
  command: 'npx',
  args: ['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222'],
  env: { ...process.env, NODE_ENV: 'production' }
}

type McpInstance = { client: any; transport: any }

async function startMcp(): Promise<McpInstance> {
  const mod = (await import('@modelcontextprotocol/sdk/client/index.js')) as any
  const mod2 = (await import('@modelcontextprotocol/sdk/client/stdio.js')) as any
  const { Client } = mod
  const { StdioClientTransport } = mod2
  const transport = new StdioClientTransport(MCP_SERVER_CONFIG)
  const client = new Client({ name: 'chrome-mcp-elements-test-client', version: '1.0.0' }, { capabilities: {} })
  await client.connect(transport)
  return { client, transport }
}

async function stopMcp(mcpInstance: McpInstance): Promise<void> {
  if ((mcpInstance as any).client) { await (mcpInstance as any).client.close() }
  if ((mcpInstance as any).transport) { await (mcpInstance as any).transport.close() }
}

async function getPageElements(): Promise<void> {
  let mcpInstance: McpInstance | null = null
  try {
    mcpInstance = await startMcp()
    const { client } = mcpInstance
    try {
      const elementsResult = await client.callTool({
        name: 'evaluate_script',
        arguments: {
          function: `() => {
            const linkElements = Array.from(document.querySelectorAll('a'));
            return {
              totalLinks: linkElements.length,
              links: linkElements.map(el => ({
                text: el.innerText?.trim(),
                href: el.href,
                title: el.title || '',
                className: el.className,
                id: el.id,
                isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
                rect: {
                  top: el.getBoundingClientRect().top,
                  left: el.getBoundingClientRect().left,
                  width: el.getBoundingClientRect().width,
                  height: el.getBoundingClientRect().height
                }
              })).filter(link => link.text && link.text.length > 0)
            };
          }`
        }
      })
      if (elementsResult && elementsResult.content && elementsResult.content.length > 0) {
        const content: string = elementsResult.content[0].text
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[1])
            const outputPath = 'output/page-text-content.json'
            try { fs.mkdirSync('output', { recursive: true }) } catch {}
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8')
          }
        } catch {
          const outputPath = 'output/page-text-content-raw.json'
          try { fs.mkdirSync('output', { recursive: true }) } catch {}
          fs.writeFileSync(outputPath, content, 'utf8')
        }
      }
    } catch (error: any) {}
  } catch (error: any) {} finally {
    if (mcpInstance) {
      try { await stopMcp(mcpInstance) } catch {}
    }
  }
}

getPageElements().then(() => { process.exit(0) }).catch((error: any) => { console.error('测试执行出错:', error); process.exit(1) })