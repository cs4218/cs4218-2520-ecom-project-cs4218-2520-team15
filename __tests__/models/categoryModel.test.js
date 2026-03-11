/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../../models/categoryModel.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    dbName: "jest-category-model",
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await Category.deleteMany({});
});

describe("Category model", () => {
  test("saves and reads back a category document with name and slug", async () => {
    // Arrange
    const category = await Category.create({
      name: "Electronics",
      slug: "electronics",
    });
    // Act
    const found = await Category.findById(category._id).lean();
    // Assert
    expect(found).not.toBeNull();
    expect(found.name).toBe("Electronics");
    expect(found.slug).toBe("electronics");
  });

  test("allows multiple categories with the same name and slug (no unique constraint)", async () => {
    // Arrange
    await Category.create({ name: "Books", slug: "books" });
    await Category.create({ name: "Books", slug: "books" });
    // Act
    const all = await Category.find({ name: "Books" }).lean();
    // Assert
    expect(all.length).toBe(2);
  });

  test("persists category when only name is provided and slug is omitted", async () => {
    // Arrange
    const category = await Category.create({ name: "Clothing" });
    // Act
    const found = await Category.findById(category._id).lean();
    // Assert
    expect(found).not.toBeNull();
    expect(found.name).toBe("Clothing");
    expect(found.slug).toBeUndefined();
  });

  test("slug is stored lowercase when schema has lowercase: true", async () => {
    // Arrange
    const category = await Category.create({
      name: "MixedCase",
      slug: "MixedCase-Slug",
    });
    // Act
    const found = await Category.findById(category._id).lean();
    // Assert
    expect(found).not.toBeNull();
    expect(found.slug).toBe("mixedcase-slug");
  });

  test("throws validation error when name is missing", async () => {
    // Arrange
    const invalidCategory = { slug: "test-slug" };
    // Act
    const createPromise = Category.create(invalidCategory);
    // Assert
    await expect(createPromise)
      .rejects
      .toThrow(mongoose.Error.ValidationError);
  });
});

