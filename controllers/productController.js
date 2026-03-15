import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";

import braintree from "braintree";
import dotenv from "dotenv";
import fs from "fs";
import slugify from "slugify";

dotenv.config();

//payment gateway
var gateway;
if (process.env.NODE_ENV !== "test" || (process.env.BRAINTREE_MERCHANT_ID && process.env.BRAINTREE_PUBLIC_KEY)) {
  gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY,
  });
}

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    //validation
    switch (true) {
      case !name:
        return res
          .status(400)
          .send({ success: false, message: "Name is required" });
      case !description:
        return res
          .status(400)
          .send({ success: false, message: "Description is required" });
      case !price:
        return res
          .status(400)
          .send({ success: false, message: "Price is required" });
      case !category:
        return res
          .status(400)
          .send({ success: false, message: "Category is required" });
      case !quantity:
        return res
          .status(400)
          .send({ success: false, message: "Quantity is required" });
      case !photo:
        return res
          .status(400)
          .send({ success: false, message: "Photo is required" });
      case photo && photo.size > 1000000:
        return res
          .status(400)
          .send({ success: false, message: "Photo should be less then 1MB" });
    }

    const parsedShipping = shipping ? JSON.parse(shipping) : false; // shipping can be undefined, a string '0' or '1'
    const products = new productModel({
      ...req.fields,
      slug: slugify(name),
      photo: {
        data: fs.readFileSync(photo.path),
        contentType: photo.type,
      },
      shipping: parsedShipping,
    });
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product created successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

// get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .sort({ createdAt: -1 });
    
    res.status(200).send({
      success: true,
      total: products.length,
      message: "All products fetched successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting all products",
      error: error.message,
    });
  }
};

// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Single product fetched successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");
    
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }
    
    if (!product.photo || !product.photo.data) {
      return res.status(404).send({
        success: false,
        message: "Photo not found",
      });
    }
    
    res.set("Content-type", product.photo.contentType);
    return res.status(200).send(product.photo.data);
    
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error,
    });
  }
};

//delete controller
export const deleteProductController = async (req, res) => {
  try {
    const id = req.params.pid;
    const ordersCount = await orderModel.countDocuments({ products: id });
    if (ordersCount > 0) {
      return res
        .status(400)
        .send({
          success: false,
          message: "Unable to delete product with orders",
        });
    }
    await productModel.findByIdAndDelete(id);
    res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in deleting product",
      error,
    });
  }
};

//update product
export const updateProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    //validation
    switch (true) {
      case !name:
        return res
          .status(400)
          .send({ success: false, message: "Name is required" });
      case !description:
        return res
          .status(400)
          .send({ success: false, message: "Description is required" });
      case !price:
        return res
          .status(400)
          .send({ success: false, message: "Price is required" });
      case !category:
        return res
          .status(400)
          .send({ success: false, message: "Category is required" });
      case !quantity:
        return res
          .status(400)
          .send({ success: false, message: "Quantity is required" });
      case photo && photo.size > 1000000:
        return res
          .status(400)
          .send({ success: false, message: "Photo should be less then 1MB" });
    }

    const parsedShipping = shipping ? JSON.parse(shipping) : false; // shipping can be undefined, a string '0' or '1'
    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      {
        ...req.fields,
        slug: slugify(name),
        shipping: parsedShipping,
      },
      { new: true },
    );
    if (!products) {
      return res
        .status(400)
        .send({ success: false, message: "Product does not exist" });
    }
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(200).send({
      success: true,
      message: "Product updated successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in updating product",
    });
  }
};

// product filters
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio, page = 1 } = req.body;
    const perPage = 6;

    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) {
      // JSON serialization changes Infinity to null
      if (radio[1] === null) {
        args.price = { $gte: radio[0] };
      } else {
        args.price = { $gte: radio[0], $lte: radio[1] };
      }
    }

    const products = await productModel
        .find(args)
        .select("-photo")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 });

    const total = await productModel.countDocuments(args);

    res.status(200).send({
      success: true,
      total: total,
      message: "Filtered products successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while filtering products",
      error,
    });
  }
};

// product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      message: "Counted products successfully",
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in counting products",
      error,
      success: false,
    });
  }
};

// product list base on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? req.params.page : 1;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      message: "List products per page successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in listing products per page",
      error,
    });
  }
};

// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;

    // Check for empty keyword
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).send({
        success: false,
        message: "Search keyword is required",
        results: [],
      });
    }

    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");

    res.status(200).send({
      success: true,
      message: "Products searched successfully",
      results,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in searching for products",
      error,
    });
  }
};

// similar products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");

    res.status(200).send({
      success: true,
      message: "Related products fetched successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while getting related products",
      error,
    });
  }
};

// get product by category
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const perPage = 3;
    const page = req.params.page ? req.params.page : 1;
    
    const products = await productModel
      .find({ category })
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("category")
      .sort({ createdAt: -1 });

    const total = await productModel.countDocuments({ category });

    res.status(200).send({
      success: true,
      message: "Products by category fetched successfully",
      category,
      products,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      error,
      message: "Error while getting products by category",
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController = async (req, res) => {
  try {
    console.log('🔍 Gateway status:', !!gateway, typeof gateway);
    if (!gateway) {
      return res.status(500).send("Braintree not initialized");
    }
    
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

//payment
export const brainTreePaymentController = async (req, res) => {
  try {
    if (!gateway) {
      return res.status(500).send("Braintree not initialized");
    }
    
    const { nonce, cart } = req.body;
    let total = 0;
    cart.map((i) => {
      total += i.price;
    });

    // Handle empty cart edge case
    if (total === 0) {
      const order = await new orderModel({
        products: cart,
        payment: { amount: 0 },
        buyer: req.user._id,
      }).save();
      return res.json({ ok: true });
    }

    let newTransaction = gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      async function (error, result) {
        if (result && result.success) {
          const order = await new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(error || result);
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};