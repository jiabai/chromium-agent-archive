import { ConfigService } from '../config';

type McpInstance = { client: any; transport: any }

export async function startMcp(command?: string, args?: string[]): Promise<McpInstance> {
  const configService = ConfigService.getInstance();
  const mcpConfig = configService.get('mcp');
  
  const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>
  const mod = await dynamicImport('@modelcontextprotocol/sdk/client/index.js') as any
  const mod2 = await dynamicImport('@modelcontextprotocol/sdk/client/stdio.js') as any
  const { Client } = mod
  const { StdioClientTransport } = mod2
  
  const transport = new StdioClientTransport({ 
    command: command || mcpConfig.command, 
    args: args || mcpConfig.args, 
    env: mcpConfig.env 
  })
  const client = new Client({ name: 'chrome-mcp-client', version: '1.0.0' }, { capabilities: {} })
  await client.connect(transport)
  return { client, transport }
}

export async function stopMcp(mcpInstance: { client?: any; transport?: any }): Promise<void> {
  try {
    if (mcpInstance?.client) {
      await mcpInstance.client.close()
    }
  } catch (e) {
    console.warn('MCP client close error:', e)
  }
  try {
    if (mcpInstance?.transport) {
      await mcpInstance.transport.close()
    }
  } catch (e) {
    console.warn('MCP transport close error:', e)
  }
}

export async function callToolWithTimeout(client: any, name: string, args: any, timeoutMs?: number): Promise<any> {
  const configService = ConfigService.getInstance();
  const snapshotConfig = configService.get('snapshot');
  const toMs = typeof timeoutMs === 'number' ? timeoutMs : (snapshotConfig?.toolCallTimeout || 30000);
  const toolPromise = client.callTool({ name, arguments: args });
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`MCP tool ${name} timeout (${toMs}ms)`)), toMs));
  return await Promise.race([toolPromise, timeoutPromise]);
}