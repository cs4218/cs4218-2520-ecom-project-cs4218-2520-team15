# CS4218 Project - Virtual Vault

[![Run Tests](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team15/actions/workflows/main.yml/badge.svg)](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team15/actions/workflows/main.yml)

## Project Milestone 1 (MS1)

### MS1 CI URL

https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team15/actions/runs/22280898113/job/64451263552

### Mahadhir Bin Mohd Ismail, A0252808B

- Protected Routes
  - context/auth.js
  - helpers/authHelper.js
  - middlewares/authMiddleware.js

- Registration/Login
  - pages/Auth/Register.js
  - controllers/authController.js
    - registerController
    - loginController
    - forgotPasswordController
    - testController
  - pages/Auth/Login.js
  - pages/Auth/ForgotPassword.js

- General
  - components/Routes/Private.js
  - components/UserMenu.js
  - pages/user/Dashboard.js

---

### Lee Guan Kai Delon, A0273286W

- Admin Dashboard
  - components/AdminMenu.js
  - pages/admin/AdminDashboard.js

- Admin Actions
  - components/Form/CategoryForm.js
  - pages/admin/CreateCategory.js
  - pages/admin/CreateProduct.js
  - pages/admin/UpdateProduct.js
  - controllers/categoryController.js
    - createCategoryController
    - updateCategoryController
    - deleteCategoryController

- Admin View Products
  - pages/admin/Products.js
  - controllers/productController.js
    - createProductController
    - deleteProductController
    - updateProductController

---

### Kok Fangyu Inez, A0258672R

- Product
  - pages/ProductDetails.js
  - pages/CategoryProduct.js
  - controllers/productController.js
    - getProductController
    - getSingleProductController
    - productPhotoController
    - productFiltersController
    - productCountController
    - productListController
    - searchProductController
    - realtedProductController
    - productCategoryController
  - models/productModel.js

- Search
  - components/Form/SearchInput.js
  - context/search.js
  - pages/Search.js

- Home
  - pages/Homepage.js

---

### Lim Jin Yin, A0256976H

- General
  - models/userModel.js
  - models/orderModel.js

- Profile
  - pages/user/Profile.js
  - controllers/authController.js
    - updateProfileController

- Order
  - pages/user/Orders.js
  - controllers/authController.js
    - getOrdersController

- Admin View Orders
  - pages/admin/AdminOrders.js
  - controllers/authController.js
    - getAllOrdersController
    - orderStatusController

- Admin View Users
  - pages/admin/Users.js
  - controllers/authController.js
    - getAllUsersController

---

### Tan Qin Xu, A0213002J

- Cart
  - context/cart.js
  - pages/CartPage.js

- Payment
  - controllers/productController.js
    - braintreeTokenController
    - brainTreePaymentController

- Category
  - hooks/useCategory.js
  - pages/Categories.js
  - controllers/categoryController.js
    - categoryControlller
    - singleCategoryController
  - models/categoryModel.js

- Contact
  - pages/Contact.js

- Policy
  - pages/Policy.js

- General
  - components/Footer.js
  - components/Header.js
  - components/Layout.js
  - components/Spinner.js
  - pages/About.js
  - pages/Pagenotfound.js
  - config/db.js

## Project Milestone 2 (MS2)

### Mahadhir Bin Mohd Ismail, A0252808B

- Integration Tests
  - authController.forgotPassword.integration.test.js
  - authController.forgotPasswordApi.integration.test.js
  - authController.login.integration.test.js
  - authController.loginApi.integration.test.js
  - authController.register.integration.test.js
  - authController.registerApi.integration.test.js

- UI Tests
  - adminAccess.spec.ts
  - forgotPassword.spec.ts
  - persistence.spec.ts
  - registration.spec.ts

---

### Lee Guan Kai Delon, A0273286W

- Integration Tests
  - categoryController.write.integration.test.js
  - productController.write.integration.test.js

- UI Tests
  - create-category.spec.ts
  - update-category.spec.ts
  - delete-category.spec.ts
  - create-product.spec.ts
  - update-product.spec.ts
  - delete-product.spec.ts
  - admin-users-management.spec.ts

---

### Kok Fangyu Inez, A0258672R

- Integration Tests
  - productController.home.integration.test.js
  - productController.search.integration.test.js
  - productController.view.integration.test.js
  - productRoutes.home.integration.test.js
  - productRoutes.search.integration.test.js
  - productRoutes.view.integration.test.js

- UI Tests
  - browsing-home-category.spec.ts
  - product-search-filter.spec.ts
  - static-pages.spec.ts

---

### Lim Jin Yin, A0256976H

- Integration Tests
  - updateProfile.integration.test.js
  - userOrders.integration.test.js
  - adminViewOrders.integration.test.js
  - adminViewUsers.integration.test.js

- UI Tests
  - admin-orders.spec.ts
  - checkout-edge-cases.spec.ts
  - profile-update.spec.ts

---

### Tan Qin Xu, A0213002J

- Integration Tests
  - braintree.integration.test.js
  - genericCategory.integration.test.js

- UI Tests
  - addToCart.spec.ts
  - checkoutPayment.spec.ts
  - orderHistory.spec.ts

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**
   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**
   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

## 6. UI Testing with Playwright (Scenario-Based)

