// Performance testing configuration
// CommonJS export for k6 and Node.js scripts

export default {
  BASE_URL: "http://localhost:6060",

  THRESHOLDS: {
    allOrders: "p(95)<800ms",
    orders: "p(95)<400ms",
    orderStatus: "p(95)<300ms",
    users: "p(95)<600ms"
  },

  STAGES: {
    baseline: [
      { duration: "30s", target: 1 }
    ],
    smoke: [
      { duration: "10s", target: 1 }
    ],
    volume: [
      { duration: "30s", target: 1 },
      { duration: "60s", target: 1 },
      { duration: "30s", target: 0 }
    ]
  },

  VOLUME_LEVELS: {
    small: {
      orders: 1000,
      users: 100,
      products: 100
    },
    medium: {
      orders: 10000,
      users: 1000,
      products: 500
    },
    large: {
      orders: 100000,
      users: 5000,
      products: 1000
    }
  }
};
