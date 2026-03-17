/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import request from 'supertest';
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../server.js';
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";


describe("Integration Tests for Viewing Product Details & Category Product (API calls)", () => {
  let mongoServer;
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
  // 1. GET /api/v1/product/get-product/:slug (get a single product)
  // ============================================================
  describe("Tests for GET /api/v1/product/get-product/:slug (get a single product)", () => {
    it("should return 200 and fetch single product successfully", async () => {
      const res = await request(app).get(`/api/v1/product/get-product/${mock_product0.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Single product fetched successfully");
      expect(res.body.product).toMatchObject({
        name: mock_product0.name,
        slug: mock_product0.slug,
        description: mock_product0.description,
        price: mock_product0.price
      });
    });

    it("should return 404 when product not found", async () => {
      const res = await request(app).get(`/api/v1/product/get-product/non-existent`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Product not found");
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/get-product/${mock_product0.slug}`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting single product");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 2. GET /api/v1/product/product-photo/:pid (get product photo)
  // ============================================================
  describe("Tests for GET /api/v1/product/product-photo/:pid (get product photo)", () => {
    it("should return 200 and fetch product photo successfully", async () => {
      const res = await request(app).get(`/api/v1/product/product-photo/${mock_product0._id}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe(mock_product0.photo.contentType);
      expect(res.body).toEqual(Buffer.from(mock_product0.photo.data));

    });

    it("should return 404 when product not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/product/product-photo/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Product not found");
    });

    it("should return 404 when photo not found", async () => {
      await productModel.updateOne(
        { _id: mock_product0._id },
        { $unset: { "photo.data": 1 } }
      );
      const res = await request(app).get(`/api/v1/product/product-photo/${mock_product0._id}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Photo not found");
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/product-photo/${mock_product0._id}`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting photo");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 3. GET /api/v1/product/related-product/:pid/:cid (get related products)
  // ============================================================
  describe("Tests for GET /api/v1/product/related-product/:pid/:cid (get related products)", () => {
    it("should return 200 and fetch related products successfully", async () => {
      const res = await request(app).get(`/api/v1/product/related-product/${mock_product0._id}/${phones_category._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Related products fetched successfully");
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0]).toMatchObject({
        name: mock_product1.name,
        slug: mock_product1.slug,
        description: mock_product1.description,
        price: mock_product1.price
      });
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/related-product/${mock_product0._id}/${phones_category._id}`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting related products");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 4. GET /api/v1/product/product-category/:slug/:page (get category wise product)
  // ============================================================
  describe("Tests for GET /api/v1/product/product-category/:slug/:page (get category wise product)", () => {
    it("should return 200 and fetch category products successfully", async () => {
      const res = await request(app).get(`/api/v1/product/product-category/${phones_category.slug}/${1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Products by category fetched successfully");
      
      expect(res.body.category).toMatchObject({
        slug: phones_category.slug,
        name: phones_category.name
      })

      expect(res.body.products.length).toBe(2);
      const productNames = res.body.products.map(p => p.name);
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(res.body.total).toBe(2);
    });

    it("should return 404 when category not found", async () => {
      const res = await request(app).get(`/api/v1/product/product-category/non-existent/${1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Category not found");
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/product-category/${phones_category.slug}/${1}`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting products by category");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });
});