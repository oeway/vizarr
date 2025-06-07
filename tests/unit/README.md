# Vizarr Unit Tests 🧪

This directory contains **Jest-based unit tests** for the vizarr application's core API functionality.

## 🎯 **Purpose**

These unit tests focus on testing the **business logic and API functions** without requiring a full browser environment. They complement the Playwright integration tests by providing:

- **Fast feedback** - Unit tests run in milliseconds vs seconds for integration tests
- **Isolated testing** - Test individual functions and components in isolation  
- **API validation** - Verify ImJoy API contracts and state management
- **Edge case coverage** - Test error conditions and boundary cases easily

## 📁 **Test Files**

### **`imjoy-api.test.ts`** ✅
Tests the core ImJoy API functionality:
- `add_image()` - Adding images with various configurations
- `set_view_state()` - Updating viewer zoom and position
- `show_loading()` - Managing loading states
- ImJoy RPC setup and function export

### **`state.test.ts`** ✅  
Tests the Jotai state management:
- Default atom values (sourceInfoAtom, viewStateAtom, loadingAtom)
- Type definitions for ImageLayerConfig and SourceData
- State validation and structure

### **`url-parsing.test.ts`** ✅
Tests URL parameter parsing functionality:
- URLSearchParams parsing for image configuration
- URL encoding/decoding for zarr sources
- Type conversion (strings to numbers, booleans, JSON)
- History management and URL updates

## 🚀 **Running Tests**

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode (during development)
npm run test:unit:watch  

# Run unit tests with coverage report
npm run test:unit:coverage

# Run both unit and integration tests
npm run test:all
```

## 🛠 **Test Configuration**

### **Jest Configuration** (`jest.config.js`)
- **Test Environment**: jsdom (simulates browser environment)
- **TypeScript Support**: ts-jest preset
- **React Testing**: @testing-library/react integration
- **Mock Setup**: Automatic mocking of CSS, canvas, and external dependencies

### **Test Setup** (`src/test-setup.ts`)
- **DOM Polyfills**: ResizeObserver, matchMedia, Canvas API
- **Console Mocking**: Clean test output by filtering expected warnings
- **Global Mocks**: Window location, WebGL context

## 🎯 **Testing Strategy**

### **What Unit Tests Cover**
✅ **API Function Logic** - ImJoy API methods and their behavior  
✅ **State Management** - Jotai atoms and state transitions  
✅ **Utility Functions** - URL parsing, type conversion, validation  
✅ **Error Handling** - Graceful failure modes and edge cases  
✅ **Type Safety** - TypeScript interfaces and configurations  

### **What Integration Tests Cover** (Playwright)
✅ **End-to-End Workflows** - Full zarr loading from URL to canvas  
✅ **Browser Compatibility** - Cross-browser rendering verification  
✅ **Network Interactions** - Real zarr file loading and error handling  
✅ **UI Behavior** - Canvas rendering, loading states, visual feedback  

## 🧪 **Test Examples**

### **Testing ImJoy API**
```typescript
test('should add image successfully with valid config', async () => {
  const testConfig: ImageLayerConfig = {
    source: 'https://test.zarr',
    name: 'test-image',
  };

  await mockAddImage(testConfig);
  
  expect(mockCreateSourceData).toHaveBeenCalledWith(testConfig);
});
```

### **Testing State Management** 
```typescript
test('viewStateAtom should have correct default view state', () => {
  expect(viewStateAtom.init).toEqual({
    zoom: 0,
    target: [0, 0, 0], 
    default: true,
  });
});
```

### **Testing URL Parsing**
```typescript
test('should parse encoded source parameter', () => {
  const originalUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
  const config = parseUrlParams(`?source=${encodeURIComponent(originalUrl)}`);
  
  expect(config.source).toBe(originalUrl);
});
```

## 🔧 **Mocking Strategy**

### **External Dependencies**
- **ImJoy RPC**: Mocked to test API export functionality
- **Zarr IO**: Mocked `createSourceData` for predictable test data
- **Canvas/WebGL**: Mocked for headless testing environment

### **Browser APIs**
- **Window.location**: Controlled for URL parsing tests
- **URLSearchParams**: Real implementation for authentic parsing behavior
- **History API**: Mocked for URL update testing

## 📊 **Coverage Goals**

| Component | Target Coverage | Status |
|-----------|----------------|--------|
| **ImJoy API** | 90%+ | ✅ Complete |
| **State Management** | 95%+ | ✅ Complete | 
| **URL Parsing** | 85%+ | ✅ Complete |
| **Type Definitions** | 100% | ✅ Complete |

## 🔄 **Continuous Integration**

Unit tests are designed to run in CI environments:
- **Fast Execution** - Complete test suite runs in ~5 seconds
- **Zero Dependencies** - No external services or files required
- **Deterministic** - Consistent results across different environments
- **Coverage Reporting** - Automatic coverage reports for code quality

## 🛡 **Error Handling Tests**

Unit tests specifically verify error scenarios:
- **Invalid zarr URLs** - Network failures and malformed sources
- **Type conversion errors** - Invalid parameter formats
- **State update failures** - Atom update error conditions
- **API misuse** - Incorrect parameter types and missing values

---

## 🎉 **Success Metrics**

**Unit tests provide fast, reliable feedback on core functionality while integration tests verify the complete user experience. Together, they ensure vizarr's API remains stable and performant as new annotation features are developed.** 