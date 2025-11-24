import { Plugin } from '../core/plugin'
import { getPlugins, getAllPlugins } from '../config/plugin-registry'

/**
 * 插件信息展示工具
 * 
 * 功能：展示系统中所有插件的详细信息，包括描述、状态、配置等
 */
export class PluginInfoDisplay {
  private plugins: Plugin[]
  private allPlugins: Plugin[]

  constructor() {
    this.plugins = getPlugins()
    this.allPlugins = getAllPlugins()
  }

  /**
   * 显示所有插件的详细信息
   */
  async displayAllPlugins(): Promise<void> {
    console.log('\n' + '='.repeat(80))
    console.log('🔌 系统插件信息总览')
    console.log('='.repeat(80) + '\n')

    const plugins = this.plugins
    const categories = this.groupPluginsByCategory(plugins)

    for (const [category, categoryPlugins] of Object.entries(categories)) {
      console.log(`\n📁 ${this.getCategoryDisplayName(category)} (${categoryPlugins.length}个插件)`)
      console.log('-'.repeat(60))

      for (const plugin of categoryPlugins) {
        this.displayPluginInfo(plugin)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(`总计: ${plugins.length} 个插件`)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * 显示所有插件的完整信息（包括禁用的）
   */
  async displayAllPluginsComplete(): Promise<void> {
    console.log('\n' + '='.repeat(80))
    console.log('🔌 系统插件信息总览（包含所有插件）')
    console.log('='.repeat(80) + '\n')

    const allPlugins = this.allPlugins
    const categories = this.groupPluginsByCategory(allPlugins)

    for (const [category, categoryPlugins] of Object.entries(categories)) {
      console.log(`\n📁 ${this.getCategoryDisplayName(category)} (${categoryPlugins.length}个插件)`)
      console.log('-'.repeat(60))

      for (const plugin of categoryPlugins) {
        this.displayPluginInfo(plugin)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(`总计: ${allPlugins.length} 个插件`)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * 显示单个插件的详细信息
   */
  private displayPluginInfo(plugin: Plugin): void {
    const meta = plugin.meta
    const status = meta.enabled ? '✅ 启用' : '❌ 禁用'
    const hasDescription = meta.description ? '📝' : '⚠️'

    console.log(`\n${hasDescription} ${meta.name} (${meta.id})`)
    console.log(`   📊 状态: ${status}`)
    console.log(`   🔢 版本: ${meta.version}`)
    console.log(`   📋 分类: ${this.getCategoryDisplayName(meta.category)}`)
    
    if (meta.order !== undefined) {
      console.log(`   🔢 顺序: ${meta.order}`)
    }

    if (meta.description) {
      console.log(`   📝 描述: ${meta.description}`)
    } else {
      console.log(`   ⚠️  描述: 暂无描述信息`)
    }

    if (meta.dependsOn && meta.dependsOn.length > 0) {
      console.log(`   🔗 依赖: ${meta.dependsOn.join(', ')}`)
    }

    console.log('') // 空行分隔
  }

  /**
   * 按分类分组插件
   */
  private groupPluginsByCategory(plugins: Plugin[]): Record<string, Plugin[]> {
    const categories: Record<string, Plugin[]> = {}
    
    for (const plugin of plugins) {
      const category = plugin.meta.category || 'other'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(plugin)
    }

    return categories
  }

  /**
   * 获取分类的显示名称
   */
  private getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      'chat': '💬 聊天插件',
      'exporters': '📤 导出插件',
      'extractors': '🔍 提取插件',
      'maintenance': '🔧 维护插件',
      'diagnostics': '📊 诊断插件',
      'other': '📦 其他插件'
    }

    return categoryNames[category] || category
  }

  /**
   * 显示插件统计信息
   */
  async displayStatistics(): Promise<void> {
    const plugins = this.plugins
    const allPlugins = this.allPlugins
    const enabledCount = plugins.filter(p => p.meta.enabled === true).length
    const withDescriptionCount = allPlugins.filter(p => p.meta.description).length

    console.log('\n' + '='.repeat(60))
    console.log('📈 插件统计信息')
    console.log('='.repeat(60))
    console.log(`📊 插件总数: ${allPlugins.length}`)
    console.log(`✅ 启用插件: ${enabledCount}`)
    console.log(`❌ 禁用插件: ${allPlugins.length - enabledCount}`)
    console.log(`📝 有描述的插件: ${withDescriptionCount}`)
    console.log(`⚠️  缺少描述的插件: ${allPlugins.length - withDescriptionCount}`)

    const categories = this.groupPluginsByCategory(allPlugins)
    console.log('\n📁 分类统计:')
    for (const [category, categoryPlugins] of Object.entries(categories)) {
      const enabledInCategory = categoryPlugins.filter(p => p.meta.enabled === true).length
      console.log(`  ${this.getCategoryDisplayName(category)}: ${categoryPlugins.length}个 (启用: ${enabledInCategory})`)
    }

    console.log('='.repeat(60) + '\n')
  }

  /**
   * 检查缺少描述的插件
   */
  async checkMissingDescriptions(): Promise<void> {
    const allPlugins = this.allPlugins
    const missingDescription = allPlugins.filter(p => !p.meta.description)

    if (missingDescription.length === 0) {
      console.log('\n✅ 所有插件都有描述信息！\n')
      return
    }

    console.log('\n' + '='.repeat(60))
    console.log('⚠️  缺少描述的插件')
    console.log('='.repeat(60))

    for (const plugin of missingDescription) {
      console.log(`\n🔌 ${plugin.meta.name} (${plugin.meta.id})`)
      console.log(`   📁 分类: ${this.getCategoryDisplayName(plugin.meta.category)}`)
      console.log(`   💡 建议: 在 meta 中添加 description 字段`)
    }

    console.log(`\n总计: ${missingDescription.length} 个插件需要添加描述`)
    console.log('='.repeat(60) + '\n')
  }
}

/**
 * 使用示例
 */
async function main() {
  const display = new PluginInfoDisplay()
  
  // 显示所有插件信息（包含禁用的）
  await display.displayAllPluginsComplete()
  
  // 显示统计信息
  await display.displayStatistics()
  
  // 检查缺少描述的插件
  await display.checkMissingDescriptions()
}

if (require.main === module) {
  main().catch(console.error)
}

export { main }