export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  coverageDirectory: "coverage/server",
  collectCoverageFrom: [
    "models/**",
    "controllers/**",
    "helpers/**",
    "middlewares/**",
    "config/**",
    "!controllers/testController.js",
    "!controllers/volumeSeedController.js",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
    },
  },

  // mock env variables
  setupFiles: ["<rootDir>/setEnvVars.js"],
};
