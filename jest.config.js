export default {
  testEnvironment: "node",
  transform: {},
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
};
