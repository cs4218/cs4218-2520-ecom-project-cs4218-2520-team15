/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 * 
 * Spike Test: Checkout/Payment endpoints
 * Simulates sudden traffic spikes during flash sales/viral events
 */

import { check, sleep } from "k6";
import http from "k6/http";
import exec from "k6/execution";

let spikeUsers = [];
let spikeProducts = [];

export const options = {
  scenarios: {
    checkout_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        // Normal load
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        
        // SUDDEN SPIKE - Flash sale begins
        { duration: "10s", target: 200 },    // 10x spike
        { duration: "1m", target: 200 },     // Sustain spike
        
        // Quick recovery
        { duration: "10s", target: 20 },
        { duration: "1m", target: 20 },
        
        // Second larger spike
        { duration: "10s", target: 500 },    // 25x spike
        { duration: "30s", target: 500 },    // Brief extreme load
        
        // Cooldown
        { duration: "10s", target: 20 },
        { duration: "30s", target: 0 },
      ],
      gracefulStop: "30s",
    },
  },
  thresholds: {
    // Thresholds for spike testing
    "http_req_failed{api:payment}": ["rate < 0.02"],      // Max 2% errors during spike (note: some errors caused by braintree sandbox)
    "http_req_duration{api:payment}": ["p(95) < 2000"],   // 95% under 2s during spike
  },
  setupTimeout: "120s",
};

export function setup() {
  // Seed spike test database
  const seedResponse = http.post("http://localhost:6060/api/v1/test/spike-seed");
  const seedCheck = check(seedResponse, { 
    "Spike seed successful": (r) => r.status === 200 
  });
  
  if (!seedCheck) {
    console.error(`Seed failed with status: ${seedResponse.status}`);
    exec.test.abort("Aborting test: Spike seed operation failed.");
  }
  
  // Parse seed response to get products
  let seedData;
  try {
    seedData = JSON.parse(seedResponse.body);
  } catch (e) {
    console.error("Failed to parse seed response");
    exec.test.abort("Aborting test: Invalid seed response.");
  }
  
  // Check if products exist in the response
  if (seedData.success && seedData.products) {
    spikeProducts = seedData.products;
  } else {
    console.error("No products found in seed response");
    exec.test.abort("Aborting test: No products available.");
  }
  
  // Fetch spike test users
  const getUsersResponse = http.get("http://localhost:6060/api/v1/test/spike-users");
  const usersCheck = check(getUsersResponse, { 
    "Get spike users successful": (r) => r.status === 200 
  });
  
  if (!usersCheck) {
    console.error(`Failed to get users: ${getUsersResponse.status}`);
    exec.test.abort("Aborting test: Failed to get spike users.");
  }
  
  const usersData = JSON.parse(getUsersResponse.body);
  if (usersData.success && usersData.users) {
    spikeUsers = usersData.users;
  } else {
    console.error("No users found in response");
    exec.test.abort("Aborting test: No users available.");
  }
  
  // Pre-authenticate a subset of users to reduce setup time
  // Store tokens in the shared array
  for (let i = 0; i < Math.min(spikeUsers.length, 50); i++) {
    const user = spikeUsers[i];
    const loginResponse = http.post(
      "http://localhost:6060/api/v1/auth/login",
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { "Content-Type": "application/json" } }
    );
    
    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      user.authToken = loginData.token;
    } else {
      console.warn(`Failed to pre-auth user ${user.email}`);
    }
    
    // Small delay to avoid overwhelming server during setup
    sleep(0.05);
  }
  
  return { 
    spikeUsers: spikeUsers,
    spikeProducts: spikeProducts,
    nonces: [
        "fake-valid-nonce",
        "fake-valid-visa-nonce",
        "fake-valid-amex-nonce",
        "fake-valid-mastercard-nonce",
        "fake-valid-discover-nonce",
        "fake-valid-debit-nonce",
    ]
  };
}

export default function (data) {
  const getRandomItem = (collection) => {
    if (!collection || collection.length === 0) {
      console.error("Collection is empty or undefined");
      return null;
    }
    const index = Math.floor(Math.random() * collection.length);
    return collection[index];
  };
  
  // Get data from setup or fallback to global variables
  const users = (data && data.spikeUsers) || spikeUsers;
  const products = (data && data.spikeProducts) || spikeProducts;
  const nonces = (data && data.nonces) || [
    "fake-valid-nonce",
    "fake-valid-visa-nonce",
  ];
  
  if (users.length === 0) {
    console.warn("No spike users available for checkout");
    return;
  }
  
  if (products.length === 0) {
    console.warn("No products available for checkout");
    return;
  }
  
  // Get user for this VU
  const user = users[__VU % users.length];
  
  // Get or create auth token
  let authToken = user.authToken;
  
  if (!authToken) {
    // Authenticate on the fly
    const loginResponse = http.post(
      "http://localhost:6060/api/v1/auth/login",
      JSON.stringify({ email: user.email, password: user.password }),
      { 
        headers: { "Content-Type": "application/json" },
        tags: { api: "login" },
        timeout: "10s"
      }
    );
    
    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      authToken = loginData.token;
      user.authToken = authToken; // Cache for future iterations
    } else {
      console.warn(`Auth failed for user ${user.email}`);
      sleep(1);
      return;
    }
  }
  
  // Create cart with random products
  const cartSize = Math.random() < 0.7 ? 2 : 4; // 2-4 items per cart for spike test
  const cart = [];
  
  for (let i = 0; i < cartSize; i++) {
    const product = getRandomItem(products);
    if (product) {
      // Format price to 2 decimals to avoid floating-point precision errors
      const price = parseFloat(product.price);
      const formattedPrice = Math.round(price * 100) / 100;
      cart.push({
        _id: product._id,
        price: formattedPrice
      });
    }
  }
  
  if (cart.length === 0) {
    console.warn("No products added to cart");
    return;
  }
  
  const nonce = getRandomItem(nonces);
  
  const paymentResponse = http.post(
    "http://localhost:6060/api/v1/product/braintree/payment",
    JSON.stringify({ nonce, cart }),
    {
      headers: { 
        Authorization: authToken, 
        "Content-Type": "application/json" 
      },
      tags: { api: "payment" },
      timeout: "15s",
    },
  );
  
  check(paymentResponse, {
    "POST /braintree/payment response OK": (r) => r.status === 200,
  });
  
  // Variable sleep time based on success/failure
  const sleepTime = paymentResponse.status === 200 ? (Math.random() * 3) : 1;
  sleep(sleepTime);
}

export function teardown(data) {
  http.post("http://localhost:6060/api/v1/test/teardown");
}