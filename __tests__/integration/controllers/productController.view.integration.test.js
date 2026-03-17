/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
    getSingleProductController,
    productPhotoController,
    relatedProductController,
    productCategoryController
} from "../../../controllers/productController.js";
import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";

describe("Integration Tests for Viewing Product Details (Single + Category)", () => {
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

    // Mock request and respond for controllers
    req = { params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      set: jest.fn(),
    };
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
  // 1. getSingleProductController
  // ============================================================
  describe("getSingleProductController function integration with mongo server", () => {
    it("should fetch a single product successfully", async () => {
      req.params.slug = "iphone-15";
      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Single product fetched successfully");
      // should no longer have photo field
      expect(sentData.product).toMatchObject({
        name: "iPhone 15",
        slug: "iphone-15",
        description: "Brand new iPhone 15",
        price: 999,
        quantity: 5
      });
      // should populate category field
      expect(sentData.product.category).toMatchObject({
        name: "Phones",
        slug: "phones"
      });
    });

    it("should handle error when product is not found", async () => {
      req.params.slug = "non-existent-product";
      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Product not found");
    });

    it("should handle errors when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        req.params.slug = "iphone-15";
        await getSingleProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const sentData = res.send.mock.calls[0][0];
        expect(sentData.success).toBe(false);
        expect(sentData.message).toBe("Error while getting single product");
      } finally {
        // Reconnect for other tests
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 2. productPhotoController
  // ============================================================
  describe("productPhotoController function integration with mongo server", () => {
    it("should fetch product photo successfully", async () => {
      req.params.pid = mock_product0._id;
      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
      expect(res.send).toHaveBeenCalledWith(mock_product0.photo.data);
    });

    it("should handle error when product is missing", async () => {
      req.params.pid = new mongoose.Types.ObjectId();
      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Product not found");
    });

    it("should handle error when photo is missing", async () => {
      req.params.pid = mock_product0._id;

      // unlikely to happen but purposely remove photo data for testing
      await productModel.updateOne(
        { _id: mock_product0._id },
        { $unset: { "photo.data": 1 } }  // remove the required field
      );

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Photo not found");
    });

    it("should handle errors when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        req.params.pid = mock_product0._id;
        await productPhotoController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const sentData = res.send.mock.calls[0][0];
        expect(sentData.success).toBe(false);
        expect(sentData.message).toBe("Error while getting photo");
      } finally {
        // Reconnect for other tests
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 3. relatedProductController
  // ============================================================
  describe("relatedProductController function integration with mongo server", () => {
    it("should fetch related products successfully", async () => {
      req.params = {
        pid: mock_product0._id,
        cid: mock_product0.category._id
      };
      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Related products fetched successfully");
      expect(sentData.products).toHaveLength(1);
      // should no longer have photo field
      expect(sentData.products[0]).toMatchObject({
        name: "iPhone 17 Pro Max",
        slug: "iphone-17-pro-max",
        description: "Brand new iPhone 17 Pro Max (are you open-minded?)",
        price: 3000,
        quantity: 50,
      });
      // should populate category field
      expect(sentData.products[0].category).toMatchObject({
        name: "Phones",
        slug: "phones"
      });
    });

    it("should have no error when no related products are found", async () => {
      req.params = {
        pid: mock_product2._id,
        cid: mock_product2.category._id
      };
      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Related products fetched successfully");
      expect(sentData.products).toHaveLength(0);
    });

    it("should handle errors when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        req.params = {
          pid: mock_product2._id,
          cid: mock_product2.category._id
        };
        await relatedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const sentData = res.send.mock.calls[0][0];
        expect(sentData.success).toBe(false);
        expect(sentData.message).toBe("Error while getting related products");
      } finally {
        // Reconnect for other tests
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });

  // ============================================================
  // 4. productCategoryController
  // ============================================================
  describe("productCategoryController function integration with mongo server", () => {
    it("should fetch products by category successfully with pagination", async () => {
      req.params = { slug: "phones", page: "1" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Products by category fetched successfully");
      expect(sentData.category.name).toBe("Phones");
      expect(sentData.category.slug).toBe("phones");
      // should return up to 3 products per page
      expect(sentData.products).toHaveLength(2);
      expect(sentData.total).toBe(2);
      
      // Check products exist without caring about order (since mock products created asynchronously)
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);
      
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
    });

    it("should default to page 1 when page parameter is not found", async () => {
      req.params = { slug: "phones" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Products by category fetched successfully");
      expect(sentData.category.name).toBe("Phones");
      expect(sentData.category.slug).toBe("phones");
      // should return up to 3 products per page
      expect(sentData.products).toHaveLength(2);
      expect(sentData.total).toBe(2);
      
      // Check products exist without caring about order (since mock products created asynchronously)
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);
      
      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
    });

    it("should fetch products with correct pagination offset for page 2", async () => {
      // Create more products to test pagination
      await new productModel({
        name: "iPhone 16",
        slug: "iphone-16",
        description: "Brand new iPhone 16",
        price: 1200,
        category: phones_category._id,
        quantity: 10,
        photo: { 
          data: Buffer.from("fake-image-iphone16"), 
          contentType: "image/png" 
        }
      }).save();

      await new productModel({
        name: "iPhone 12",
        slug: "iphone-12",
        description: "iPhone 12",
        price: 500,
        category: phones_category._id,
        quantity: 15,
        photo: { 
          data: Buffer.from("fake-image-iphone12"), 
          contentType: "image/png" 
        }
      }).save();

      req.params = { slug: "phones", page: "2" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      // page 2 should skip first 3 products and get the next batch
      expect(sentData.products).toHaveLength(1);
      expect(sentData.total).toBe(4);

      // Can't check this product (since we don't know which is the oldest createdAt producrt)
    });

    it("should handle error when no category is found", async () => {
      req.params = { slug: "non-existent-category", page: "1" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Category not found");
    });

    it("should have no error when no products in category are found", async () => {
      // Add new category with no products for testing
      await new categoryModel({ name: "Clothing", slug: "clothing" }).save();
      
      req.params = { slug: "clothing", page: "1" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Products by category fetched successfully");
      expect(sentData.category.name).toBe("Clothing");
      expect(sentData.category.slug).toBe("clothing");
      expect(sentData.products).toHaveLength(0); // no products found
      expect(sentData.total).toBe(0);
    });

    it("should return empty products for page beyond available pages", async () => {
      req.params = { slug: "phones", page: "5" };
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Products by category fetched successfully");
      expect(sentData.products).toEqual([]);
      expect(sentData.total).toBe(2);
    });

    it("should handle errors when MongoDB has errors", async () => {
      try {
        await mongoose.disconnect();

        req.params = { slug: "phones", page: "1" };
        await productCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const sentData = res.send.mock.calls[0][0];
        expect(sentData.success).toBe(false);
        expect(sentData.message).toBe("Error while getting products by category");
      } finally {
        // Reconnect for other tests
        await mongoose.connect(mongoServer.getUri());
      }
    });
  });
});