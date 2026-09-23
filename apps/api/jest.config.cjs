module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/lambda.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: { global: { statements: 85, branches: 85, functions: 85, lines: 85 } },
  clearMocks: true
};
