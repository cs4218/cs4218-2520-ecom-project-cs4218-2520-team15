import http from "k6/http";
import { check, group } from "k6";
import { seedDatabase, getAdminToken, getAuthHeaders } from "../helpers/auth.js";
import { getSeededData, pickRandom, validateSeededData } from "../helpers/data.js";
import config from "../config.js";

const BASE_URL = config.BASE_URL;

export const options = {
  stages: config.STAGES.smoke,
  thresholds: {
    "http_req_duration{endpoint:all-orders}": ["p(95)<800"],
    "http_req_duration{endpoint:orders}": ["p(95)<400"],
    "http_req_duration{endpoint:order-status}": ["p(95)<400"],
    "http_req_duration{endpoint:users}": ["p(95)<600"],
    "http_req_duration{endpoint:products}": ["p(95)<500"],
    "http_req_duration{endpoint:products-paged}": ["p(95)<600"],
    "http_req_duration{endpoint:product-detail}": ["p(95)<400"],
    "http_req_duration{endpoint:product-photo}": ["p(95)<800"],
    "http_req_duration{endpoint:categories}": ["p(95)<400"],
    "http_req_duration{endpoint:categories-paged}": ["p(95)<800"],
  }
};

export function setup() {
  console.log("Smoke test setup: Initializing test environment...");
  
  seedDatabase();
  const adminToken = getAdminToken();
  console.log("✓ Admin authenticated");
  
  console.log("Warming cache...");
  const headers = getAuthHeaders(adminToken);
  
  http.get(`${BASE_URL}/api/v1/product/get-product`, {
    headers,
    tags: { name: "cache-warmup" }
  });
  
  http.get(`${BASE_URL}/api/v1/category/get-category`, {
    headers,
    tags: { name: "cache-warmup" }
  });
  
  console.log("✓ Cache warmed up");
  
  const seededData = getSeededData(adminToken);
  
  if (!validateSeededData(seededData)) {
    throw new Error("Seeded data validation failed - test database may not be properly initialized");
  }
  
  console.log("✓ Smoke test setup complete");
  
  return seededData;
}

export default function (data) {
  const adminToken = data.adminToken;
  const headers = getAuthHeaders(adminToken);
  const { productIds, productSlugs, categoryIds, categorySlugs, orderIds } = data;

  // Smoke test: quick sanity check, run all endpoints once
  group("GET /api/v1/product/get-product (list)", () => {
    const res = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      headers,
      tags: { endpoint: "products" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has products": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.products && data.products.length > 0;
        } catch (e) {
          return false;
        }
      }
    });
  });

  // Product detail - requires SLUG not ID
  if (productSlugs && productSlugs.length > 0) {
    const randomProductSlug = pickRandom(productSlugs);
    
    group("GET /api/v1/product/get-product/:slug (detail)", () => {
      const res = http.get(`${BASE_URL}/api/v1/product/get-product/${randomProductSlug}`, {
        headers,
        tags: { endpoint: "product-detail" }
      });
      check(res, {
        "status is 200": (r) => r.status === 200,
        "response has product": (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.product && data.product._id;
          } catch (e) {
            return false;
          }
        }
      });
    });

    // Product photo - requires ID (pid)
    if (productIds && productIds.length > 0) {
      const randomProductId = pickRandom(productIds);
      group("GET /api/v1/product/product-photo/:pid", () => {
        const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${randomProductId}`, {
          headers,
          tags: { endpoint: "product-photo" }
        });
        check(res, {
          "status is 200 or 304": (r) => r.status === 200 || r.status === 304,
        });
      });
    }
  }
  
  // Paginated products
  group("GET /api/v1/product/product-list/:page", () => {
    const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
      headers,
      tags: { endpoint: "products-paged" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has products": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.products && data.products.length > 0;
        } catch (e) {
          return false;
        }
      }
    });
  });

  group("GET /api/v1/category/get-category", () => {
    const res = http.get(`${BASE_URL}/api/v1/category/get-category`, {
      headers,
      tags: { endpoint: "categories" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has categories": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.category && data.category.length > 0;
        } catch (e) {
          return false;
        }
      }
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

  group("GET /api/v1/auth/all-orders", () => {
    const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers,
      tags: { endpoint: "all-orders" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response is valid": (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) || (data && Array.isArray(data.orders));
        } catch (e) {
          return false;
        }
      }
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

  // Category filtering by slug
  if (categorySlugs && categorySlugs.length > 0) {
    const randomCategorySlug = pickRandom(categorySlugs);
    group("GET /api/v1/product/product-category/:slug", () => {
      const res = http.get(`${BASE_URL}/api/v1/product/product-category/${randomCategorySlug}`, {
        headers,
        tags: { endpoint: "categories-paged" }
      });
      check(res, {
        "status is 200": (r) => r.status === 200,
        "response has products": (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.products !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    });
  }

  if (orderIds && orderIds.length > 0) {
    const randomOrderId = pickRandom(orderIds);
    group("PUT /api/v1/auth/order-status/:orderId", () => {
      const statuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
      const newStatus = pickRandom(statuses);
      const payload = JSON.stringify({ status: newStatus });
      const res = http.put(`${BASE_URL}/api/v1/auth/order-status/${randomOrderId}`, payload, {
        headers,
        tags: { endpoint: "order-status" }
      });
      check(res, {
        "status is 200": (r) => r.status === 200,
        "response is valid": (r) => {
          try {
            JSON.parse(r.body);
            return true;
          } catch (e) {
            return false;
          }
        }
      });
    });
  }
}

function cleanupSeededData() {
  try {
    const res = http.post(`${BASE_URL}/api/v1/test/teardown`);
    if (res.status === 200) {
      console.log("✓ Seeded test data cleaned up successfully");
    } else {
      console.warn(`Cleanup warning: teardown returned status ${res.status}`);
    }
  } catch (error) {
    console.warn(`Cleanup warning: Failed to clean up test data: ${error}`);
  }
}

export function teardown() {
  console.log("Smoke test teardown: Cleaning up test environment...");
  cleanupSeededData();
  console.log("✓ Smoke test teardown complete");
}
