import "@testing-library/jest-dom/vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock sessionStorage
const sessionStore: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, value: string) => { sessionStore[key] = value; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
  get length() { return Object.keys(sessionStore).length; },
  key: (i: number) => Object.keys(sessionStore)[i] ?? null,
};
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// Mock crypto for admin auth
Object.defineProperty(window, "crypto", {
  value: {
    subtle: {
      digest: async (_algo: string, data: ArrayBuffer) => {
        // Simple mock hash for testing
        const arr = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < arr.length; i++) hash[i % 32] ^= arr[i];
        return hash.buffer;
      },
    },
    randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
  },
});

// Reset storage between tests
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});
