import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import categoryModel from "../models/categoryModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import { VOLUME_SEED_CONFIG } from "../__tests__/e2e/fixtures/seedData.js";

/**
 * Maps status distribution config to deterministic status selection by index
 * Ensures reproducible results: same orderIndex always produces same status
 */
function getStatusByIndex(orderIndex, config) {
  const statusDistribution = config.statusDistribution;
  const statuses = Object.entries(statusDistribution)
    .flatMap(([status, ratio]) => Array(Math.round(ratio * 20)).fill(status))
    .slice(0, 20); // Ensure exactly 20 slots for cycling

  return statuses[orderIndex % 20];
}

/**
 * Determine if payment should succeed based on index (10% failure rate)
 */
function getPaymentSuccessByIndex(orderIndex, config) {
  // Every 10th order (index 0, 10, 20, ...) has payment failure
  return orderIndex % 10 !== 0;
}

/**
 * Generate random transaction ID
 */
function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Seed database with volume test data (tagged for separate cleanup)
 * POST /api/v1/test/volume-seed
 */
export const volumeSeedDatabase = async (req, res) => {
  try {
    const orders = parseInt(req.query.orders || "1000", 10);
    const users = parseInt(req.query.users || "100", 10);
    const products = parseInt(req.query.products || "100", 10);

    // Step 1: Create volume users
    const createdUsers = [];
    const userPromises = [];
    for (let i = 0; i < users; i++) {
      const hashedPassword = await hashPassword("VolumeTest@123");
      userPromises.push(
        userModel.create({
          name: `Volume User ${i}`,
          email: `volume-user-${i}@test.com`,
          password: hashedPassword,
          phone: `9${Math.random().toString().slice(2, 9).padEnd(7, "0")}`,
          address: `${i} Volume Street`,
          answer: "test",
          role: 0,
          volumeSeeded: true
        })
      );
    }
    const createdUsersData = await Promise.all(userPromises);
    createdUsers.push(...createdUsersData);

    // Step 2: Ensure categories exist (reuse if present, create if fewer than 3)
    const existingCategories = await categoryModel.find({});
    let categoriesData = existingCategories;

    if (existingCategories.length < 3) {
      const categoriesToCreate = [
        { name: "Electronics", slug: "electronics", volumeSeeded: true },
        { name: "Clothing", slug: "clothing", volumeSeeded: true },
        { name: "Books", slug: "books", volumeSeeded: true }
      ];

      // Filter out categories that already exist by slug
      const existingSlugs = new Set(existingCategories.map(c => c.slug));
      const newCategories = categoriesToCreate.filter(c => !existingSlugs.has(c.slug));

      if (newCategories.length > 0) {
        const created = await categoryModel.insertMany(newCategories);
        categoriesData = [...existingCategories, ...created];
      }
    }

    // Step 3: Create volume products distributed across categories
    const createdProducts = [];
    const productPromises = [];
    const productsPerCategory = Math.ceil(products / categoriesData.length);

    for (let i = 0; i < products; i++) {
      const categoryIndex = i % categoriesData.length;
      const category = categoriesData[categoryIndex];
      const price = (Math.random() * 1995 + 5).toFixed(2);
      const quantity = Math.floor(Math.random() * 500) + 1;

      productPromises.push(
        productModel.create({
          name: `Volume Product ${i}`,
          slug: `volume-product-${i}-${Date.now()}`,
          description: `Description for volume product ${i}`,
          price: parseFloat(price),
          category: category._id,
          quantity,
          photo: {
            data: Buffer.from("volume-fake-image-data"),
            contentType: "image/png"
          },
          shipping: Math.random() > 0.5,
          volumeSeeded: true
        })
      );
    }
    const createdProductsData = await Promise.all(productPromises);
    createdProducts.push(...createdProductsData);

    // Step 4: Create volume orders
    const createdOrders = [];
    const orderPromises = [];

    for (let i = 0; i < orders; i++) {
      // Assign buyer by cycling through users
      const buyerIndex = i % createdUsers.length;
      const buyer = createdUsers[buyerIndex];

      // Select 1-4 random products
      const productCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      for (let p = 0; p < productCount; p++) {
        const randomProductIndex = Math.floor(Math.random() * createdProducts.length);
        selectedProducts.push(createdProducts[randomProductIndex]._id);
      }

      // Get deterministic status and payment status
      const status = getStatusByIndex(i, VOLUME_SEED_CONFIG);
      const paymentSuccess = getPaymentSuccessByIndex(i, VOLUME_SEED_CONFIG);

      orderPromises.push(
        orderModel.create({
          products: selectedProducts,
          buyer: buyer._id,
          status,
          payment: {
            success: paymentSuccess,
            transactionId: generateTransactionId()
          },
          volumeSeeded: true
        })
      );
    }
    const createdOrdersData = await Promise.all(orderPromises);
    createdOrders.push(...createdOrdersData);

    // Return success response
    return res.status(200).json({
      success: true,
      created: {
        users: createdUsers.length,
        products: createdProducts.length,
        orders: createdOrders.length,
        categories: categoriesData.length
      }
    });
  } catch (error) {
    console.error("volumeSeedDatabase error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Tear down volume seed data (delete only documents tagged volumeSeeded: true)
 * POST /api/v1/test/volume-teardown
 */
export const volumeTeardownDatabase = async (req, res) => {
  try {
    const userResult = await userModel.deleteMany({ volumeSeeded: true });
    const productResult = await productModel.deleteMany({ volumeSeeded: true });
    const orderResult = await orderModel.deleteMany({ volumeSeeded: true });

    return res.status(200).json({
      success: true,
      deleted: {
        users: userResult.deletedCount,
        products: productResult.deletedCount,
        orders: orderResult.deletedCount
      }
    });
  } catch (error) {
    console.error("volumeTeardownDatabase error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
