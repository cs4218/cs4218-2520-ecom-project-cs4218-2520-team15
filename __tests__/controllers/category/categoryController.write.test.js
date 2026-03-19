/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "../../../controllers/categoryController";

jest.mock("../../../models/categoryModel");
jest.mock("../../../models/productModel");

jest.mock(
  "slugify",
  () => (value) => `${value.toLowerCase().trim().replace(" ", "-")}-slug`,
);

import categoryModel from "../../../models/categoryModel";
import productModel from "../../../models/productModel";

describe("createCategoryController function", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create category correctly", async () => {
    const mockReq = { body: { name: "Category A" } };
    categoryModel.findOne.mockResolvedValueOnce(null);
    categoryModel.mockImplementation(() => ({
      save: jest.fn(() => ({
        _id: "1",
        name: "Category A",
        slug: "category-a-slug",
      })),
    }));

    await createCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "New category created",
      category: {
        _id: "1",
        name: "Category A",
        slug: "category-a-slug",
      },
    });
  });

  it("should return error if missing fields", async () => {
    const mockReq = { body: { name: "" } };

    await createCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  it("should return error if category already exists", async () => {
    const mockReq = { body: { name: "Category A" } };
    categoryModel.findOne.mockResolvedValueOnce({
      _id: "1",
      name: "Category A",
      slug: "category-a-slug",
    });

    await createCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Category already exists",
    });
  });

  it("should return error if server issues", async () => {
    const mockReq = { body: { name: "Category A" } };
    categoryModel.findOne.mockResolvedValueOnce(null);
    categoryModel.mockImplementation(() => ({
      save: jest.fn(() => {
        throw new Error("DB error");
      }),
    }));

    await createCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: new Error("DB error"),
      message: "Error in creating category",
    });
  });
});

describe("updateCategoryController function", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update category correctly", async () => {
    const mockReq = { params: { id: "1" }, body: { name: "Category A" } };
    categoryModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: "1",
      name: "Category A",
      slug: "category-a-slug",
    });

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category updated successfully",
      category: {
        _id: "1",
        name: "Category A",
        slug: "category-a-slug",
      },
    });
  });

  it("should return error if missing fields", async () => {
    const mockReq = { params: { id: "1" }, body: { name: "" } };

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  it("should return error if category not found", async () => {
    const mockReq = { params: { id: "1" }, body: { name: "Category A" } };
    categoryModel.findByIdAndUpdate.mockResolvedValueOnce(null);

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Category does not exist",
    });
  });

  it("should return error if server issues", async () => {
    const mockReq = { params: { id: "1" }, body: { name: "Category A" } };
    categoryModel.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: new Error("DB error"),
      message: "Error in updating category",
    });
  });
});

describe("deleteCategoryController function", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should delete category correctly", async () => {
    const mockReq = { params: { id: "1" } };
    productModel.countDocuments.mockResolvedValueOnce(0);
    categoryModel.findByIdAndDelete.mockResolvedValueOnce({
      _id: "1",
      name: "Category A",
      slug: "category-a-slug",
    });

    await deleteCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category deleted successfully",
    });
  });

  it("should return ok if category does not exist", async () => {
    const mockReq = { params: { id: "1" } };
    productModel.countDocuments.mockResolvedValueOnce(0);
    categoryModel.findByIdAndDelete.mockResolvedValueOnce(null);

    await deleteCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category deleted successfully",
    });
  });

  it("should return error if category has products", async () => {
    const mockReq = { params: { id: "1" } };
    productModel.countDocuments.mockResolvedValueOnce(3);

    await deleteCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Unable to delete category that contains products",
    });
    expect(categoryModel.findByIdAndDelete).toHaveBeenCalledTimes(0);
  });

  it("should return error if server issues", async () => {
    const mockReq = { params: { id: "1" } };
    productModel.countDocuments.mockResolvedValueOnce(0);
    categoryModel.findByIdAndDelete.mockRejectedValue(new Error("DB error"));

    await deleteCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: new Error("DB error"),
      message: "Error in deleting category",
    });
  });
});
