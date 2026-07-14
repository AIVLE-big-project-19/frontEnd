import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// Mock localStorage and sessionStorage if needed
const createStorageMock = () => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

// Ensure proper storage mock
if (!global.localStorage || typeof global.localStorage.removeItem !== 'function') {
  global.localStorage = createStorageMock();
}

if (!global.sessionStorage || typeof global.sessionStorage.removeItem !== 'function') {
  global.sessionStorage = createStorageMock();
}

// Clear storage before each test
beforeEach(() => {
  if (global.localStorage && typeof global.localStorage.clear === 'function') {
    global.localStorage.clear();
  }
  if (global.sessionStorage && typeof global.sessionStorage.clear === 'function') {
    global.sessionStorage.clear();
  }
});
