/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createCategoryController } from "../../controllers/categoryController";
import categoryModel from "../../models/categoryModel";

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
});
