import '@testing-library/jest-dom';

// Mock window globals that may not be available in Jest environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Canvas and WebGL for tests
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    canvas: {
      width: 1280,
      height: 720,
    },
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,'),
  width: 1280,
  height: 720,
};

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
});

// Mock URL for window.location tests
delete (window as any).location;
window.location = {
  href: 'http://localhost:3030',
  search: '',
  hash: '',
  pathname: '/',
} as any;

// Mock document.documentElement for React DOM
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {},
    scrollTop: 0,
    scrollLeft: 0,
    clientWidth: 1280,
    clientHeight: 720,
  },
  writable: true,
});

// Mock document.body for React DOM
Object.defineProperty(document, 'body', {
  value: {
    style: {},
    scrollTop: 0,
    scrollLeft: 0,
    clientWidth: 1280,
    clientHeight: 720,
  },
  writable: true,
});

// Mock console methods for cleaner test output
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Only show errors that are not expected test warnings
    if (
      !args[0]?.toString().includes('Warning') &&
      !args[0]?.toString().includes('act()')
    ) {
      originalError(...args);
    }
  });
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
}); 