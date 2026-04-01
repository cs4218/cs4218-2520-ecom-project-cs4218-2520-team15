import http from "k6/http";
import { check, group, fail } from "k6";
import { getAdminToken, getAuthHeaders } from "../helpers/auth.js";
import { volumeSeed, volumeTeardown } from "../helpers/seed.js";
import config from "../config.js";

const BASE_URL = config.BASE_URL;

export const options = {
  stages: config.STAGES.volume,
  thresholds: {
    "http_req_duration{endpoint:all-orders}": ["p(95)<800"],
    "http_req_duration{endpoint:orders}": ["p(95)<400"],
    "http_req_duration{endpoint:order-status}": ["p(95)<300"],
    "http_req_duration{endpoint:users}": ["p(95)<600"],
  }
};

export function setup() {
  // Seed volume data at "small" level (1,000 orders, 100 users, 100 products)
  console.log("Setup: Seeding volume data at 'small' level...");
  const seeded = volumeSeed("small", config.VOLUME_LEVELS);
  console.log(`Setup: Seeded ${seeded.orders} orders, ${seeded.users} users, ${seeded.products} products`);

  // Authenticate admin
  const adminToken = getAdminToken();
  
  return { adminToken };
}

export default function (data) {
  const adminToken = data.adminToken;
  const headers = getAuthHeaders(adminToken);

  group("GET /api/v1/auth/all-orders", () => {
    const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers,
      tags: { endpoint: "all-orders" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has data": (r) => r.body && r.body.length > 0
    });
  });

  group("GET /api/v1/auth/orders", () => {
    const res = http.get(`${BASE_URL}/api/v1/auth/orders`, {
      headers,
      tags: { endpoint: "orders" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
    });
  });

  group("GET /api/v1/auth/users", () => {
    const res = http.get(`${BASE_URL}/api/v1/auth/users`, {
      headers,
      tags: { endpoint: "users" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
    });
  });

  group("PUT /api/v1/auth/order-status/:id", () => {
    // Get a sample order ID from the database (first order)
    const ordersRes = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers
    });
    let orderId = null;
    try {
      const orders = JSON.parse(ordersRes.body);
      if (orders && orders.length > 0) {
        orderId = orders[0]._id;
      }
    } catch (e) {
      // If parsing fails, skip this request
    }

    if (orderId) {
      const statusPayload = JSON.stringify({ status: "Processing" });
      const res = http.put(`${BASE_URL}/api/v1/auth/order-status/${orderId}`, statusPayload, {
        headers,
        tags: { endpoint: "order-status" }
      });
      check(res, {
        "status is 200": (r) => r.status === 200,
      });
    }
  });
}

export function teardown() {
  console.log("Teardown: Cleaning up volume data...");
  const deleted = volumeTeardown();
  console.log(`Teardown: Deleted ${deleted.orders} orders, ${deleted.users} users, ${deleted.products} products`);
}
