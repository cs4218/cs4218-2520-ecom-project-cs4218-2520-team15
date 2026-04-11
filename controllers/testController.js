import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import userModel from "../models/userModel.js";

import { hashPassword } from "../helpers/authHelper.js";

import { TEST_CATEGORIES, TEST_ORDERS, TEST_PRODUCTS, TEST_USERS } from "../__tests__/e2e/fixtures/seedData.js";

import fs from "fs";
import path from "path";
import slugify from "slugify";
import slugify from "slugify";

// Use process.cwd() for path resolution - works in both Jest (CommonJS) and Node.js (ES modules)
const IMAGES_DIR = path.join(process.cwd(), "__tests__/e2e/fixtures/images");

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
    const hashedPassword_admin = await hashPassword(TEST_USERS[0].password);
    const hashedPassword_normal = await hashPassword(TEST_USERS[1].password);
    
    const createdAdmin = await new userModel({
      ...TEST_USERS[0],
      password: hashedPassword_admin
    }).save();
    
    const createdNormal = await new userModel({
      ...TEST_USERS[1],
      password: hashedPassword_normal
    }).save();
    
    console.log('✅ Users created:', {
      admin: createdAdmin.email,
      normal: createdNormal.email,
    });

    // Create categories, keep a slug --> _id map
    const categoryMap = {};
    for (const cat of TEST_CATEGORIES) {
      const saved = await new categoryModel(cat).save();
      categoryMap[cat.slug] = saved._id;
    }
    
    console.log('✅ Categories created:', Object.keys(categoryMap).length);

    const productMap = {};
    for (const product of TEST_PRODUCTS) {
      const { categorySlug, photoFilename, contentType, ...rest } = product;
      
      let photoData = null;
      
      // Try to load the image from disk
      if (photoFilename) {
        const imagePath = path.join(IMAGES_DIR, photoFilename);
        try {
          if (fs.existsSync(imagePath)) {
            photoData = {
              data: fs.readFileSync(imagePath),
              contentType: contentType || "image/jpeg",
            };
          } else {
            // Fallback: Create a minimal dummy buffer if image file doesn't exist
            console.warn(`⚠️  Image file not found: ${imagePath}. Using placeholder.`);
            photoData = {
              data: Buffer.from('fake-image'),
              contentType: "image/jpeg",
            };
          }
        } catch (err) {
          console.error(`‼️ Error reading image ${photoFilename}:`, err.message);
          // Fallback to dummy
          photoData = {
            data: Buffer.from('fake-image'),
            contentType: "image/jpeg",
          };
        }
      }

      const saved = await new productModel({
        ...rest,
        category: categoryMap[categorySlug],
        ...(photoData && { photo: photoData }),
      }).save();
      productMap[product.slug] = saved._id;
    }
    
    console.log('✅ Products created:', TEST_PRODUCTS.length);

    // Build an email -> _id map for users to resolve orders
    const userMap = {
      [createdAdmin.email]: createdAdmin._id,
      [createdNormal.email]: createdNormal._id,
    };

    // Create orders, resolving buyerEmail --> _id and productSlugs --> _ids
    let ordersCreated = 0;
    for (const order of TEST_ORDERS) {
      const { buyerEmail, productSlugs, ...rest } = order;

      const productIds = productSlugs.map(slug => {
        const id = productMap[slug];
        if (!id) {
          throw new Error(`Product slug "${slug}" not found in productMap`);
        }
        return id;
      });

      const buyerId = userMap[buyerEmail];
      if (!buyerId) {
        throw new Error(`Buyer email "${buyerEmail}" not found in userMap`);
      }

      await new orderModel({
        ...rest,
        buyer: buyerId,
        products: productIds
      }).save();
      ordersCreated++;
    }

    console.log('✅ Orders created:', ordersCreated);

    res.status(200).json({ 
      success: true, 
      message: "Database seeded successfully",
      data: {
        users: 2,
        categories: Object.keys(categoryMap).length,
        products: TEST_PRODUCTS.length,
        orders: ordersCreated
      }
    });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Seed failed", 
      error: error.message,
      stack: error.stack
    });
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

export const checkSeededUsers = async (req, res) => {
  try {
    const users = await userModel.find({}).select('-password');
    console.log('Users in database:', users.length);
    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }))
    });
  } catch (error) {
    console.error("Check users error:", error);
    res.status(500).json({ success: false, message: "Check failed", error: error.message });
  }
};

export const checkSeededOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({})
      .populate("products", "name slug price description")
      .populate("buyer", "name email")
      .sort({ createdAt: -1 });

    console.log('Orders in database:', orders.length);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders.map(o => ({
        _id: o._id,
        status: o.status,
        payment: o.payment,
        buyer: o.buyer,
        products: o.products,
        createdAt: o.createdAt,
      }))
    });
  } catch (error) {
    console.error("Check orders error:", error);
    res.status(500).json({ success: false, message: "Check failed", error: error.message });
  }
};

export const seedPerformanceDatabase = async (req, res) => {
  const { faker } = await import("@faker-js/faker");
  try {
    // Wipe all test collections
    await Promise.all([
      orderModel.deleteMany({}),
      productModel.deleteMany({}),
      categoryModel.deleteMany({}),
      userModel.deleteMany({})
    ]);

    // Create predictable users
    const createdUsers = [];
    for (let i = 0; i < 50; i++) {
      const email = `perf_user_${i}@test.com`;
      const password = `TempPassword${i}!`;
      const hashedPassword = await hashPassword(password);

      const user = await new userModel({
        name: `Perf User ${i}`,
        email,
        password: hashedPassword,
        phone: `555-${String(1000 + i).padStart(4, '0')}`,
        address: `${100 + i} Test Street`,
        answer: "test",
        role: 0
      }).save();

      createdUsers.push(user);
    }

    console.log('✅ Performance users created:', createdUsers.length);

    faker.seed(4218);
    const { commerce } = faker;

    // Create categories
    const createdCategories = [];
    for (let i = 0; i < 10; i++) {
      const name = commerce.department();
      const category = await new categoryModel({
        name: name,
        slug: slugify(name),
      }).save();

      createdCategories.push(category._id);
    }

    console.log('✅ Performance categories created:', createdCategories.length);

    // Create products
    const createdProducts = [];
    for (let i = 0; i < 300; i++) {
      const name = commerce.productName();
      // Ensure price is formatted to exactly 2 decimal places to avoid Braintree format errors
      const price = parseFloat(commerce.price()).toFixed(2);
      const product = await new productModel({
        name,
        slug: slugify(name),
        description: commerce.productDescription(),
        price,
        category: faker.helpers.arrayElement(createdCategories),
        quantity: faker.number.int({ min: 1, max: 100 }),
        shipping: faker.datatype.boolean(),
        photo: {
          data: Buffer.from("fake-image"),
          contentType: "image/jpeg",
        },
      }).save();

      createdProducts.push({ _id: product._id, price: product.price });
    }

    console.log('✅ Performance products created:', createdProducts.length);

    res.status(200).json({
      success: true,
      message: "Performance data seeded successfully",
      users: createdUsers.map((user) => ({
        _id: user._id,
        email: user.email,
        password: user.password,
      })),
      products: createdProducts,
    });

  } catch (error) {
    console.error("Performance seed database error:", error);
    res.status(500).json({
      success: false,
      message: "Performance seed database failed",
      error: error.message,
    });
  }
};