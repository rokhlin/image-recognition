// Jest setup for NestJS Photo Management System
import 'reflect-metadata';

// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Mock external dependencies before tests run
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('@nestjs/bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({})),
  Worker: jest.fn().mockImplementation(() => ({})),
}));

// Set default timeout for async tests
jest.setTimeout(10000);

// Suppress console errors during test execution to reduce noise
console.error = jest.fn();
