// Seed Data to Fill Database

export const TEST_CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Clothing", slug: "clothing" },
  { name: "Books", slug: "books" },
  { name: "Stationeries", slug: "stationeries" },
];

export const TEST_PRODUCTS = [
  {
    name: "Laptop",
    slug: "laptop",
    description: "A powerful laptop",
    price: 1499.99,
    categorySlug: "electronics", // resolved to _id in controller
    quantity: 30,
    shipping: true,
    photoFilename: "laptop.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "Smartphone",
    slug: "smartphone",
    description: "A high-end smartphone",
    price: 999.99,
    categorySlug: "electronics",
    quantity: 50,
    shipping: false,
    photoFilename: "smartphone.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "Textbook",
    slug: "textbook",
    description: "A comprehensive textbook",
    price: 79.99,
    categorySlug: "books",
    quantity: 50,
    shipping: false,
    photoFilename: "textbook.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "Novel",
    slug: "novel",
    description: "A bestselling novel",
    price: 14.99,
    categorySlug: "books",
    quantity: 200,
    shipping: true,
    photoFilename: "novel.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "The Law of Contract in Singapore",
    slug: "the-law-of-contract-in-singapore",
    description: "A bestselling book in Singapore",
    price: 54.99,
    categorySlug: "books",
    quantity: 200,
    shipping: true,
    photoFilename: "law-book.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "NUS T-shirt",
    slug: "nus-tshirt",
    description: "Plain NUS T-shirt for sale",
    price: 4.99,
    categorySlug: "clothing",
    quantity: 200,
    shipping: true,
    photoFilename: "nus-tshirt.jpeg",
    contentType: "image/jpeg",
  },
  {
    name: "BlackBerry Phone",
    slug: "blackberry-phone",
    description: "Blackberry, strawberry, raspberry, blueberry, cranberry, gooseberry",
    price: 89.99,
    categorySlug: "electronics",
    quantity: 10,
    shipping: true,
    photoFilename: "blackberry-phone.jpg",
    contentType: "image/jpeg",
  },
  {
    name: "Coding For Dummies Book",
    slug: "coding-for-dummies-book",
    description: "Good read for me",
    price: 15.99,
    categorySlug: "books",
    quantity: 10,
    shipping: true,
    photoFilename: "coding-for-dummies-book.jpg",
    contentType: "image/jpeg",
  },
  {
    name: "Tamagotchi",
    slug: "tamagotchi",
    description: "Cute egg pet",
    price: 21.99,
    categorySlug: "electronics",
    quantity: 10,
    shipping: true,
    photoFilename: "tamagotchi.jpeg",
    contentType: "image/jpeg",
  },
];

export const TEST_USERS = [
  {
    name: "E2E Test Admin User",
    email: "e2etest_admin_user@example.com",
    password: "TestAdmin@12345",
    phone: "91234567",
    address: "123 Test Street",
    answer: "playwright",
    role: 1 // admin
  },
  {
    name: "E2E Test Normal User",
    email: "e2etest_normal_user@example.com",
    password: "TestNormal@12345",
    phone: "91237654",
    address: "456 Test Street",
    answer: "playwright",
    role: 0 // normal user
  },
];

export const TEST_ORDERS = [
  {
    productSlugs: ["laptop", "textbook"], // resolved to _id in controller
    buyerEmail: "e2etest_normal_user@example.com", // resolved to _id in controller
    payment: { success: true, transactionId: "txn_001" },
    status: "Not Processed",
  },
  {
    productSlugs: ["nus-tshirt"], // resolved to _id in controller
    buyerEmail: "e2etest_normal_user@example.com", // resolved to _id in controller
    payment: { success: false, transactionId: "txn_002" },
    status: "Not Processed",
  }
];