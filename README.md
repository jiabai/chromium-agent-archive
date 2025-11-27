# Project Overview

An intelligent agent system based on Chrome DevTools Protocol, supporting plugin architecture and multiple AI service integrations.

## 🚀 Project Introduction

This is a powerful browser automation agent system designed for handling complex web interactions and AI conversation scenarios. The system deeply integrates with browsers through Chrome DevTools Protocol (CDP), enabling intelligent conversation management, data extraction, and automated operations.

### 💡 Core Capabilities

- **🤖 Intelligent Conversation Processing**: Automatically identifies and handles conversation interfaces on web pages, supporting multiple chat platforms
- **📊 Intelligent Data Extraction**: Intelligently extracts key information such as conversation content, links, and history records from web pages
- **🔄 Automated Workflow**: Configurable workflow based on plugins, supporting failure retry and sequence control
- **🧠 AI Service Integration**: Seamlessly integrates multiple LLM services like OpenAI, SiliconFlow, etc.
- **📸 Page Snapshots**: Supports page state capture and diagnostics
- **🔧 Flexible Extension**: Plugin architecture supports custom function extensions

### 🎯 Typical Application Scenarios

- **Customer Service Conversation Analysis**: Automatically extracts and analyzes customer service conversation records
- **Content Monitoring**: Monitors content changes and updates on specific web pages
- **Data Collection**: Extracts structured data from complex web interfaces
- **Automated Testing**: Browser automation testing based on CDP
- **AI Conversation Integration**: Integrates web conversations with AI services

### 🔗 Technical Architecture

The system adopts a layered architecture design:
- **Core Layer**: Provides basic services such as plugin management, event bus, and configuration management
- **Plugin Layer**: Implements specific business functions, such as conversation extraction and data export
- **Service Layer**: Integrates external services like CDP, OpenAI, MCP, etc.
- **Utility Layer**: Provides support for logs, storage, utility functions, etc.

## 🎯 Project Features

- **🤖 Intelligent Conversation Management**: Automatically handles chat conversation processes, supporting multiple conversation platforms
- **🧠 Multi-AI Service Support**: Integrates multiple LLM services like OpenAI, SiliconFlow, etc., supporting intelligent conversation analysis
- **🔌 Plugin Extension**: Flexible function extension mechanism, supporting dynamic loading and management of plugins
- **⚙️ Configuration-Driven**: Centralized configuration management system, supporting multi-environment configuration
- **📋 Log Tracking**: Complete operation logs and debugging support, supporting multi-level log recording
- **🔄 Workflow Control**: Intelligent plugin execution sequence and failure handling mechanism, supporting failure retry
- **🌐 MCP Integration**: Supports Model Context Protocol, enabling standardized AI service integration
- **📊 Intelligent Data Extraction**: Automatically identifies and extracts structured data from web pages
- **🎯 Precise Element Positioning**: Precise DOM element operations and interactions based on CDP
- **🔒 Safe and Reliable**: Complete error handling and exception recovery mechanisms

## 📚 Documentation Navigation

### 🎯 Core Documentation
- **[📖 Documentation Center](docs/index.md)** - Complete documentation navigation and overview
- **[🔧 Configuration System](config/README.md)** - Configuration management system details
- **[📊 Logging System](docs/logging-guide.md)** - Logging system usage guide
- **[🧪 Test Documentation](tests/README.md)** - Test module description

### 🔧 System Requirements

#### Basic Environment
- **Node.js**: 18.0 or higher
- **npm/yarn**: Package manager
- **Chrome Browser**: Supports DevTools Protocol
- **Operating System**: Windows/macOS/Linux

#### Optional Dependencies
- **Chrome Remote Debugging Port**: For CDP connection
- **AI Service API Keys**: Services like OpenAI, SiliconFlow, etc.

### 🚀 Quick Start

#### Environment Preparation
- **Node.js**: 18.0 or higher
- **Package Manager**: npm or yarn
- **Chrome Browser**: Latest version (supports DevTools Protocol)
- **Git**: For cloning the project

#### Installation Steps

