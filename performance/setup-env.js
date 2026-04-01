// Performance testing environment setup
// Similar to playwright.global-setup.ts, this sets NODE_ENV before k6 tests run

export async function setupPerformanceEnv() {
  process.env.NODE_ENV = 'development';
  console.log(`✓ NODE_ENV set to: ${process.env.NODE_ENV}`);
}

export async function teardownPerformanceEnv() {
  // Optional: cleanup after tests
  console.log('✓ Performance tests completed');
}
