/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

jest.resetModules();
jest.setTimeout(30000);

import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";

import app from "../../server.js";

import categoryModel from "../../models/categoryModel.js";
import userModel from "../../models/userModel.js";

describe("Integration Test: Category Controller + DB", () => {
  let mongoServer;
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
    await categoryModel.deleteMany({});
    await userModel.deleteMany({});

    // Create admin user for authenticated requests
    testUser = await userModel.create({
      name: "Test Admin",
      email: "admin@test.com",
      password: "hashedpassword123",
      phone: "1234567890",
      address: "123 Admin Street",
      answer: "testanswer",
      role: 1, // Admin role
    });

    authToken = JWT.sign(
      { _id: testUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  });

  test("should return empty array when no categories exist", async () => {
    const res = await request(app)
      .get("/api/v1/category/get-category");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("All Categories List");
    expect(res.body.category).toEqual([]);
    expect(res.body.category).toHaveLength(0);
  });

  test("should return all categories from database", async () => {
    const category1 = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const category2 = await categoryModel.create({
      name: "Books",
      slug: "books",
    });

    const category3 = await categoryModel.create({
      name: "Clothing",
      slug: "clothing",
    });

    const res = await request(app)
      .get("/api/v1/category/get-category");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("All Categories List");
    expect(res.body.category).toHaveLength(3);
    
    const categoryNames = res.body.category.map(cat => cat.name);
    expect(categoryNames).toContain("Electronics");
    expect(categoryNames).toContain("Books");
    expect(categoryNames).toContain("Clothing");
  });

  test("should return specific category when valid slug is provided", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const res = await request(app)
      .get("/api/v1/category/single-category/electronics");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Get Single Category Successfully");
    expect(res.body.category).toBeDefined();
    expect(res.body.category.name).toBe("Electronics");
    expect(res.body.category.slug).toBe("electronics");
    expect(res.body.category._id.toString()).toBe(category._id.toString());
  });

  test("should return null category when slug does not exist", async () => {
    await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const res = await request(app)
      .get("/api/v1/category/single-category/non-existent-slug");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Get Single Category Successfully");
    expect(res.body.category).toBeNull();
  });

  test("should return only the matching category when multiple exist", async () => {
    await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const booksCategory = await categoryModel.create({
      name: "Books",
      slug: "books",
    });

    await categoryModel.create({
      name: "Clothing",
      slug: "clothing",
    });

    const res = await request(app)
      .get("/api/v1/category/single-category/books");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category).toBeDefined();
    expect(res.body.category.name).toBe("Books");
    expect(res.body.category.slug).toBe("books");
    expect(res.body.category._id.toString()).toBe(booksCategory._id.toString());
    
    expect(res.body.category.name).not.toBe("Electronics");
    expect(res.body.category.name).not.toBe("Clothing");
  });

  test("should include newly created category in get all categories", async () => {
    await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    let res = await request(app)
      .get("/api/v1/category/get-category");
    
    expect(res.body.category).toHaveLength(1);

    await request(app)
      .post("/api/v1/category/create-category")
      .set("Authorization", authToken)
      .send({ name: "Books" });

    res = await request(app)
      .get("/api/v1/category/get-category");

    expect(res.status).toBe(200);
    expect(res.body.category).toHaveLength(2);
    
    const categoryNames = res.body.category.map(cat => cat.name);
    expect(categoryNames).toContain("Electronics");
    expect(categoryNames).toContain("Books");
  });

  test("should retrieve category by slug after creation", async () => {
    const createRes = await request(app)
      .post("/api/v1/category/create-category")
      .set("Authorization", authToken)
      .send({ name: "Home & Garden" });
  
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
  
    const createdSlug = createRes.body.category.slug;
  
    const getRes = await request(app)
      .get(`/api/v1/category/single-category/${createdSlug}`);
  
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.category).not.toBeNull();
    expect(getRes.body.category.name).toBe("Home & Garden");
    expect(getRes.body.category.slug).toBe(createdSlug);
    expect(getRes.body.category._id).toBe(createRes.body.category._id);
  });
});