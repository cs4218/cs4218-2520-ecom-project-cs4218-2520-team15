/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "../../controllers/categoryController";
import { hashPassword } from "../../helpers/authHelper";
import categoryModel from "../../models/categoryModel";
import productModel from "../../models/productModel";
import userModel from "../../models/userModel";
import app from "../../server";

describe("createCategoryController function", () => {
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
  });

  describe("integration with MongoDB + Slugify", () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    afterEach(async () => {
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
      expect(mockRes.status).toHaveBeenCalledWith(400);
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

  describe("integration with HTTP", () => {
    let user, admin, authToken;

    const act = async (data, token = authToken) => {
      return await request(app)
        .post("/api/v1/category/create-category")
        .set("Authorization", token)
        .send(data);
    };

    beforeAll(async () => {
      user = await new userModel({
        name: "user",
        email: "user@example.com",
        password: await hashPassword("password"),
        phone: "81234567",
        address: "123 Jane Street",
        answer: "chicken",
        role: 0,
      }).save();
      admin = await new userModel({
        name: "admin",
        email: "admin@example.com",
        password: await hashPassword("password"),
        phone: "91234567",
        address: "456 Jane Street",
        answer: "pork",
        role: 1,
      }).save();
      authToken = JWT.sign({ _id: admin._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({});
    });

    it("should create category correctly", async () => {
      const data = { name: "Category A" };

      const response = await act(data);

      expect(response.status).toEqual(201);
      expect(response.body.success).toEqual(true);
    });

    it("should return error if missing fields", async () => {
      const data = { name: "" };

      const response = await act(data);

      expect(response.status).toEqual(400);
      expect(response.body.success).toEqual(false);
    });

    it("should return error if category already exists", async () => {
      const data = { name: "Category X" };

      const response = await act(data);

      expect(response.status).toEqual(400);
      expect(response.body.success).toEqual(false);
    });

    it("should return error if MongoDB has issues", async () => {
      const data = { name: { value: "Category A" } };

      const response = await act(data);

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
    });

    it("should return error if user is not admin", async () => {
      const data = { name: "Category A" };
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      const response = await act(data, token);

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
    });

    it("should return error if authorization token is invalid", async () => {
      const data = { name: "Category A" };

      const response = await act(data, "invalid-token");

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
    });

    it("should return error if authorization token is expired", async () => {
      const data = { name: "Category A" };
      const expiredToken = JWT.sign(
        { _id: admin._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1ms",
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 1));

      const response = await act(data, expiredToken);

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
    });
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
