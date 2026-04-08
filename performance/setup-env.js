// Performance testing environment setup
// 
// IMPORTANT: This file is for documentation purposes.
// 
// The server MUST be started separately with USE_TEST_DB=true before running k6 tests:
//   USE_TEST_DB=true node server.js
// 
// When USE_TEST_DB=true is set:
// - config/db.js will use MONGO_TEST_URL instead of MONGO_URL
// - Test routes (/api/v1/test/*) will be registered
// - k6 setup() can safely call seedDatabase() and getAdminToken()
// 
// k6 has NO access to Node.js runtime, so environment setup happens at server startup time,
// not during test execution.

export async function setupPerformanceEnv() {
  // This is documented for reference but cannot be called from k6 scripts.
  // Environment switching happens in config/db.js based on USE_TEST_DB env variable.
  process.env.NODE_ENV = 'test';
  console.log(`✓ NODE_ENV set to: ${process.env.NODE_ENV}`);
}

export async function teardownPerformanceEnv() {
  // Cleanup after tests (called separately, not from k6)
  console.log('✓ Performance tests completed');
}
