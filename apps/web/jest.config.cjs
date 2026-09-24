module.exports = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.[tj]sx?$": "babel-jest" },
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.[tj]s?(x)"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/test/**",
    "!src/types.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "json", "json-summary", "lcov", "html"],
  coverageThreshold: {
    global: { branches: 81, functions: 81, lines: 81, statements: 81 },
  },
};
