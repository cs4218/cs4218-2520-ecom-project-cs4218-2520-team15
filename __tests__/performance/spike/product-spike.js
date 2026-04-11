/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 * 
 * Spike Test: Product browsing and search endpoints
 * Simulates traffic spikes during product launches/viral marketing
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Faker } from "k6/x/faker";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom metrics for detailed analysis
const browseResponseTime = new Trend("browse_response_time", true);
const searchResponseTime = new Trend("search_response_time", true);
const spikeErrorRate = new Rate("spike_errors");
const spikeRequests = new Counter("spike_requests");

export const options = {
  scenarios: {
    // Spike test for browse endpoint
    browse_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 30 },      // Baseline
        { duration: "1m", target: 30 },
        { duration: "5s", target: 300 },      // Sudden 10x spike
        { duration: "45s", target: 300 },     // Sustain spike
        { duration: "5s", target: 30 },       // Recovery
        { duration: "30s", target: 30 },
        { duration: "5s", target: 0 },
      ],
      exec: "browseSpike",
      tags: { scenario: "browse_spike" },
    },
    
    // Spike test for search endpoint
    search_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 30 },
        { duration: "1m", target: 30 },
        { duration: "5s", target: 400 },      // Search can be heavier
        { duration: "45s", target: 400 },
        { duration: "5s", target: 30 },
        { duration: "30s", target: 30 },
        { duration: "5s", target: 0 },
      ],
      exec: "searchSpike",
      tags: { scenario: "search_spike" },
    },
  },
  thresholds: {
    "browse_response_time": ["p(95) < 1500"],
    "search_response_time": ["p(95) < 1500"],
    "spike_errors": ["rate < 0.01"],          // Allow 1% errors during spike
    "http_req_failed": ["rate < 0.01"],
    "http_req_duration": ["p(95) < 1500"],
  },
};

const BASE_URL = "http://localhost:6060/api/v1/product";

export function setup() {
  const seedResponse = http.post("http://localhost:6060/api/v1/test/spike-seed");
  check(seedResponse, { "Spike seed successful": (r) => r.status === 200 });
  return { startTime: Date.now() };
}

export function browseSpike() {
  const startTime = new Date();
  
  // Random page between 1-50 (300 products, 6 per page)
  const page = Math.floor(Math.random() * 50) + 1;
  
  const pageResponse = http.get(
    `${BASE_URL}/product-list/${page}`,
    { 
      tags: { endpoint: "browse" },
      timeout: "10s",
    }
  );
  
  browseResponseTime.add(new Date() - startTime);
  spikeRequests.add(1, { endpoint: "browse" });
  
  const isSuccess = pageResponse.status === 200;
  spikeErrorRate.add(!isSuccess);
  
  check(pageResponse, {
    "browse spike ok": (r) => r.status === 200,
    "browse products ≤ 6": (r) => r.json().products.length <= 6,
  });
  
  // Minimal sleep to maximize spike load
  sleep(Math.random() * 1.5);
}

export function searchSpike() {
  const startTime = new Date();
  const { commerce } = new Faker();
  
  // Generate realistic search keywords
  const keywords = [
    "laptop", "phone", "headphones", "monitor", "keyboard",
    "mouse", "speaker", "camera", "printer", "tablet"
  ];
  const searchKeyword = encodeURI(keywords[Math.floor(Math.random() * keywords.length)]);
  
  const searchResponse = http.get(
    `${BASE_URL}/search/${searchKeyword}`,
    { 
      tags: { endpoint: "search" },
      timeout: "10s",
    }
  );
  
  searchResponseTime.add(new Date() - startTime);
  spikeRequests.add(1, { endpoint: "search" });
  
  const isSuccess = searchResponse.status === 200;
  spikeErrorRate.add(!isSuccess);
  
  check(searchResponse, {
    "search spike ok": (r) => r.status === 200,
  });
  
  sleep(Math.random() * 1.5);
}

export function teardown() {
  http.post("http://localhost:6060/api/v1/test/teardown");
}
