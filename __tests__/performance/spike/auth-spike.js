/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 * 
 * Spike Test: Authentication endpoints (register, login)
 * Simulates sudden traffic spikes during flash sales/viral events
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Faker } from "k6/x/faker";

let spikeUsers = [];

export const options = {
  scenarios: {
    auth_spike: {
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
    // Strict thresholds for spike testing
    "http_req_failed{api:register}": ["rate < 0.01"],      // Max 1% errors during spike
    "http_req_duration{api:register}": ["p(95) < 1000"],   // 95% under 1s during spike
    "http_req_failed{api:login}": ["rate < 0.01"],
    "http_req_duration{api:login}": ["p(95) < 1000"],
  },
};

export default function (data) {
  const BASE_URL = "http://localhost:6060/api/v1/auth";
  const { person, internet, address } = new Faker();
  
  // Mix of register and login operations during spike
  const operation = Math.random() < 0.3 ? "register" : "login";
  
  // Register then login new users
  if (operation === "register") {
    const data = {
      name: person.name(),
      email: `spike_${Date.now()}_${Math.random()}@test.com`,
      password: internet.password(true, true, true, true, false, 8),
      phone: person.phone(),
      address: address.street(),
      answer: person.hobby(),
    };

    const registerResponse = http.post(
      `${BASE_URL}/register`,
      JSON.stringify(data),
      {
        headers: { "Content-Type": "application/json" },
        tags: { api: "register" },
        timeout: "5s" // add max to get some errors
      },
    );
    
    check(registerResponse, {
      "POST /register spike ok": (r) => r.status === 201,
    });
    
    // Minimal sleep during spike to maximize load
    sleep(Math.random() * 2);

    const loginResponse = http.post(
      `${BASE_URL}/login`,
      JSON.stringify({ email: data.email, password: data.password }),
      { 
        headers: { "Content-Type": "application/json" }, 
        tags: { api: "login" },
        timeout: "5s" // same
      },
    );

    check(loginResponse, {
      "POST /login spike (new user) ok": (r) => r.status === 200,
    });

    sleep(Math.random() * 2);
    
  } else {
    // Login with spike users from setup
    const availableUsers = (data && data.spikeUsers) || spikeUsers;
    if (availableUsers.length === 0) {
      console.warn("No spike users available for login");
      return;
    }
    
    const user = availableUsers[Math.floor(Math.random() * availableUsers.length)];
    
    const loginResponse = http.post(
      `${BASE_URL}/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { 
        headers: { "Content-Type": "application/json" }, 
        tags: { api: "login" },
        timeout: "5s" // same
      },
    );
    
    check(loginResponse, { 
      "POST /login spike (existing user) ok": (r) => r.status === 200 
    });
    
    sleep(Math.random() * 2);
  }
}

export function setup() {
  // Seed spike test users (50 users: spike_user_0 through spike_user_49)
  const seedResponse = http.post("http://localhost:6060/api/v1/test/spike-seed");
  check(seedResponse, { "Spike seed successful": (r) => r.status === 200 });

  // Fetch all spike test users
  const getUsersResponse = http.get("http://localhost:6060/api/v1/test/spike-users");
  check(getUsersResponse, { "Get spike users successful": (r) => r.status === 200 });
  
  const data = JSON.parse(getUsersResponse.body);
  if (data.success && data.users) {
    spikeUsers = data.users;
    console.log(`✅ Loaded ${spikeUsers.length} spike users for test`);
  }
  
  return { spikeUsers };
}

export function teardown() {
  http.post("http://localhost:6060/api/v1/test/teardown");
}