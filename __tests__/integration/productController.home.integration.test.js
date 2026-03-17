/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  getProductController,
  productFiltersController,
  productCountController,
  productListController
} from "../../controllers/productController.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";

describe("Integration Tests for Product Controllers (related to Home Page)", () => {
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
  // 1. getProductController
  // ============================================================
  describe("getProductController function integration with mongo server", () => {
    it("should fetch all products successfully", async () => {
      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("All products fetched successfully");
      expect(sentData.total).toBe(3);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");

      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productSlugs).toContain("hunger-games-book");

      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
      expect(productPrices).toContain(15.99);
    });

    it("should return successfully even if no products", async () => {
      await productModel.deleteMany({});
      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("All products fetched successfully");
      expect(sentData.total).toBe(0);
    });

    it("should handle errors when MongoDB has errors", async () => {
      await mongoose.disconnect();
      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Error while getting all products");

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ============================================================
  // 2. productFiltersController
  // ============================================================
  describe("productFilterController function integration with mongo server", () => {
    // ----- Filter query args -----
    it("should successfully filter by category (checked non-empty)", async () => {
      req.body = { checked: [phones_category._id], radio: [], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(2);

      // Check products
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

    it("should successfully filter by multiple categories (checked non-empty and > 1)", async () => {
      req.body = { checked: [phones_category._id, books_category._id], radio: [], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(3);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");

      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productSlugs).toContain("hunger-games-book");

      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
      expect(productPrices).toContain(15.99);
    });

    it("should successfully filter by price range (radio non-empty)", async () => {
      req.body = { checked: [], radio: [0, 19], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(1);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("Hunger Games Book");
      expect(productSlugs).toContain("hunger-games-book");
      expect(productPrices).toContain(15.99);
    });

    it("should successfully filter by upper price range (radio non-empty + radio[1] is Infinity)", async () => {
      req.body = { checked: [], radio: [100, null], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(2);

      // Check products
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

    it("should successfully filter by both category and price (checked + radio non-empty)", async () => {
      req.body = { checked: [phones_category._id], radio: [1000, null], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(1);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productPrices).toContain(3000);
    });

    it("should successfully return all products when no filter (checked + radio empty)", async () => {
      req.body = { checked: [], radio: [], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(3);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");

      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productSlugs).toContain("hunger-games-book");

      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
      expect(productPrices).toContain(15.99);
    });

    it("should successfully return even if no filtered products found", async () => {
      req.body = { checked: [phones_category._id], radio: [5000, null], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(0);
    });

    // ----- Pagination -----
    it("should skip 6 products when page 2 is requested", async () => {
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

      req.body = { checked: [phones_category._id, books_category._id], radio: [], page: 2 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(7);
      expect(sentData.products.length).toBe(1); // can't check exact since createdAt timing is not known
    });

    it("should default to page 1 when page is not provided", async () => {
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

      req.body = { checked: [phones_category._id, books_category._id], radio: [] };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Filtered products successfully");
      expect(sentData.total).toBe(7);
      expect(sentData.products.length).toBe(6); // can't check exact since createdAt timing is not known
    });

    // ----- Error Handling -----
    it("should handle errors when MongoDB has errors", async () => {
      await mongoose.disconnect();

      req.body = { checked: [phones_category._id], radio: [], page: 1 };
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Error while filtering products");

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ============================================================
  // 3. productCountController
  // ============================================================
  describe("productCountController function integration with mongo server", () => {
    it("should successfully return total count", async () => {
      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Counted products successfully");
      expect(sentData.total).toBe(3);
    });

    it("should successfully return total count even if empty", async () => {
      await productModel.deleteMany({});
      
      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("Counted products successfully");
      expect(sentData.total).toBe(0);
    });

    it("should handle errors when MongoDB has errors", async () => {
      await mongoose.disconnect();
      
      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Error in counting products");

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  // ============================================================
  // 4. productListController
  // ============================================================
  describe("productListController function integration with mongo server", () => {
    it("should successfully return product list (page 1)", async () => {
      req.params.page = 1;
      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("List products per page successfully");
      expect(sentData.products.length).toBe(3);

      // Check products
      const productNames = sentData.products.map(p => p.name);
      const productSlugs = sentData.products.map(p => p.slug);
      const productPrices = sentData.products.map(p => p.price);

      expect(productNames).toContain("iPhone 15");
      expect(productNames).toContain("iPhone 17 Pro Max");
      expect(productNames).toContain("Hunger Games Book");

      expect(productSlugs).toContain("iphone-15");
      expect(productSlugs).toContain("iphone-17-pro-max");
      expect(productSlugs).toContain("hunger-games-book");

      expect(productPrices).toContain(999);
      expect(productPrices).toContain(3000);
      expect(productPrices).toContain(15.99);
    });

    it("should successfully return product list (skip 6 products since page 2)", async () => {
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

      req.params.page = 2;
      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("List products per page successfully");
      expect(sentData.products.length).toBe(1); // can't check exact since createdAt timing is not known
    });

    it("should successfully return product list (default to page 1 if page missing)", async () => {
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

      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("List products per page successfully");
      expect(sentData.products.length).toBe(6); // can't check exact since createdAt timing is not known
    });

    it("should successfully return empty product list when page is above total count", async () => {
      req.params.page = 100;
      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe("List products per page successfully");
      expect(sentData.products.length).toBe(0);
    });

    it("should handle errors when MongoDB has errors", async () => {
      await mongoose.disconnect();

      req.params.page = 1;
      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe("Error in listing products per page");

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });
});