// Global mocks that need to be available everywhere

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
    status: 200,
    statusText: 'OK',
  })
);

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: '{}',
}));

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
}));

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
}));

// Mock Blob
global.Blob = jest.fn((content, options) => ({
  size: content ? content.length : 0,
  type: options?.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(() => Promise.resolve('')),
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
}));

// Mock URL
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock crypto for random values
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
};

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock navigator
global.navigator = {
  userAgent: 'jest',
  platform: 'ios',
  permissions: {
    query: jest.fn(() => Promise.resolve({ state: 'granted' })),
  },
  geolocation: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve({})),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
  },
};

// Mock location
global.location = {
  href: 'http://localhost',
  origin: 'http://localhost',
  protocol: 'http:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window object properties that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Export for potential use in tests
module.exports = {
  localStorageMock,
};
