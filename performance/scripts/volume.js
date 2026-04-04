import http from "k6/http";
import { check, group, fail } from "k6";
import { getAdminToken, getAuthHeaders } from "../helpers/auth.js";
import { getSeededData, pickRandom, validateSeededData } from "../helpers/data.js";
import { volumeSeed, volumeTeardown } from "../helpers/seed.js";
import config from "../config.js";

const BASE_URL = config.BASE_URL;

export const options = {
  stages: config.STAGES.volume,
  thresholds: {
    "http_req_duration{endpoint:all-orders}": ["p(95)<800"],
    "http_req_duration{endpoint:orders}": ["p(95)<400"],
    "http_req_duration{endpoint:order-status}": ["p(95)<400"],
    "http_req_duration{endpoint:users}": ["p(95)<600"],
    "http_req_duration{endpoint:products}": ["p(95)<600"],
    "http_req_duration{endpoint:products-paged}": ["p(95)<600"],
    "http_req_duration{endpoint:product-detail}": ["p(95)<400"],
    "http_req_duration{endpoint:product-photo}": ["p(95)<800"],
    "http_req_duration{endpoint:categories}": ["p(95)<400"],
    "http_req_duration{endpoint:categories-paged}": ["p(95)<800"],
  }
};

export function setup() {
  console.log("Volume test setup: Initializing test environment...");
  const empty = volumeTeardown();
  console.log(`Setup: Cleaned up ${empty.orders} orders, ${empty.users} users, ${empty.products} products from previous runs`);

  console.log("Setup: Seeding volume data at 'small' level...");
  const seeded = volumeSeed("small", config.VOLUME_LEVELS);
  console.log(`Setup: Seeded ${seeded.orders} orders, ${seeded.users} users, ${seeded.products} products`);

  const adminToken = getAdminToken();
  console.log("✓ Admin authenticated");

  console.log("Fetching seeded data IDs...");
  const seededData = getSeededData(adminToken);

  if (!validateSeededData(seededData)) {
    throw new Error("Seeded data validation failed - volume seeding may not have completed properly");
  }

  console.log("✓ Volume test setup complete");
  return seededData;
}

export default function (data) {
  const adminToken = data.adminToken;
  const headers = getAuthHeaders(adminToken);
  const { productIds, productSlugs, categoryIds, categorySlugs, orderIds } = data;

  // 70% reads, 30% writes distribution
  const scenario = Math.random();

  // COMMON READS
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

  // READ/WRITE SCENARIOS (70%/30%)
  if (scenario < 0.70) {
    // READ SCENARIO (70%)
    // Product filters by category slug
    if (categorySlugs && categorySlugs.length > 0) {
      const randomCategorySlug = pickRandom(categorySlugs);
      group("GET /api/v1/product/product-category/:slug (filtered)", () => {
        const res = http.get(`${BASE_URL}/api/v1/product/product-category/${randomCategorySlug}`, {
          headers,
          tags: { endpoint: "categories-paged" }
        });
        check(res, {
          "status is 200": (r) => r.status === 200,
          "response has products": (r) => {
            try {
              const data = JSON.parse(r.body);
              return data.products && data.products.length >= 0;
            } catch (e) {
              return false;
            }
          }
        });
      });
    } else {
      // Fallback if no categories
      group("GET /api/v1/product/product-list/:page (fallback)", () => {
        const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
          headers,
          tags: { endpoint: "categories-paged" }
        });
        check(res, {
          "status is 200": (r) => r.status === 200,
        });
      });
    }
  } else {
    // WRITE SCENARIO (30%)
    // Update order status (if orders exist)
    if (orderIds && orderIds.length > 0) {
      const randomOrderId = pickRandom(orderIds);
      group("PUT /api/v1/auth/order-status/:orderId (update status)", () => {
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
    } else {
      // Fallback if no orders: read products instead
      group("GET /api/v1/product/product-list/:page (fallback)", () => {
        const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
          headers,
          tags: { endpoint: "order-status" }
        });
        check(res, {
          "status is 200": (r) => r.status === 200,
        });
      });
    }
  }
}

export function teardown() {
  console.log("Teardown: Cleaning up volume data...");
  const deleted = volumeTeardown();
  console.log(`Teardown: Deleted ${deleted.orders} orders, ${deleted.users} users, ${deleted.products} products`);
}
