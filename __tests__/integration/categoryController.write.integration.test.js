/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "../../controllers/categoryController";
import categoryModel from "../../models/categoryModel";
import productModel from "../../models/productModel";

describe("createCategoryController function integration with MongoDB + Slugify", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    await new categoryModel({ name: "Category X", slug: "category-x" }).save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
    jest.clearAllMocks();
  });

  it("should create category correctly", async () => {
    const mockReq = { body: { name: "Category A" } };

    await createCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(2);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "New category created",
      category: expect.objectContaining({
        name: "Category A",
        slug: "category-a",
      }),
    });
  });

  it("should return error if missing fields", async () => {
    const mockReq = { body: { name: "" } };

    await createCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(1);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  it("should return error if category already exists", async () => {
    const mockReq = { body: { name: "Category X" } };

    await createCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Category already exists",
    });
  });

  it("should return error if MongoDB has issues", async () => {
    const mockReq = { body: { name: { value: "Category A" } } };

    await createCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(1);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in creating category",
      }),
    );
  });
});

describe("updateCategoryController function integration with MongoDB + Slugify", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  let mongoServer;
  let existingCategoryId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    const category = await new categoryModel({
      name: "Category X",
      slug: "category-x",
    }).save();
    existingCategoryId = category._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
    jest.clearAllMocks();
  });

  it("should update category correctly", async () => {
    const mockReq = {
      params: { id: existingCategoryId },
      body: { name: "Category A" },
    };

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category updated successfully",
      category: expect.objectContaining({
        _id: existingCategoryId,
        name: "Category A",
        slug: "category-a",
      }),
    });
  });

  it("should return error if missing fields", async () => {
    const mockReq = { params: { id: existingCategoryId }, body: { name: "" } };

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  it("should return error if category not found", async () => {
    const mockReq = {
      params: { id: new mongoose.Types.ObjectId() },
      body: { name: "Category A" },
    };

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Category does not exist",
    });
  });

  it("should return error if MongoDB has issues", async () => {
    const mockReq = {
      params: { id: existingCategoryId },
      body: { name: { value: "Category A" } },
    };

    await updateCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in updating category",
      }),
    );
  });
});

describe("deleteCategoryController function integration with MongoDB + Slugify", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  let mongoServer;
  let existingCategoryId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    const category = await new categoryModel({
      name: "Category X",
      slug: "category-x",
    }).save();
    existingCategoryId = category._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
    await productModel.deleteMany({});
    jest.clearAllMocks();
  });

  it("should delete category correctly", async () => {
    const mockReq = { params: { id: existingCategoryId } };

    await deleteCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(0);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category deleted successfully",
    });
  });

  it("should return ok if category does not exist", async () => {
    const mockReq = { params: { id: new mongoose.Types.ObjectId() } };

    await deleteCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Category deleted successfully",
    });
  });

  it("should return error if category has products", async () => {
    const mockReq = { params: { id: existingCategoryId } };
    await productModel({
      name: "Product A",
      slug: "product-a",
      description: "Some fake product",
      price: 9.99,
      category: existingCategoryId,
      quantity: 100,
      photo: {
        data: Buffer.from("fake-file"),
        contentType: "image/png",
      },
    }).save();

    await deleteCategoryController(mockReq, mockRes);

    expect(await categoryModel.countDocuments()).toEqual(1);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Unable to delete category that contains products",
    });
  });

  it("should return error if MongoDB has issues", async () => {
    const mockReq = { params: { id: "invalid-id" } };

    await deleteCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in deleting category",
      }),
    );
  });
});
