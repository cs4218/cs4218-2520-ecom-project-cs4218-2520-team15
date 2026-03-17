/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import request from 'supertest';
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../server.js';
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";


describe("Integration Tests for Searching Product (API calls)", () => {
  let mongoServer;
  let req, res;
  let phones_category, books_category;
  let mock_product0, mock_product1, mock_product2;

  beforeAll(async () => {
    // Set up mongo server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Silence console log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(async () => {
    // Create valid categories that the products belong to
    phones_category = await new categoryModel({ name: "Phones", slug: "phones" }).save();
    books_category = await new categoryModel({ name: "Books", slug: "books" }).save();

    // Create valid products in mongo server
    mock_product0 = await new productModel({
      name: "iPhone 15",
      slug: "iphone-15",
      description: "Brand new iPhone 15",
      price: 999,
      category: phones_category._id,
      quantity: 5,
      photo: { 
        data: Buffer.from("fake-image-iphone15"), 
        contentType: "image/png" 
      }
    }).save();

    mock_product1 = await new productModel({
      name: "iPhone 17 Pro Max",
      slug: "iphone-17-pro-max",
      description: "Brand new iPhone 17 Pro Max (are you open-minded?)",
      price: 3000,
      category: phones_category._id,
      quantity: 50,
      photo: { 
        data: Buffer.from("fake-image-iphone17-pro-max"), 
        contentType: "image/png" 
      }
    }).save();

    mock_product2 = await new productModel({
      name: "Hunger Games Book",
      slug: "hunger-games-book",
      description: "Hunger Games book (touch grass and read a book)",
      price: 15.99,
      category: books_category._id,
      quantity: 20,
      photo: { 
        data: Buffer.from("fake-image-hunger-games-book"), 
        contentType: "image/png" 
      }
    }).save();

    // No need to mock requests anymore since using supertest
  });

  afterEach(async () => {
    // Clear out all the products in mongo server
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Tear down mongo server
    await mongoose.disconnect();
    await mongoServer.stop();

    // Restore all mocks
    jest.restoreAllMocks();
  });

  // ============================================================
  // GET /api/v1/product/search/:keyword (search product)
  // ============================================================
  describe("Tests for GET /api/v1/product/search/:keyword (search product)", () => {
    it("should return 200 and search product successfully", async () => {
      const res = await request(app).get(`/api/v1/product/search/phone`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Products searched successfully");
      expect(res.body.results.length).toBe(2);
      const productNames = res.body.results.map(p => p.name);
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
    });

    it("should return 400 when keyword missing or empty", async () => {
      const res = await request(app).get(`/api/v1/product/search/%20%20%20`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Search keyword is required");
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/search/phone`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error in searching for products");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });
});