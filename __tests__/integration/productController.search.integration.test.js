/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
    searchProductController
} from "../../controllers/productController.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";

describe("Integration Tests for Searching Products", () => {
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
      slug: "hunger-games-nook",
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

  it("should fetch searched products successfully", async () => {
    req.params.keyword = "phone";
    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Products searched successfully");
    expect(sentData.results).toHaveLength(2);
    
    // Check products exist without caring about order
    const productNames = sentData.results.map(p => p.name);
    const productSlugs = sentData.results.map(p => p.slug);
    const productPrices = sentData.results.map(p => p.price);
    
    expect(productNames).toContain("iPhone 15");
    expect(productNames).toContain("iPhone 17 Pro Max");
    expect(productSlugs).toContain("iphone-15");
    expect(productSlugs).toContain("iphone-17-pro-max");
    expect(productPrices).toContain(999);
    expect(productPrices).toContain(3000);
  });

  it("should return success even if no products match search", async () => {
    req.params.keyword = "unknown";
    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Products searched successfully");
    expect(sentData.results).toHaveLength(0);
  });

  it("should handle error when keyword is empty (missing keyword)", async () => {
    // missing keyword
    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Search keyword is required");
    expect(sentData.results).toHaveLength(0);
  });

  it("should handle error when keyword is empty (whitespace keyword)", async () => {
    req.params.keyword = "   "; // whitespace keyword
    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Search keyword is required");
    expect(sentData.results).toHaveLength(0);
  });

  it("should handle errors when MongoDB has errors", async () => {
    await mongoose.disconnect();

    req.params.keyword = "phone";
    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error in searching for products");

    // Reconnect for other tests
    await mongoose.connect(mongoServer.getUri());
  });
});