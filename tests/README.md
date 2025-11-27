# Logging Module Test Documentation

**📍 Document Location**: `tests/README.md` | **[Back to Documentation Center](../docs/index.md)**

## Test Structure

Test files are located in the `tests/` directory, containing the following test files:

### 1. `logger.test.ts` - Core Logger Tests
Tests the functionality of `core/logger.ts`:
- ✅ Basic functionality tests (instance creation, log level filtering, formatted output)
- ✅ Plugin logging tests (creating plugin loggers, including plugin ID)
- ✅ File logging tests (directory creation, log rotation)
- ✅ Global logger tests (singleton pattern, custom settings)
- ✅ Configuration management tests (updating config, file logging toggle)
- ✅ Timestamp format tests (ISO format, short format)

### 2. `pluginLogger.test.ts` - Plugin Logger Tests
Tests the functionality of `utils/pluginLogger.ts`:
- ✅ Basic functionality tests (instance creation, including plugin ID, different levels)
- ✅ Structured logging tests (support for data and error objects)
- ✅ Performance statistics tests (operation start/end, time consumption recording)
- ✅ Sub-logger tests (creating sub-loggers, multi-level nesting)
- ✅ Log level filtering tests
- ✅ PluginLogManager singleton pattern tests
- ✅ Plugin logger management tests (creation, caching, getting all)
- ✅ Base logger management tests (updating, recreating)
- ✅ Convenience function tests (getPluginLogger, createPluginLogger)

### 3. `logging.test.ts` - Integration Tests
Tests module integration of `core/logging.ts`:
- ✅ Module export tests (all classes and functions exported correctly)
- ✅ createLogger function tests (instance creation, configuration, plugin logger)
- ✅ getGlobalLogger function tests (singleton pattern, plugin support)
- ✅ setGlobalLogger function tests
- ✅ PluginLogger integration tests (instance creation, sub-loggers)
- ✅ PluginLogManager integration tests (instance retrieval, plugin management)
- ✅ Convenience function integration tests
- ✅ Default export tests
- ✅ Real-world usage scenario tests (basic logging, plugin logging, sub-components, performance statistics)

### 4. `setup.ts` - Test Environment Configuration
- Global test configuration and Mock setup
- Console method Mocking
- File system Mocking
- Test environment cleanup

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with File Watching
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

Tests cover the following modules:
- ✅ `core/logger.ts` - Core logging functionality
- ✅ `utils/pluginLogger.ts` - Plugin-specific logging functionality
- ✅ `core/logging.ts` - Unified logging interface

## Test Features

1. **Comprehensive Coverage**: Covers all major functions and edge cases
2. **Mock Isolation**: Uses Vitest Mock to isolate external dependencies
3. **Integration Testing**: Verifies correct integration between modules
4. **Real-world Scenarios**: Simulates real usage scenarios for testing
5. **Performance Testing**: Includes test cases related to performance statistics

## Continuous Integration

Test configuration supports running in CI/CD environments. Automated testing can be performed with:

```bash
npm test
```

Coverage reports will be generated in the `coverage/` directory, containing both HTML and JSON format reports.