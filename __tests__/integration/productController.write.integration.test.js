/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createProductController,
  updateProductController,
} from "../../controllers/productController";
import categoryModel from "../../models/categoryModel";
import productModel from "../../models/productModel";

describe("createProductController function integration with MongoDB + Slugify + fs", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  let mongoServer, category;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    category = await new categoryModel({
      name: "Category X",
      slug: "category-x",
    }).save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    jest.clearAllMocks();
  });

  it("should create product correctly", async () => {
    const mockReq = {
      fields: {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      },
      files: {
        photo: {
          path: "./__mocks__/mock-img.png",
          type: "image/png",
          size: 100,
        },
      },
    };

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product created successfully",
      products: expect.objectContaining({
        name: "Laptop",
        slug: "Laptop",
        description: "A mock laptop",
        price: 9.99,
        category: category._id,
        quantity: 10,
        shipping: true,
      }),
    });
  });

  it("should create product correctly if shipping is undefined", async () => {
    const mockReq = {
      fields: {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
      },
      files: {
        photo: {
          path: "./__mocks__/mock-img.png",
          type: "image/png",
          size: 100,
        },
      },
    };

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product created successfully",
      products: expect.objectContaining({
        name: "Laptop",
        slug: "Laptop",
        description: "A mock laptop",
        price: 9.99,
        category: category._id,
        quantity: 10,
        shipping: false,
      }),
    });
  });

  it("should return error if server issues", async () => {
    const mockReq = {
      fields: {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: "1",
        quantity: "10",
        shipping: "0",
      },
      files: {
        photo: {
          path: "/path/mock-file.png", // invalid file path
          type: "image/png",
          size: 100,
        },
      },
    };

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in creating product",
      }),
    );
  });
});

describe("updateProductController function integration with MongoDB + Slugify + fs", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  let mongoServer, category, product;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    category = await new categoryModel({
      name: "Category X",
      slug: "category-x",
    }).save();
    product = await new productModel({
      name: "Existing Laptop",
      slug: "existing-laptop",
      description: "An existing laptop",
      price: 9.99,
      category: category._id,
      quantity: 100,
      photo: {
        data: Buffer.from("fake-file"),
        contentType: "image/png",
      },
      shipping: false,
    }).save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    jest.clearAllMocks();
  });

  it("should update product correctly", async () => {
    const mockReq = {
      params: { pid: product._id },
      fields: {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      },
      files: {
        photo: {
          path: "./__mocks__/mock-img.png",
          type: "image/png",
          size: 100,
        },
      },
    };

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product updated successfully",
      products: expect.objectContaining({
        _id: product._id,
        name: "Computer",
        description: "A mock computer",
        price: 10.99,
        category: category._id,
        quantity: 10,
        shipping: true,
      }),
    });
  });

  it("should update product correctly if shipping is undefined", async () => {
    const mockReq = {
      params: { pid: product._id },
      fields: {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
      },
      files: {
        photo: {
          path: "./__mocks__/mock-img.png",
          type: "image/png",
          size: 100,
        },
      },
    };

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product updated successfully",
      products: expect.objectContaining({
        _id: product._id,
        name: "Computer",
        description: "A mock computer",
        price: 10.99,
        category: category._id,
        quantity: 10,
        shipping: false,
      }),
    });
  });

  it("should update product correctly if photo is undefined", async () => {
    const mockReq = {
      params: { pid: product._id },
      fields: {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      },
      files: {},
    };

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product updated successfully",
      products: expect.objectContaining({
        _id: product._id,
        name: "Computer",
        description: "A mock computer",
        price: 10.99,
        category: category._id,
        quantity: 10,
        shipping: true,
      }),
    });
  });

  it("should return error if product does not exist", async () => {
    const mockReq = {
      params: { pid: new mongoose.Types.ObjectId() },
      fields: {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      },
      files: {
        photo: {
          path: "./__mocks__/mock-img.png",
          type: "image/png",
          size: 100,
        },
      },
    };

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product does not exist",
    });
  });

  it("should return error if server issues", async () => {
    const mockReq = {
      params: { pid: product._id },
      fields: {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      },
      files: {
        photo: {
          path: "/path/mock-file.png", // invalid file path
          type: "image/png",
          size: 100,
        },
      },
    };

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in updating product",
      }),
    );
  });
});
