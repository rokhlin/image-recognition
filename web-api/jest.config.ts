{
  "test": "jest",
  "clearMocks": true,
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/main.ts",
    "!src/app.module.ts"
  ],
  "coverageDirectory": "./coverage",
  "coverageReporters": ["text", "lcov", "html"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "preset": "ts-jest",
  "setupFilesAfterEnv": ["<rootDir>/src/setup-jest.ts"],
  "testEnvironment": "node",
  "testMatch": [
    "**/*.spec.ts",
    "**/__tests__/**/*.ts"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "globals": {
    "TS_JEST_TRANSFORM": true
  }
}
