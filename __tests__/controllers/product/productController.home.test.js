/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import productModel from "../../../models/productModel.js";

// Mock braintree before importing the controller
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn(),
  Environment: {
    Sandbox: "sandbox",
  },
}));

import {
  getProductController,
  productFiltersController,
  productCountController,
  productListController
} from "../../../controllers/productController.js";

// Mocking the Mongoose Model
jest.mock("../../../models/productModel.js");

describe("Product Controller Unit Tests (related to Product View)", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Silence console.log statements during test run
    jest.spyOn(console, "log").mockImplementation(() => {});

    req = { params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  // 1. getProductController
  // ============================================================
  describe("getProductController", () => {
    const mockProducts = [
      { _id: "1", name: "Product A", category: { name: "Cat A" }, price: 10 },
      { _id: "2", name: "Product B", category: { name: "Cat B" }, price: 20 },
    ];

    it("should return 200 with all products on success", async () => {
      // Arrange
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: mockProducts,
        })
      );
    });

    it("should return the correct total count of products", async () => {
      // Arrange
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: mockProducts.length })
      );
    });

    it("should return an empty products array when no products exist", async () => {
      // Arrange
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: [], total: 0 })
      );
    });

    it("should exclude photo field from returned products", async () => {
      // Arrange
      const selectMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: selectMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(selectMock).toHaveBeenCalledWith("-photo");
    });

    it("should sort products by createdAt in descending order", async () => {
      // Arrange
      const sortMock = jest.fn().mockResolvedValue(mockProducts);
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: sortMock,
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it("should return 500 with error message when database query fails", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should include the error message in the response when database query fails", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: dbError.message })
      );
    });

    it("should populate the category field on each product", async () => {
      // Arrange
      const populateMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        populate: populateMock,
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await getProductController(req, res);

      // Assert
      expect(populateMock).toHaveBeenCalledWith("category");
    });
  });

  // ============================================================
  // 2. productFiltersController
  // ============================================================
  describe("productFiltersController", () => {
    const mockFilteredProducts = [
      { _id: "1", name: "Product A", price: 50 },
      { _id: "2", name: "Product B", price: 80 },
    ];

    const mockFilterQuery = (products = mockFilteredProducts, total = 10) => {
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(products),
      });
      productModel.countDocuments.mockResolvedValue(total);
    };

    // ----- Filter query args -----

    it("should query with category filter when checked array is non-empty", async () => {
      // Arrange
      req.body = { checked: ["cat1", "cat2"], radio: [], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: ["cat1", "cat2"] })
      );
    });

    it("should query with price range filter when radio array is non-empty", async () => {
      // Arrange
      req.body = { checked: [], radio: [20, 200], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ price: { $gte: 20, $lte: 200 } })
      );
    });

    it("should query with price upper range filter when radio array is non-empty and radio[1] is Infinity", async () => {
      // Arrange
      req.body = { checked: [], radio: [100, null], page: 1 }; // JSON serialization changes Infinity to null
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ price: { $gte: 100 } })
      );
    });

    it("should not include category key in query when checked array is empty", async () => {
      // Arrange
      req.body = { checked: [], radio: [10, 100], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      const callArgs = productModel.find.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("category");
    });

    it("should not include price key in query when radio array is empty", async () => {
      // Arrange
      req.body = { checked: ["cat1"], radio: [], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      const callArgs = productModel.find.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("price");
    });

    it("should query with an empty args object when both checked and radio are empty", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
    });

    it("should pass the same filter args to both find and countDocuments", async () => {
      // Arrange
      req.body = { checked: ["cat1"], radio: [10, 100], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert — both calls must receive identical filter args so the count matches the query
      const findArgs = productModel.find.mock.calls[0][0];
      const countArgs = productModel.countDocuments.mock.calls[0][0];
      expect(findArgs).toEqual(countArgs);
    });

    // ----- Pagination (skip) -----

    it("should skip 0 products when page 1 is requested", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 1 };
      const skipMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: skipMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(skipMock).toHaveBeenCalledWith(0);
    });

    it("should skip 6 products when page 2 is requested", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 2 };
      const skipMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: skipMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert — perPage=6, page=2 → skip (2-1)*6 = 6
      expect(skipMock).toHaveBeenCalledWith(6);
    });

    it("should default to page 1 (skip 0) when page is not provided in the request body", async () => {
      // Arrange — no page property sent
      req.body = { checked: [], radio: [] };
      const skipMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: skipMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(skipMock).toHaveBeenCalledWith(0);
    });

    // ----- Pagination (limit) -----

    it("should limit results to 6 products per page", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 1 };
      const limitMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: limitMock,
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(limitMock).toHaveBeenCalledWith(6);
    });

    // ----- Query chain -----

    it("should exclude the photo field from results", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 1 };
      const selectMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: selectMock,
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(selectMock).toHaveBeenCalledWith("-photo");
    });

    it("should sort filtered results by createdAt in descending order", async () => {
      // Arrange
      req.body = { checked: [], radio: [], page: 1 };
      const sortMock = jest.fn().mockResolvedValue(mockFilteredProducts);
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: sortMock,
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    // ----- Response shape -----

    it("should return 200 with filtered products on success", async () => {
      // Arrange
      req.body = { checked: ["cat1"], radio: [10, 100], page: 1 };
      mockFilterQuery();

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, products: mockFilteredProducts })
      );
    });

    it("should return the total from countDocuments (not products.length) in the response", async () => {
      // Arrange — countDocuments returns 20 even though only 2 products are on this page
      req.body = { checked: ["cat1"], radio: [], page: 1 };
      mockFilterQuery(mockFilteredProducts, 20);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: 20 })
      );
    });

    it("should return empty products array and total 0 when no products match the filter", async () => {
      // Arrange
      req.body = { checked: ["nonexistent-cat"], radio: [9999, 99999], page: 1 };
      mockFilterQuery([], 0);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: [], total: 0 })
      );
    });

    // ----- Error handling -----

    it("should return 500 with success false when the find query fails", async () => {
      // Arrange
      const dbError = new Error("DB error");
      req.body = { checked: ["cat1"], radio: [10, 100], page: 1 };
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should return 500 with success false when countDocuments fails", async () => {
      // Arrange
      const dbError = new Error("Count failed");
      req.body = { checked: ["cat1"], radio: [], page: 1 };
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFilteredProducts),
      });
      productModel.countDocuments.mockRejectedValue(dbError);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should include an error object in the response when a query fails", async () => {
      // Arrange
      const dbError = new Error("Query failed");
      req.body = { checked: ["cat1"], radio: [], page: 1 };
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });
      productModel.countDocuments.mockResolvedValue(10);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: dbError })
      );
    });
  });

  // ============================================================
  // 3. productCountController
  // ============================================================
  describe("productCountController", () => {
    it("should return 200 with the total product count on success", async () => {
      // Arrange
      productModel.find.mockReturnValue({
        estimatedDocumentCount: jest.fn().mockResolvedValue(42),
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, total: 42 })
      );
    });

    it("should return a total of 0 when there are no products", async () => {
      // Arrange
      productModel.find.mockReturnValue({
        estimatedDocumentCount: jest.fn().mockResolvedValue(0),
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: 0 })
      );
    });

    it("should call estimatedDocumentCount on productModel.find({})", async () => {
      // Arrange
      const estimatedDocumentCountMock = jest.fn().mockResolvedValue(5);
      productModel.find.mockReturnValue({
        estimatedDocumentCount: estimatedDocumentCountMock,
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(estimatedDocumentCountMock).toHaveBeenCalled();
    });

    it("should return 500 with success false when database query fails", async () => {
      // Arrange
      const dbError = new Error("DB error");
      productModel.find.mockReturnValue({
        estimatedDocumentCount: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should include an error object in the response when database query fails", async () => {
      // Arrange
      const dbError = new Error("Connection timeout");
      productModel.find.mockReturnValue({
        estimatedDocumentCount: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: dbError })
      );
    });
  });

  // ============================================================
  // 4. productListController
  // ============================================================
  describe("productListController", () => {
    const mockProducts = [
      { _id: "1", name: "Product A" },
      { _id: "2", name: "Product B" },
    ];

    it("should return 200 with products for page 1 by default when no page param is given", async () => {
      // Arrange
      req.params = {};
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, products: mockProducts })
      );
    });

    it("should skip 0 products when page 1 is requested", async () => {
      // Arrange
      req.params = { page: 1 };
      const skipMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: skipMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(skipMock).toHaveBeenCalledWith(0);
    });

    it("should skip 6 products when page 2 is requested", async () => {
      // Arrange
      req.params = { page: 2 };
      const skipMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: skipMock,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await productListController(req, res);

      // Assert
      // perPage=6, page=2 => skip (2-1)*6 = 6
      expect(skipMock).toHaveBeenCalledWith(6);
    });

    it("should limit results to 6 products per page", async () => {
      // Arrange
      req.params = { page: 1 };
      const limitMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: limitMock,
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(limitMock).toHaveBeenCalledWith(6);
    });

    it("should exclude the photo field from results", async () => {
      // Arrange
      req.params = { page: 1 };
      const selectMock = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: selectMock,
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(selectMock).toHaveBeenCalledWith("-photo");
    });

    it("should sort products by createdAt in descending order", async () => {
      // Arrange
      req.params = { page: 1 };
      const sortMock = jest.fn().mockResolvedValue(mockProducts);
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: sortMock,
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it("should return an empty array when no products exist on the requested page", async () => {
      // Arrange
      req.params = { page: 99 };
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: [] })
      );
    });

    it("should return 500 with success false when database query fails", async () => {
      // Arrange
      const dbError = new Error("DB error");
      req.params = { page: 1 };
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should include an error object in the response when database query fails", async () => {
      // Arrange
      req.params = { page: 1 };
      const dbError = new Error("Query failed");
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await productListController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: dbError })
      );
    });
  });
});