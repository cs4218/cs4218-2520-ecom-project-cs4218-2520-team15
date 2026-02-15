import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockGenerate = jest.fn();
const mockSale = jest.fn();
const mockSave = jest.fn().mockResolvedValue({});
const MockOrderModel = jest.fn(() => ({ save: mockSave }));

await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(() => ({
      clientToken: { generate: mockGenerate },
      transaction: { sale: mockSale },
    })),
    Environment: { Sandbox: "sandbox" },
  },
}));

await jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: MockOrderModel,
}));

await jest.unstable_mockModule("dotenv", () => ({
  default: { config: jest.fn() },
}));

await jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: jest.fn(),
}));

await jest.unstable_mockModule("../../models/categoryModel.js", () => ({
  default: jest.fn(),
}));

await jest.unstable_mockModule("fs", () => ({
  default: jest.fn(),
}));

await jest.unstable_mockModule("slugify", () => ({
  default: jest.fn(),
}));

const { braintreeTokenController, brainTreePaymentController } =
  await import("../../controllers/productController.js");

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("braintreeTokenController", () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
  });

  test("sends token on success", async () => {
    mockGenerate.mockImplementation((options, callback) => {
      callback(null, "mock-token");
    });

    await braintreeTokenController({}, res);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("mock-token");
  });

  test("returns 500 if gateway returns error", async () => {
    const err = new Error("token error");
    mockGenerate.mockImplementation((options, callback) => {
      callback(err, null);
    });

    await braintreeTokenController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });

  test("returns 500 if unexpected error thrown", async () => {
    const err = new Error("unexpected");
    mockGenerate.mockImplementation(() => {
      throw err;
    });

    await braintreeTokenController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });
});

describe("brainTreePaymentController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
  });

  test("processes payment and saves order on success", async () => {
    const cart = [
      { price: 10 },
      { price: 20 },
    ];

    req = {
      body: { nonce: "nonce", cart },
      user: { _id: "user1" },
    };

    mockSale.mockImplementation((options, callback) => {
      callback(null, { transaction: "success" });
    });

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledTimes(1);
    expect(MockOrderModel).toHaveBeenCalledWith({
      products: cart,
      payment: { transaction: "success" },
      buyer: "user1",
    });

    expect(mockSave).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test("returns 500 if transaction fails", async () => {
    req = {
      body: { nonce: "nonce", cart: [{ price: 10 }] },
      user: { _id: "user2" },
    };

    const err = new Error("payment failed");

    mockSale.mockImplementation((options, callback) => {
      callback(err, null);
    });

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });

  test("returns 500 if unexpected error thrown", async () => {
    req = {
      body: { nonce: "nonce", cart: [{ price: 10 }] },
      user: { _id: "user3" },
    };

    const err = new Error("unexpected crash");

    mockSale.mockImplementation(() => {
      throw err;
    });

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });
});
