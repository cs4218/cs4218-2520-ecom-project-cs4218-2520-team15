/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import request from 'supertest';
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../server.js';
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";


describe("Integration Tests for Home & Filter Products (API calls)", () => {
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
  // 1. GET /api/v1/product/get-product (get all products)
  // ============================================================
  describe("Tests for GET /api/v1/product/get-product/ (get all products)", () => {
    it("should return 200 and fetch all products successfully", async () => {
      const res = await request(app).get(`/api/v1/product/get-product`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("All products fetched successfully");
      expect(res.body.total).toBe(3);
      expect(res.body.products.length).toBe(3);
      const productNames = res.body.products.map(p => p.name)
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/get-product`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting all products");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 2. POST /api/v1/product/product-filters (filter products)
  // ============================================================
  describe("Tests for POST /api/v1/product/product-filters (filter products)", () => {
    it("should return 200 and filter products by both category and price range successfully", async () => {
      const res = await request(app)
        .post(`/api/v1/product/product-filters`)
        .send({
          checked: [books_category._id],
          radio: [0, 19],
          page: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Filtered products successfully");
      expect(res.body.total).toBe(1);
      expect(res.body.products.length).toBe(1);
      const productNames = res.body.products.map(p => p.name);
      expect(productNames).toContain("Hunger Games Book");
    });

    it("should return 200 and filter products by both category and upper price range successfully", async () => {
      const res = await request(app)
        .post(`/api/v1/product/product-filters`)
        .send({
          checked: [phones_category._id],
          radio: [1000, null],
          page: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Filtered products successfully");
      expect(res.body.total).toBe(1);
      expect(res.body.products.length).toBe(1);
      const productNames = res.body.products.map(p => p.name);
      expect(productNames).toContain("iPhone 17 Pro Max");
    });

    it("should return 200 and filter products for page 2 successfully", async () => {
      // Add 4 new products (so total have 7 products in mongo server)
      await productModel({
        name: "Book One",
        slug: "book-one",
        description: "Book one",
        price: 12.50,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-one"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Two",
        slug: "book-two",
        description: "Book two",
        price: 19,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-two"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Three",
        slug: "book-three",
        description: "Book three",
        price: 9.99,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-three"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Four",
        slug: "book-four",
        description: "Book four",
        price: 4.99,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-three"), 
          contentType: "image/png" 
        }
      }).save()

      const res = await request(app)
        .post(`/api/v1/product/product-filters`)
        .send({
          checked: [phones_category._id, books_category._id],
          radio: [],
          page: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Filtered products successfully");
      expect(res.body.total).toBe(7);
      expect(res.body.products.length).toBe(1); // can't check exact since createdAt timing is not known
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app)
          .post(`/api/v1/product/product-filters`)
          .send({
            checked: [phones_category._id],
            radio: [1000, null],
            page: 1
          });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while filtering products");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 3. GET /api/v1/product/product-count (product count)
  // ============================================================
  describe("Tests for GET /api/v1/product/product-count (product count)", () => {
    it("should return 200 and get total product count", async () => {
      const res = await request(app).get(`/api/v1/product/product-count`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Counted products successfully");
      expect(res.body.total).toBe(3);
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/product-count`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error in counting products");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 4. GET /api/v1/product/product-list/:page (product per page)
  // ============================================================
  describe("Tests for GET /api/v1/product/product-list/:page (product per page)", () => {
    it("should return 200 and list products on page 1", async () => {
      const res = await request(app).get(`/api/v1/product/product-list/1`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("List products per page successfully");
      expect(res.body.products.length).toBe(3);
      const productNames = res.body.products.map(p => p.name);
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");
    });

    it("should return 200 and list products on page 2", async () => {
      // Add 4 new products (so total have 7 products in mongo server)
      await productModel({
        name: "Book One",
        slug: "book-one",
        description: "Book one",
        price: 12.50,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-one"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Two",
        slug: "book-two",
        description: "Book two",
        price: 19,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-two"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Three",
        slug: "book-three",
        description: "Book three",
        price: 9.99,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-three"), 
          contentType: "image/png" 
        }
      }).save()

      await productModel({
        name: "Book Four",
        slug: "book-four",
        description: "Book four",
        price: 4.99,
        category: books_category._id,
        quantity: 20,
        photo: { 
          data: Buffer.from("fake-image-book-three"), 
          contentType: "image/png" 
        }
      }).save()

      const res = await request(app).get(`/api/v1/product/product-list/2`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("List products per page successfully");
      expect(res.body.products.length).toBe(1);
    });

    it("should return 500 when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        const res = await request(app).get(`/api/v1/product/product-list/1`);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error in listing products per page");
      } finally {
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });
});