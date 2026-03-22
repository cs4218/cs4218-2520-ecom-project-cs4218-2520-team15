export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "^@components/(.*)$": "<rootDir>/client/src/components/$1",
    "^@context/(.*)$": "<rootDir>/client/src/context/$1",
    "^@pages/(.*)$": "<rootDir>/client/src/pages/$1",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: ["<rootDir>/client/src/__tests__/**/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["client/src/**"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/client/src/_site/",
    "<rootDir>/client/src/App.js",
    "<rootDir>/client/src/index.js",
    "<rootDir>/client/src/setupTests.js",
    "<rootDir>/client/src/reportWebVitals.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
