import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:6060';

export const browseErrorRate = new Rate('browse_error_rate');
export const searchErrorRate = new Rate('search_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(90)<500'],
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

  let data;
  try {
    data = JSON.parse(seedRes.body)
  } catch (e) {
    console.error('Failed to parse seed response');
    throw new Error('Failed to parse seed response');
  }

  return { 
    products: data.products,
  };
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

export default function (data) {
  const { products } = data;
  
  group('Browse endpoint', function () {
    const page = Math.floor(Math.random() * Math.ceil(products.length / 6)) + 1;
    const productListResponse = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);
    const productListSuccess = check(productListResponse, {
      'product-list status is 200': (r) => r.status === 200,
    });
  
    browseErrorRate.add(!productListSuccess);
    sleep(Math.random() * 1 + 0.5);
  });

  group('Search endpoint', function () {
    const randomKeyword = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
    const searchResponse = http.get(`${BASE_URL}/api/v1/product/search/${randomKeyword}`);
    const searchSuccess = check(searchResponse, {
      'search status is 200': (r) => r.status === 200,
    });
  
    searchErrorRate.add(!searchSuccess);
    sleep(Math.random() * 3 + 1);
  });
}