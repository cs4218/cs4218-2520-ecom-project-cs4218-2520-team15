/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:6060';

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(90)<1000'],
  },
  setupTimeout: '300s',
};

export function setup() {
  // Seed the database before starting the performance test
  const seedRes = http.post(`${BASE_URL}/api/v1/test/performance-seed`, null, requestParams('seed'));
  
  if (seedRes.status !== 200) {
    console.error('❌ Failed to seed database:', seedRes.status, seedRes.body);
    throw new Error('❌ Failed to seed database');
  }

  let data;
  try {
    data = JSON.parse(seedRes.body)
  } catch (e) {
    console.error('Failed to parse seed response');
    throw new Error('Failed to parse seed response');
  }

  let products = data.products;
  let users = data.users;

  for (let i = 0; i < Math.min(users.length, 50); i++) {
    const user = users[i];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, requestParams('login'));
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      user.authToken = loginData.token;
    } else {
      console.warn(`Failed to pre-auth user ${user.email}`);
    }
  }

  return { 
    products: products,
    users: users,
  };
}

export function teardown() {
  // Clean up the database after the performance test
  const teardownRes = http.post(`${BASE_URL}/api/v1/test/teardown`, null, requestParams('teardown'));
  
  if (teardownRes.status !== 200) {
    console.error('❌ Failed to teardown database:', teardownRes.status, teardownRes.body);
  } else {
    console.log('✅ Database teardown completed after performance test');
  }
}

function requestParams(endpoint) {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint },
    timeout: '300s',
  };
}

function getCart(products) {
  const N = Math.floor(Math.random() * 4) + 1; // Get random number of items between [1, 4]
  const cart = new Array(N).fill(null).map(() => products[Math.floor(Math.random() * products.length)]);
  return cart;
}

export default function (data) {
  const { products, users } = data;

  // Get user for this VU
  const user = users[__VU % users.length];
  
  // Get or create auth token
  let authToken = user.authToken;
  if (!authToken) {
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, requestParams('login'));
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      authToken = loginData.token;
      user.authToken = authToken;
    } else {
      console.warn(`Failed to pre-auth user ${user.email}`);
      sleep(1);
      return;
    }
  }

  const cart = getCart(products);
  const nonces = [
    "fake-valid-nonce",
    "fake-valid-visa-nonce",
    "fake-valid-amex-nonce",
    "fake-valid-mastercard-nonce",
    "fake-valid-discover-nonce",
    "fake-valid-debit-nonce"
  ];
  const nonce = nonces[Math.floor(Math.random() * nonces.length)];

  const paymentPayload = JSON.stringify({
    nonce,
    cart,
  });

  const paymentParams = requestParams('payment');
  paymentParams['headers']['Authorization'] = user.authToken;

  const paymentResponse = http.post(`${BASE_URL}/api/v1/product/braintree/payment`, paymentPayload, paymentParams);
  if (paymentResponse.status !== 200) {
    console.error('Payment failed:', paymentResponse.status, paymentResponse.body);
  }
  check(paymentResponse, {
    'Payment endpoint status is 200': (r) => r.status === 200,
  });

  sleep(15);
}