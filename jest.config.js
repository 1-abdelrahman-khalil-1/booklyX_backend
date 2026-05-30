export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.jsx?$": ["babel-jest"],
  },
  moduleDirectories: ["node_modules", "src"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  testPathIgnorePatterns: ["/node_modules/", "/.history/"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/generated/**",
  ],
  coverageDirectory: "coverage",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testRunner: "jest-circus/runner",
};