- **Overview**: UI tests are end-to-end, black-box tests written with Playwright. They exercise complete user and admin workflows across multiple pages (e.g. _login → browse → add to cart → checkout → verify orders_), not just isolated UI elements.
- **Location**: Place UI tests under a `playwright/tests` directory (e.g. `playwright/tests/auth.e2e.spec.ts`), using the Playwright MCP server configured in `.vscode/mcp.json` as needed.
- **Routing coverage**: Scenarios below are designed to cover the main routes defined in `client/src/App.js`, including:
  - Public routes: `/`, `/product/:slug`, `/categories`, `/category/:slug`, `/cart`, `/search`, `/about`, `/contact`, `/policy`, `/register`, `/login`, `/forgot-password`, and `*` (404).
  - User dashboard routes: `/dashboard/user`, `/dashboard/user/orders`, `/dashboard/user/profile`.
  - Admin dashboard routes: `/dashboard/admin`, `/dashboard/admin/create-category`, `/dashboard/admin/create-product`, `/dashboard/admin/product/:slug`, `/dashboard/admin/products`, `/dashboard/admin/users`, `/dashboard/admin/orders`.

### 6.1 End-to-end UI scenarios (S1–S16)

- **S1 – User registration and first login**
  - Home → Register → submit valid details → successful registration → login → redirected to `/dashboard/user` and see user dashboard UI.
  - Negative: invalid/missing fields are rejected with validation messages and no account is created.

- **S2 – Login, logout, and session persistence**
  - Login with valid credentials → header/user menu updates → refresh page and remain logged in → logout → redirected away from `/dashboard/user` and access is revoked.
  - Negative: wrong password or unknown email shows an error; direct navigation to `/dashboard/user` when logged out redirects to login.

- **S3 – Forgot-password flow**
  - From login, navigate to forgot password page → submit a registered email → see success message and (if implemented) complete the reset flow to log in again.

- **S4 – Home browsing and category navigation**
  - From `/`, view product list → click a product to go to `/product/:slug` → see details.
  - Navigate to `/categories` → click a category → land on `/category/:slug` with products filtered by that category.

- **S5 – Search and filter workflow**
  - Use header search input to search for a keyword → land on `/search` → only matching products are shown.
  - Apply price/category filters (via components like `Prices` or equivalent) and verify results update accordingly and persist across navigation.

- **S6 – Static pages and global navigation (including 404)**
  - Navigate via header/footer to `/about`, `/contact`, `/policy` and back to home, confirming header/footer and layout remain consistent.
  - Visit a non-existent URL and verify the `Pagenotfound` page appears with a working link/button back to home.

- **S7 – Add-to-cart from multiple entry points**
  - As a logged-in user, add items to cart from home, category list, and product details pages.
  - Visit `/cart` to verify correct items, quantities, prices, and totals; modify quantities and remove items and check updates.

- **S8 – Checkout and payment happy path**
  - With a populated cart and logged-in user, proceed from `/cart` to checkout/payment UI (e.g. Braintree).
  - Complete payment using test credentials/token → see success message/redirect → cart is emptied and a new order appears under `/dashboard/user/orders`.

- **S9 – Checkout and cart edge cases**
  - Try to checkout with an empty cart and verify that checkout is disabled or an appropriate message is shown.
  - Remove the last item from the cart and confirm empty-cart state UI.
  - Optional: attempt a failed payment (invalid/cancelled) and verify appropriate error handling in the UI.

- **S10 – Profile update flow**
  - Logged-in user navigates to `/dashboard/user/profile` → updates profile fields (e.g. name, address, password if supported) → sees success message and updated details.
  - Negative: invalid profile input (e.g. too short password) is rejected with clear validation messages.

- **S11 – Orders history and details**
  - After placing an order (from S8), visit `/dashboard/user/orders`.
  - Verify the latest order appears with accurate total, status, and any visible metadata; if supported, open an order to see line-item details.

- **S12 – Admin login and dashboard access control**
  - Log in as an admin user and navigate to `/dashboard/admin` to see admin dashboard cards/links.
  - Negative: log in as a non-admin user and assert attempts to access `/dashboard/admin` or other admin routes redirect or show “unauthorized”.

- **S13 – Category management workflow (admin)**
  - From admin dashboard, go to create category page → create a category → confirm it appears in admin lists and on `/categories` and category dropdowns.
  - Update and delete a category and verify changes are reflected in user-facing category lists and any associated navigation.

- **S14 – Product management workflow (admin)**
  - From admin dashboard, create a product with name, price, category, and photo → confirm it appears on `/`, `/categories`, `/category/:slug`, and `/product/:slug`.
  - From `/dashboard/admin/products` and `/dashboard/admin/product/:slug`, update and delete a product and verify all user-facing views and search results reflect the change.

- **S15 – Admin order lifecycle management**
  - With at least one existing customer order, log in as admin and open `/dashboard/admin/orders`.
  - Change the order status (e.g. Pending → Shipped/Delivered) and verify status updates both in admin view and in the customer’s `/dashboard/user/orders` page.

- **S16 – Admin users overview and access control**
  - Visit `/dashboard/admin/users` as admin and verify user list tables and key information.
  - Attempt to access `/dashboard/admin/users` as a non-admin (or logged-out) user and assert redirect/unauthorized behaviour.
