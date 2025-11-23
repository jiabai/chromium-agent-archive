import { describe, it, expect } from 'vitest'
import { Plugin } from '../core/plugin'
import { PluginManager } from '../core/pluginManager'

function makePlugin(id: string, success: boolean, meta?: Partial<Plugin['meta']>): Plugin {
  return {
    meta: { id, name: id, version: '1.0.0', category: 'diagnostics', enabled: true, ...(meta||{}) },
    async init() {},
    async start() { return { success } },
    async stop() {},
    async dispose() {}
  }
}

describe('PluginManager workflow', () => {
  it('should follow success/failure rules', async () => {
    const pm = new PluginManager()
    pm.register(makePlugin('A', true))
    pm.register(makePlugin('B', false))
    pm.register(makePlugin('C', true))
    const res = await pm.startWorkflow({
      starts: ['A'],
      rules: [
        { pluginId: 'A', onSuccess: 'B' },
        { pluginId: 'B', onFailure: 'C' }
      ],
      skipDisabled: true
    })
    const ids = res.map(r => r.pluginId)
    const succ = res.map(r => r.success)
    expect(ids).toEqual(['A','B','C'])
    expect(succ).toEqual([true,false,true])
  })

  it('should enforce dependsOn success', async () => {
    const pm = new PluginManager()
    pm.register(makePlugin('A', true))
    pm.register(makePlugin('B', false))
    pm.register(makePlugin('C', true, { dependsOn: ['B'] }))
    const res = await pm.startWorkflow({
      starts: ['A'],
      rules: [
        { pluginId: 'A', onSuccess: 'B' },
        { pluginId: 'B', onFailure: 'C' }
      ],
      skipDisabled: true
    })
    const ids = res.map(r => r.pluginId)
    const succ = res.map(r => r.success)
    expect(ids).toEqual(['A','B','C'])
    expect(succ).toEqual([true,false,false])
    const c = res.find(r => r.pluginId === 'C')
    expect(c?.message).toBe('Dependency not met')
  })
})