##### 1. Clone Project
```bash
git clone <repository-url>
cd chromium-agent-archive
```

##### 2. Install Dependencies
```bash
npm install
```

##### 3. Configure Environment Variables
```bash
# Create environment configuration file
cp .env.example .env
# Edit .env file, configure necessary API keys and parameters
```

##### 4. Start Chrome Remote Debugging (Optional)
If you need to use CDP functionality, ensure Chrome starts in remote debugging mode:
```bash
# Windows users can use the provided script
.\scripts\Start-Chrome-9222.ps1

# Or manually start Chrome
chrome.exe --remote-debugging-port=9222
```

#### Development Commands
1. **Development Mode** (Hot Reload)
   ```bash
   npm run dev
   ```

2. **Build Project**
   ```bash
   npm run build
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Test Coverage**
   ```bash
   npm run test:coverage
   ```

5. **Start Application**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
├── config/          # Configuration Management System
├── core/            # Core Modules (Logs, Plugins, Events)
├── docs/            # Project Documentation
├── plugins/         # Plugin Directory
│   ├── chat/        # Chat-related Plugins
│   ├── diagnostics/ # Diagnostic Tool Plugins
│   ├── exporters/   # Data Export Plugins
│   ├── extractors/  # Data Extraction Plugins
│   └── maintenance/ # Maintenance Tool Plugins
├── shared/          # Shared Modules (CDP, MCP, OpenAI)
├── tests/           # Test Files
├── ts/              # TypeScript Examples and Scripts
├── utils/           # Utility Modules
└── scripts/         # Script Files
```

## 🔧 Core Features

- ✅ **Plugin Architecture** - Supports dynamic loading and management of plugins
- ✅ **Unified Logging** - Complete logging system support
- ✅ **Configuration Management** - Centralized configuration system
- ✅ **CDP Integration** - Chrome DevTools Protocol encapsulation
- ✅ **MCP Integration** - Model Context Protocol support
- ✅ **AI Services** - Integration with AI services like OpenAI
- ✅ **Event System** - Inter-plugin communication mechanism
- ✅ **Workflow Control** - Plugin execution sequence and failure handling

## 💻 Usage Examples

### Basic Usage
```typescript
import { ConfigService } from './config/config.service'
import { ChromeCDP } from './shared/cdp'

// Get configuration
const configService = ConfigService.getInstance()
const config = configService.get()

// Connect to Chrome using CDP
const cdp = new ChromeCDP(config.chrome.devtoolsUrl)
await cdp.connect()
```

### Plugin Development
```typescript
import { Plugin, PluginContext, PluginMetadata } from './core/types'
import { ConfigService } from './config/config.service'

// Create custom plugin
export class MyPlugin implements Plugin {
  meta: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    enabled: true,
    order: 1
  }
  
  private config!: ConfigService
  
  async init(context: PluginContext): Promise<void> {
    this.config = ConfigService.getInstance()
    context.log.info('MyPlugin initialized')
  }
  
  async start(): Promise<void> {
    // Plugin logic
    console.log('Plugin started')
  }
  
  async stop(): Promise<void> {
    // Cleanup logic
  }
}
```

### Environment Configuration
The project uses `.env` file for configuration. Main configuration items include:

```bash
# Chrome DevTools Configuration
CHROME_DEVTOOLS_URL=http://localhost:9222

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Other LLM Service Configuration
SILICONFLOW_API_KEY=your-siliconflow-api-key-here
MODEL_NAME=Qwen/Qwen2.5-7B-Instruct

# Logging Configuration
LOG_LEVEL=info

# Output Configuration
OUTPUT_DIR=./output
```

For complete configuration items, please refer to the `.env.example` file.

## 📖 Learn More

Please visit **[Documentation Center](docs/index.md)** for complete documentation and usage guides.

## 🤝 Contributing Guidelines

Issues and Pull Requests are welcome to improve the project.

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📄 License

This project adopts the MIT License - please see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chrome DevTools Protocol team
- OpenAI for providing excellent APIs
- All contributors and supporters