/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";

// Mock braintree before importing the controller
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn(),
  Environment: {
    Sandbox: "sandbox",
  },
}));

import {
  getSingleProductController,
  productPhotoController,
  relatedProductController,
  productCategoryController
} from "../../../controllers/productController.js";

// Mocking the Mongoose Model
jest.mock("../../../models/productModel.js");
jest.mock("../../../models/categoryModel.js");

describe("Product Controller Unit Tests (related to Product View)", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Silence console.log statements during test run
    jest.spyOn(console, "log").mockImplementation(() => {});

    req = { params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      set: jest.fn(),
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  // 1. getSingleProductController
  // ============================================================
  it("should fetch a single product successfully", async () => {
    // Arrange
    const mockProduct = { 
      name: "Test Product", 
      slug: "test-product",
      category: { name: "Test Category" } 
    };

    const selectMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockResolvedValue(mockProduct);

    productModel.findOne.mockReturnValue({
      select: selectMock,
      populate: populateMock,
    });

    req.params.slug = "test-product";

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(populateMock).toHaveBeenCalledWith("category");
    
    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Single product fetched successfully");
    expect(sentData.product).toEqual(mockProduct);
  });

  it("should handle error when product is not found", async () => {
    // Arrange
    const selectMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockResolvedValue(null);
    
    productModel.findOne.mockReturnValue({
      select: selectMock,
      populate: populateMock,
    });

    req.params.slug = "non-existent-product";

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "non-existent-product" });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(404);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Product not found");
  });

  it("should handle errors in fetching a single product", async () => {
    // Arrange
    const mockError = new Error("Database error");

    const selectMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockRejectedValue(mockError);
    
    productModel.findOne.mockReturnValue({
      select: selectMock,
      populate: populateMock,
    });

    req.params.slug = "test-product";

    // Act
    await getSingleProductController(req, res);
    
    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(500);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error while getting single product");
  });

  // ============================================================
  // 2. productPhotoController
  // ============================================================
  it("should fetch product photo successfully", async () => {
    // Arrange
    const mockPhotoData = Buffer.from("mock photo data");
    const mockContentType = "image/png";
  
    const selectMock = jest.fn().mockReturnValue({
      photo: {
        data: mockPhotoData,
        contentType: mockContentType,
      },
    });

    productModel.findById.mockReturnValue({
      select: selectMock,
    });

    req.params.pid = "123";

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(selectMock).toHaveBeenCalledWith("photo");

    expect(res.set).toHaveBeenCalledWith("Content-type", mockContentType);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(mockPhotoData);
  });

  it("should handle error when product is missing", async () => {
    // Arrange
    const selectMock = jest.fn().mockReturnValue(null);

    productModel.findById.mockReturnValue({
      select: selectMock,
    });

    req.params.pid = "123";

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(selectMock).toHaveBeenCalledWith("photo");

    expect(res.status).toHaveBeenCalledWith(404);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Product not found");
  });

  it("should handle error when photo is missing", async () => {
    // Arrange
    const selectMock = jest.fn().mockReturnValue({
      photo: null,
    });

    productModel.findById.mockReturnValue({
      select: selectMock,
    });

    req.params.pid = "123";

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(selectMock).toHaveBeenCalledWith("photo");

    expect(res.status).toHaveBeenCalledWith(404);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Photo not found");
  });

  it("should handle errors in fetching photo", async () => {
    // Arrange
    const mockError = new Error("Database error");

    const selectMock = jest.fn().mockRejectedValue(mockError);

    productModel.findById.mockReturnValue({
      select: selectMock,
    });

    req.params.pid = "123";

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(selectMock).toHaveBeenCalledWith("photo");

    expect(res.status).toHaveBeenCalledWith(500);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error while getting photo");
  });

  // ============================================================
  // 3. relatedProductController
  // ============================================================
  it("should fetch related products successfully", async () => {
    // Arrange
    const mockProducts = [
      { name: "Related Product 1" },
      { name: "Related Product 2" },
    ];

    const selectMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockResolvedValue(mockProducts);

    productModel.find.mockReturnValue({
      select: selectMock,
      limit: limitMock,
      populate: populateMock,
    });

    req.params = { pid: "123", cid: "456" };

    // Act
    await relatedProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: "456",
      _id: { $ne: "123" },
    });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Related products fetched successfully");
    expect(sentData.products).toEqual(mockProducts);
  });

  it("should have no error when no related products are found", async () => {
    // Arrange
    const selectMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockResolvedValue([]);

    productModel.find.mockReturnValue({
      select: selectMock,
      limit: limitMock,
      populate: populateMock,
    });

    req.params = { pid: "123", cid: "456" };

    // Act
    await relatedProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: "456",
      _id: { $ne: "123" },
    });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Related products fetched successfully");
  });

  it("should handle errors in fetching related products", async () => {
    // Arrange
    const mockError = new Error("Database error");

    const selectMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockRejectedValue(mockError);

    productModel.find.mockReturnValue({
      select: selectMock,
      limit: limitMock,
      populate: populateMock,
    });

    req.params = { pid: "123", cid: "456" };

    // Act
    await relatedProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: "456",
      _id: { $ne: "123" },
    });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(500);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error while getting related products");
  });

  // ============================================================
  // 4. productCategoryController
  // ============================================================
  it("should fetch products by category successfully with pagination", async () => {
    // Arrange
    const mockCategory = { _id: "456", name: "Test Category", slug: "test-category" };
    const mockProducts = [
      { name: "Product 1", category: mockCategory },
      { name: "Product 2", category: mockCategory },
      { name: "Product 3", category: mockCategory },
    ];

    const selectMock = jest.fn();
    const skipMock = jest.fn();
    const limitMock = jest.fn();
    const populateMock = jest.fn();
    const sortMock = jest.fn().mockResolvedValue(mockProducts);

    const mockChain = {
      select: selectMock,
      skip: skipMock,
      limit: limitMock,
      populate: populateMock,
      sort: sortMock,
    };

    selectMock.mockReturnValue(mockChain);
    skipMock.mockReturnValue(mockChain);
    limitMock.mockReturnValue(mockChain);
    populateMock.mockReturnValue(mockChain);

    categoryModel.findOne.mockResolvedValue(mockCategory);
    productModel.find.mockReturnValue(mockChain);
    productModel.countDocuments.mockResolvedValue(10);

    req.params = { slug: "test-category", page: "1" };

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "test-category" });
    expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(productModel.countDocuments).toHaveBeenCalledWith({ category: mockCategory });
    
    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Products by category fetched successfully");
    expect(sentData.category).toEqual(mockCategory);
    expect(sentData.products).toEqual(mockProducts);
    expect(sentData.total).toBe(10);
  });

  it("should fetch products with correct pagination offset for page 2", async () => {
    // Arrange
    const mockCategory = { _id: "456", name: "Test Category", slug: "test-category" };
    const mockProducts = [
      { name: "Product 4", category: mockCategory },
      { name: "Product 5", category: mockCategory },
    ];

    const selectMock = jest.fn();
    const skipMock = jest.fn();
    const limitMock = jest.fn();
    const populateMock = jest.fn();
    const sortMock = jest.fn().mockResolvedValue(mockProducts);

    const mockChain = {
      select: selectMock,
      skip: skipMock,
      limit: limitMock,
      populate: populateMock,
      sort: sortMock,
    };

    selectMock.mockReturnValue(mockChain);
    skipMock.mockReturnValue(mockChain);
    limitMock.mockReturnValue(mockChain);
    populateMock.mockReturnValue(mockChain);

    categoryModel.findOne.mockResolvedValue(mockCategory);
    productModel.find.mockReturnValue(mockChain);
    productModel.countDocuments.mockResolvedValue(10);

    req.params = { slug: "test-category", page: "2" };

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(skipMock).toHaveBeenCalledWith(3);
    expect(limitMock).toHaveBeenCalledWith(3);
    
    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.total).toBe(10);
  });

  it("should handle error when no category is found", async () => {
    // Arrange
    categoryModel.findOne.mockResolvedValue(null);
    
    req.params.slug = "non-existent-category";

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "non-existent-category" });

    expect(res.status).toHaveBeenCalledWith(404);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Category not found");
  });

  it("should have no error when no products in category are found on page 1", async () => {
    // Arrange
    const mockCategory = { _id: "456", name: "Test Category", slug: "test-category" };

    const selectMock = jest.fn();
    const skipMock = jest.fn();
    const limitMock = jest.fn();
    const populateMock = jest.fn();
    const sortMock = jest.fn().mockResolvedValue([]);

    const mockChain = {
      select: selectMock,
      skip: skipMock,
      limit: limitMock,
      populate: populateMock,
      sort: sortMock,
    };

    selectMock.mockReturnValue(mockChain);
    skipMock.mockReturnValue(mockChain);
    limitMock.mockReturnValue(mockChain);
    populateMock.mockReturnValue(mockChain);

    categoryModel.findOne.mockResolvedValue(mockCategory);
    productModel.find.mockReturnValue(mockChain);
    productModel.countDocuments.mockResolvedValue(0);

    req.params = { slug: "test-category" };

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.message).toBe("Products by category fetched successfully");
  });

  it("should return empty products for page beyond available pages", async () => {
    // Arrange
    const mockCategory = { _id: "456", name: "Test Category", slug: "test-category" };

    const selectMock = jest.fn();
    const skipMock = jest.fn();
    const limitMock = jest.fn();
    const populateMock = jest.fn();
    const sortMock = jest.fn().mockResolvedValue([]);

    const mockChain = {
      select: selectMock,
      skip: skipMock,
      limit: limitMock,
      populate: populateMock,
      sort: sortMock,
    };

    selectMock.mockReturnValue(mockChain);
    skipMock.mockReturnValue(mockChain);
    limitMock.mockReturnValue(mockChain);
    populateMock.mockReturnValue(mockChain);

    categoryModel.findOne.mockResolvedValue(mockCategory);
    productModel.find.mockReturnValue(mockChain);
    productModel.countDocuments.mockResolvedValue(5);

    req.params = { slug: "test-category", page: "5" };

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(true);
    expect(sentData.products).toEqual([]);
  });

  it("should handle errors in fetching products by category (category)", async () => {
    // Arrange
    const mockError = new Error("Database error");

    categoryModel.findOne.mockRejectedValue(mockError);

    req.params.slug = "test-category";

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "test-category" });
    expect(res.status).toHaveBeenCalledWith(400);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error while getting products by category");
  });

  it("should handle errors in fetching products by category (product)", async () => {
    // Arrange
    const mockError = new Error("Database error");

    const selectMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const sortMock = jest.fn().mockRejectedValue(mockError);

    categoryModel.findOne.mockResolvedValue({ _id: "456", name: "Test Category", slug: "test-category" });
    productModel.find.mockReturnValue({
      select: selectMock,
      skip: skipMock,
      limit: limitMock,
      populate: jest.fn().mockReturnThis(),
      sort: sortMock,
    });

    req.params = { slug: "test-category", page: "1" };

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    const sentData = res.send.mock.calls[0][0];
    expect(sentData.success).toBe(false);
    expect(sentData.message).toBe("Error while getting products by category");
  });
});
