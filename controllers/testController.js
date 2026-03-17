import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import userModel from "../models/userModel.js";

import { hashPassword } from "../helpers/authHelper.js";

import { TEST_CATEGORIES, TEST_ORDERS, TEST_PRODUCTS, TEST_USERS } from "../__tests__/e2e/fixtures/seedData.js";

export const seedDatabase = async (req, res) => {
  try {
    // Wipe all test collections
    await Promise.all([
      orderModel.deleteMany({}),
      productModel.deleteMany({}),
      categoryModel.deleteMany({}),
      userModel.deleteMany({})
    ]);

    // Create users (hash password exactly as your auth flow does)
    const hashedPassword_admin = hashPassword(TEST_USERS[0].password);
    const hashedPassword_normal = hashPassword(TEST_USERS[1].password);
    
    await new userModel({
      ...TEST_USERS[0],
      password: hashedPassword_admin
    }).save();

    await new userModel({
      ...TEST_USERS[1],
      password: hashedPassword_normal
    }).save();

    // Create categories, keep a slug --> _id map
    const categoryMap = {};
    for (const cat of TEST_CATEGORIES) {
      const saved = await new categoryModel(cat).save();
      categoryMap[cat.slug] = saved._id;
    }

    // Create products, resolving categorySlug --> _id
    for (const product of TEST_PRODUCTS) {
      const { categorySlug, ...rest } = product;
      await new productModel({
        ...rest,
        category: categoryMap[categorySlug],
        photo: {
          data: Buffer.from("fake-image"),
          contentType: "image/png",
        },
      }).save();
    }

    // Create orders (not added here since empty)

    res.status(200).json({ success: true, message: "Database seeded" });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ success: false, message: "Seed failed", error: error.message });
  }
};

export const teardownDatabase = async (req, res) => {
  try {
    // Wipe all test collections
    await Promise.all([
      orderModel.deleteMany({}),
      productModel.deleteMany({}),
      categoryModel.deleteMany({}),
      userModel.deleteMany({})
    ]);

    res.status(200).json({ success: true, message: "Database cleared" });
  } catch (error) {
    console.error("Teardown error:", error);
    res.status(500).json({ success: false, message: "Teardown failed", error: error.message });
  }
};