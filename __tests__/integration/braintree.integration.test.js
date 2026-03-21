/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

jest.resetModules();
jest.setTimeout(30000);

import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "development";
process.env.JWT_SECRET = "test-secret";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";

import app from "../../server.js";

import orderModel from "../../models/orderModel.js";
import userModel from "../../models/userModel.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";

describe("Integration Test: Braintree Payment + Order DB", () => {
  let mongoServer;
  let category;
  let product;
  let testUser;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await mongoose.connection.asPromise();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      orderModel.deleteMany({}),
      userModel.deleteMany({}),
      productModel.deleteMany({}),
      categoryModel.deleteMany({})
    ]);

    testUser = await userModel.create({
      name: "Test Buyer",
      email: "buyer@test.com",
      password: "hashedpassword123",
      phone: "1234567890",
      address: "123 Test Street",
      answer: "testanswer",
      role: 0,
    });

    authToken = JWT.sign(
      { _id: testUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    product = await productModel.create({
      name: "Laptop",
      slug: "laptop",
      description: "Test laptop",
      price: 999,
      category: category._id,
      quantity: 10,
      shipping: true,
      photo: {
        data: Buffer.from("fake-image-data"),
        contentType: "image/jpeg",
      },
    });
  });

  test("should generate client token from sandbox", async () => {
    const res = await request(app)
      .get("/api/v1/product/braintree/token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientToken');
    expect(res.body.clientToken).toBeTruthy();
  });

  test("should create order in database when payment succeeds", async () => {
    const res = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", authToken)
      .send({
        nonce: "fake-valid-nonce",
        cart: [{ _id: product._id.toString(), price: 10.00 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const orders = await orderModel.find({}).populate('products');
    expect(orders).toHaveLength(1);
    expect(orders[0].products[0]._id.toString()).toBe(product._id.toString());
  });

  test("should create order with multiple products", async () => {
    const mouse = await productModel.create({
      name: "Mouse",
      slug: "mouse",
      description: "Test mouse",
      price: 25,
      category: category._id,
      quantity: 10,
      shipping: true,
      photo: {
        data: Buffer.from("fake"),
        contentType: "image/jpeg",
      },
    });

    const cartItems = [
      { _id: product._id.toString(), price: 10.00 },
      { _id: mouse._id.toString(), price: 5.00 }
    ];

    const res = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", authToken)
      .send({
        nonce: "fake-valid-nonce",
        cart: cartItems,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const orders = await orderModel.find({}).populate('products');
    expect(orders).toHaveLength(1);
    expect(orders[0].products).toHaveLength(2);
  });

  test("should NOT create order when payment fails", async () => {
    const res = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", authToken)
      .send({
        nonce: "fake-valid-nonce",
        cart: [{ _id: product._id.toString(), price: 2000.00 }],
      });

    expect(res.status).toBe(500);
    
    const orders = await orderModel.find({});
    expect(orders).toHaveLength(0);
  });

  test("should handle empty cart gracefully", async () => {
    const res = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", authToken)
      .send({
        nonce: "fake-valid-nonce",
        cart: [],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const orders = await orderModel.find({});
    expect(orders).toHaveLength(1);
    expect(orders[0].products).toHaveLength(0);
  });
});