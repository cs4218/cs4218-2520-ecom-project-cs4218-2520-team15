/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import {
  createProductController,
  deleteProductController,
  updateProductController,
} from "../../controllers/productController";
import { hashPassword } from "../../helpers/authHelper";
import categoryModel from "../../models/categoryModel";
import orderModel from "../../models/orderModel";
import productModel from "../../models/productModel";
import userModel from "../../models/userModel";
import app from "../../server";

describe("createProductController function", () => {
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
  });

  describe("integration with MongoDB + Slugify + fs", () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    afterEach(async () => {
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

    it("should return error if MongoDB has issues", async () => {
      const mockReq = {
        fields: {
          name: "Laptop",
          description: "A mock laptop",
          price: "9.99",
          category: category._id,
          quantity: "ten", // not a number
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

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in creating product",
        }),
      );
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

  describe("integration with HTTP", () => {
    let user, admin, authToken;

    const act = async (data, token = authToken) => {
      const req = request(app)
        .post("/api/v1/product/create-product")
        .set("Authorization", token)
        .field("name", data.name)
        .field("description", data.description)
        .field("price", data.price)
        .field(
          "category",
          data.category instanceof mongoose.Types.ObjectId
            ? data.category.toString()
            : data.category,
        )
        .field("quantity", data.quantity)
        .attach("photo", data.photo);
      if (data.shipping) {
        req.field("shipping", data.shipping);
      }
      return await req;
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

    it("should create product correctly", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(201);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product created successfully");
    });

    it("should create product correctly if shipping is undefined", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(201);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product created successfully");
    });

    it("should return error if MongoDB has issues", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "ten", // not a number
        shipping: "1",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Error in creating product");
    });

    it("should return error if server issues", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "yes", // malformed
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Error in creating product");
    });

    it("should return error if user is not admin", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      const response = await act(data, token);

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Unauthorized Access");
    });

    it("should return error if authorization token is invalid", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };

      const response = await act(data, "invalid-token");

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Invalid or expired token");
    });

    it("should return error if authorization token is expired", async () => {
      const data = {
        name: "Laptop",
        description: "A mock laptop",
        price: "9.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };
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
      expect(response.body.message).toEqual("Invalid or expired token");
    });
  });
});

describe("updateProductController function", () => {
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
  });

  describe("integration with MongoDB + Slugify + fs", () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    afterEach(async () => {
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

    it("should return error if MongoDB has issues", async () => {
      const mockReq = {
        params: { pid: product._id },
        fields: {
          name: "Computer",
          description: "A mock computer",
          price: "10.99",
          category: category._id,
          quantity: "ten", // not a number
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

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in updating product",
        }),
      );
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

  describe("integration with HTTP", () => {
    let user, admin, authToken;

    const act = async (data, { id = product._id, token = authToken } = {}) => {
      const req = request(app)
        .put(`/api/v1/product/update-product/${id}`)
        .set("Authorization", token)
        .field("name", data.name)
        .field("description", data.description)
        .field("price", data.price)
        .field(
          "category",
          data.category instanceof mongoose.Types.ObjectId
            ? data.category.toString()
            : data.category,
        )
        .field("quantity", data.quantity);
      if (data.shipping) {
        req.field("shipping", data.shipping);
      }
      if (data.photo) {
        req.attach("photo", data.photo);
      }
      return await req;
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

    it("should update product correctly", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(200);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product updated successfully");
    });

    it("should update product correctly if shipping is undefined", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(200);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product updated successfully");
    });

    it("should update product correctly if photo is undefined", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };

      const response = await act(data);

      expect(response.status).toEqual(200);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product updated successfully");
    });

    it("should return error if product does not exist", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data, { id: new mongoose.Types.ObjectId() });

      expect(response.status).toEqual(400);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Product does not exist");
    });

    it("should return error if MongoDB has issues", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "ten", // not a number
        shipping: "1",
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Error in updating product");
    });

    it("should return error if server issues", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "yes", // malformed
        photo: "./__mocks__/mock-img.png",
      };

      const response = await act(data);

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Error in updating product");
    });

    it("should return error if user is not admin", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      const response = await act(data, { token });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Unauthorized Access");
    });

    it("should return error if authorization token is invalid", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };

      const response = await act(data, { token: "invalid-token" });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Invalid or expired token");
    });

    it("should return error if authorization token is expired", async () => {
      const data = {
        name: "Computer",
        description: "A mock computer",
        price: "10.99",
        category: category._id,
        quantity: "10",
        shipping: "1",
      };
      const expiredToken = JWT.sign(
        { _id: admin._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1ms",
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 1));

      const response = await act(data, { token: expiredToken });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Invalid or expired token");
    });
  });
});

describe("deleteProductController function", () => {
  let mongoServer, product;

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
    await orderModel.deleteMany({});
  });

  describe("integration with MongoDB", () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    afterEach(async () => {
      jest.clearAllMocks();
    });

    it("should delete product correctly", async () => {
      const mockReq = { params: { pid: product._id } };

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product deleted successfully",
      });
    });

    it("should return ok if product does not exist", async () => {
      const mockReq = { params: { pid: new mongoose.Types.ObjectId() } };

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product deleted successfully",
      });
    });

    it("should return error if product has orders", async () => {
      const mockReq = { params: { pid: product._id } };
      await new orderModel({
        products: [product._id],
        payment: {},
        buyer: new mongoose.Types.ObjectId(),
      }).save();

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Unable to delete product with orders",
      });
    });

    it("should return error if MongoDB has issues", async () => {
      const mockReq = { params: { pid: "invalid-id" } };

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in deleting product",
        }),
      );
    });
  });

  describe("integration with HTTP", () => {
    let user, admin, authToken;

    const act = async ({ id = product._id, token = authToken } = {}) => {
      return await request(app)
        .delete(`/api/v1/product/delete-product/${id}`)
        .set("Authorization", token);
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
    afterEach(async () => {
      jest.clearAllMocks();
    });

    it("should delete product correctly", async () => {
      const response = await act();

      expect(response.status).toEqual(200);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product deleted successfully");
    });

    it("should return ok if product does not exist", async () => {
      const response = await act({ id: new mongoose.Types.ObjectId() });

      expect(response.status).toEqual(200);
      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual("Product deleted successfully");
    });

    it("should return error if product has orders", async () => {
      await new orderModel({
        products: [product._id],
        payment: {},
        buyer: new mongoose.Types.ObjectId(),
      }).save();

      const response = await act();

      expect(response.status).toEqual(400);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual(
        "Unable to delete product with orders",
      );
    });

    it("should return error if MongoDB has issues", async () => {
      const response = await act({ id: "invalid-id" });

      expect(response.status).toEqual(500);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Error in deleting product");
    });

    it("should return error if user is not admin", async () => {
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      const response = await act({ token });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Unauthorized Access");
    });

    it("should return error if authorization token is invalid", async () => {
      const response = await act({ token: "invalid-token" });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Invalid or expired token");
    });

    it("should return error if authorization token is expired", async () => {
      const expiredToken = JWT.sign(
        { _id: admin._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1ms",
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 1));

      const response = await act({ token: expiredToken });

      expect(response.status).toEqual(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual("Invalid or expired token");
    });
  });
});
