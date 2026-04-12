/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:6060';

export const browseErrorRate = new Rate('browse_error_rate');
export const searchErrorRate = new Rate('search_error_rate');

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'browse',
      tags: { scenario: 'browse' },
    },
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'search',
      tags: { scenario: 'search' },
    },
  },
  thresholds: {
    'http_req_failed{scenario:browse}': ['rate < 0.01'],
    'http_req_duration{scenario:browse}': ['p(90) < 700'],
    'http_req_failed{scenario:search}': ['rate < 0.01'],
    'http_req_duration{scenario:search}': ['p(90) < 700'],
  },
  setupTimeout: '300s',
};

// Keywords for search testing
const searchKeywords = [
  'laptop', 'book', 'electronics', 'clothing', 'novel', 'phone',
  'shirt', 'textbook', 'mouse', 'keyboard'
];

export function setup() {
  // Seed the database before starting the performance test
  const seedRes = http.post(`${BASE_URL}/api/v1/test/performance-seed`, null, { timeout: '300s' });
  
  if (seedRes.status !== 200) {
    console.error('❌ Failed to seed database:', seedRes.status, seedRes.body);
  } else {
    console.log('✅ Database seeded for performance test');
  }
}

export function teardown() {
  // Clean up the database after the performance test
  const teardownRes = http.post(`${BASE_URL}/api/v1/test/teardown`);
  
  if (teardownRes.status !== 200) {
    console.error('❌ Failed to teardown database:', teardownRes.status, teardownRes.body);
  } else {
    console.log('✅ Database teardown completed after performance test');
  }
}

export function browse() {
  const page = Math.floor(Math.random() * Math.ceil(300 / 6)) + 1; // Random page between 1-50 (300 products, 6 per page)
  const productListResponse = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);
  const productListSuccess = check(productListResponse, {
    'product-list status is 200': (r) => r.status === 200,
  });

  browseErrorRate.add(!productListSuccess);
  sleep(Math.random() * 1 + 0.5);
};

export function search() {
  const randomKeyword = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
  const searchResponse = http.get(`${BASE_URL}/api/v1/product/search/${randomKeyword}`);
  const searchSuccess = check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
  });

  searchErrorRate.add(!searchSuccess);
  sleep(Math.random() * 3 + 1);
};