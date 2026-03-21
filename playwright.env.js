/**
 * Setup environment variables for Playwright E2E tests
 * This file is sourced before running tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// MongoDB connection - use test database
// For local testing: mongodb://localhost:27017/ecom-test
// For CI/CD: Use environment variable MONGO_URL_TEST
process.env.MONGO_URL = process.env.MONGO_URL_TEST || process.env.MONGO_URL || 'mongodb://localhost:27017/ecom-test';

// API base URL
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// API server URL (backend)
process.env.API_URL = process.env.API_URL || 'http://localhost:6060';

// Logging
console.log('📋 Test Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   API Server: ${process.env.API_URL}`);
console.log(`   Frontend: ${process.env.BASE_URL}`);
console.log(`   Database: ${process.env.MONGO_URL?.replace(/\/\/.+:/, '//***:').replace(/@.+:/, '@***:')}`);
