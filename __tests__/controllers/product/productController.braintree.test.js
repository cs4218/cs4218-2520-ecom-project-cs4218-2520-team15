/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: { generate: jest.fn() },
    transaction: { sale: jest.fn() },
  })),
  Environment: {
    Sandbox: "sandbox",
  },
}));

jest.mock("../../../models/orderModel.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../../../models/productModel.js");
jest.mock("../../../models/categoryModel.js");
jest.mock("fs");
jest.mock("slugify");

import {
  braintreeTokenController,
  brainTreePaymentController,
} from "../../../controllers/productController.js";
import orderModel from "../../../models/orderModel.js";
import braintree from "braintree";

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("braintreeTokenController", () => {
  let res;
  let mockGenerate;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
    jest.spyOn(console, "log").mockImplementation(() => {});
    
    // Get the mock instance
    const gateway = new braintree.BraintreeGateway({});
    mockGenerate = gateway.clientToken.generate;
  });

  test("returns 500 when gateway is not initialized (NODE_ENV=test)", async () => {
    await braintreeTokenController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Braintree not initialized");
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe("brainTreePaymentController", () => {
  let req, res;
  let mockSale;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
    jest.spyOn(console, "log").mockImplementation(() => {});
    
    // Get the mock instance
    const gateway = new braintree.BraintreeGateway({});
    mockSale = gateway.transaction.sale;
  });

  test("returns 500 when gateway is not initialized (NODE_ENV=test)", async () => {
    req = {
      body: { nonce: "nonce", cart: [{ price: 10 }] },
      user: { _id: "user-test" },
    };

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Braintree not initialized");
    expect(mockSale).not.toHaveBeenCalled();
  });
});