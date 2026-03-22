export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  coverageDirectory: "coverage/backend",
  coverageReporters: ["lcov", "text", "html"],
  collectCoverageFrom: [
    "models/**",
    "controllers/**",
    "helpers/**",
    "middlewares/**",
    "config/**",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },

  // mock env variables
  setupFiles: ["<rootDir>/setEnvVars.js"],
};
