# Admin User Management - Login and Users Tab Verification Test Plan

## Application Overview

This test plan covers the complete user flow for admin users logging into the e-commerce application, navigating to the admin dashboard, accessing the users management tab, and verifying the user list table with all key information displayed correctly. The application is an e-commerce platform (Virtual Vault) with role-based access control, allowing administrators to manage users, products, categories, and orders.

## Test Scenarios

### 1. Admin User Login

**Seed:** `seed.spec.ts`

#### 1.1. Admin user successfully logs in with valid credentials

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Navigate to the login page at http://localhost:3000/login
    - expect: The page displays the LOGIN FORM heading
    - expect: Email input field is visible with placeholder 'Enter Your Email'
    - expect: Password input field is visible with placeholder 'Enter Your Password'
    - expect: LOGIN button is present and clickable
  2. Enter admin email 'e2etest_admin_user@example.com' in the email field
    - expect: The email address is entered correctly in the input field
  3. Enter admin password 'TestAdmin@12345' in the password field
    - expect: The password is entered in the input field (shown as dots/masked)
  4. Click the LOGIN button
    - expect: The page redirects to the home page (http://localhost:3000/)
    - expect: A success message 'login successfully' is displayed
    - expect: The navigation bar now shows 'E2E Test Admin User' button instead of Login/Register links

#### 1.2. Admin user login with incorrect email address

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: The login form is displayed
  2. Enter invalid email 'invalid@example.com' in the email field
    - expect: The email is entered in the input field
  3. Enter any password in the password field
    - expect: The password is entered
  4. Click the LOGIN button
    - expect: An error message is displayed indicating invalid credentials or user not found
    - expect: The user remains on the login page

#### 1.3. Admin user login with incorrect password

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: The login form is displayed
  2. Enter correct admin email 'e2etest_admin_user@example.com'
    - expect: The email is entered correctly
  3. Enter incorrect password 'WrongPassword123' in the password field
    - expect: The password is entered
  4. Click the LOGIN button
    - expect: An error message is displayed indicating invalid credentials
    - expect: The user remains on the login page

#### 1.4. Admin user login with empty email field

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: The login form is displayed
  2. Leave the email field empty
    - expect: The email field remains empty
  3. Enter password 'TestAdmin@12345' in the password field
    - expect: The password is entered
  4. Click the LOGIN button
    - expect: An error message is displayed
    - expect: The user remains on the login page

#### 1.5. Admin user login with empty password field

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: The login form is displayed
  2. Enter email 'e2etest_admin_user@example.com' in the email field
    - expect: The email is entered correctly
  3. Leave the password field empty
    - expect: The password field remains empty
  4. Click the LOGIN button
    - expect: An error message is displayed
    - expect: The user remains on the login page

### 2. Admin Dashboard Navigation

**Seed:** `seed.spec.ts`

#### 2.1. Admin user navigates from home page to admin dashboard

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin using valid credentials (email: e2etest_admin_user@example.com, password: TestAdmin@12345)
    - expect: Login is successful and user is redirected to home page
  2. Click on the 'E2E Test Admin User' button in the navigation bar
    - expect: A dropdown menu is displayed
    - expect: The dropdown contains 'Dashboard' and 'Logout' options
  3. Click on the 'Dashboard' option in the dropdown menu
    - expect: The user is redirected to the admin dashboard (URL: http://localhost:3000/dashboard/admin)
    - expect: The page title shows 'Ecommerce app - shop now'

#### 2.2. Admin dashboard displays correct information and menu options

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the admin dashboard
    - expect: The admin dashboard page is loaded
  2. Observe the Admin Panel section
    - expect: 'Admin Panel' heading is visible
    - expect: Navigation links are available: Create Category, Create Product, Products, Orders, Users
  3. Verify admin information displayed on the dashboard
    - expect: Admin name displays correctly: 'Admin Name : E2E Test Admin User'
    - expect: Admin email displays correctly: 'Admin Email : e2etest_admin_user@example.com'
    - expect: Admin contact displays correctly: 'Admin Contact : 91234567'

#### 2.3. Non-admin user cannot access admin dashboard

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as a normal user (email: e2etest_normal_user@example.com, password: TestNormal@12345)
    - expect: Login is successful
  2. Attempt to navigate directly to admin dashboard URL (http://localhost:3000/dashboard/admin)
    - expect: User is not allowed to access the dashboard
    - expect: User is either redirected to home page or shown an error/permission denied message

### 3. Users Tab and Table Verification

**Seed:** `seed.spec.ts`

#### 3.1. Admin user navigates to Users tab and views user list table

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the admin dashboard
    - expect: Admin dashboard is displayed
  2. Click on the 'Users' link in the Admin Panel menu
    - expect: The user is redirected to the users management page (URL: http://localhost:3000/dashboard/admin/users)
    - expect: The page title shows 'Dashboard - All Users'
  3. Verify the page heading and table structure
    - expect: 'All Users' heading is displayed
    - expect: A table with headers is visible: #, Name, Email, Phone, Role

#### 3.2. User list table displays correct admin user information

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is loaded with the user list table
  2. Observe the first row in the user list table (admin user row)
    - expect: Row number displays as '1'
    - expect: Name displays as 'E2E Test Admin User'
    - expect: Email displays as 'e2etest_admin_user@example.com'
    - expect: Phone displays as '91234567'
    - expect: Role displays as 'Admin'

#### 3.3. User list table displays correct normal user information

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is loaded with the user list table
  2. Observe the second row in the user list table (normal user row)
    - expect: Row number displays as '2'
    - expect: Name displays as 'E2E Test Normal User'
    - expect: Email displays as 'e2etest_normal_user@example.com'
    - expect: Phone displays as '91237654'
    - expect: Role displays as 'User'

#### 3.4. User list table has correct number of columns

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is displayed
  2. Count the number of table headers
    - expect: Exactly 5 column headers are present: #, Name, Email, Phone, Role
  3. Verify each row has the same number of cells
    - expect: Each user row contains exactly 5 cells corresponding to the 5 headers

#### 3.5. User list table displays all users from the database

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is loaded
  2. Count the number of user rows in the table (excluding header)
    - expect: Exactly 2 user rows are displayed (admin user and normal user)

#### 3.6. Table is responsive and scrollable on smaller viewports

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is displayed
  2. Verify the table container has responsive styling
    - expect: The table is wrapped in a responsive container
    - expect: On smaller screens, the table remains accessible (either through horizontal scroll or responsive layout)

### 4. Edge Cases and Error Scenarios

**Seed:** `seed.spec.ts`

#### 4.1. Users page displays 'No users found' when database is empty

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Clear all users from the database (simulating no users scenario)
    - expect: Database is empty
  2. Create a new admin test user and login
    - expect: Admin login is successful
  3. Navigate to the Users tab
    - expect: The table body shows a single row with message 'No users found' spanning all 5 columns

#### 4.2. Users page handles loading state correctly

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: Initially, a 'Loading...' message may be briefly displayed while users are being fetched
    - expect: After loading completes, the user list table is displayed with data

#### 4.3. Users page displays correct role differentiation

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: The users page is displayed
  2. Verify role column displays 'Admin' for admin users (role = 1)
    - expect: Admin user row shows 'Admin' in the Role column
  3. Verify role column displays 'User' for normal users (role = 0)
    - expect: Normal user row shows 'User' in the Role column

#### 4.4. User list maintains data consistency across page reloads

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: User list is displayed with 2 users
  2. Reload the page (F5 or Ctrl+R)
    - expect: Page is reloaded and user list is displayed again
    - expect: The same 2 users are shown with identical information

#### 4.5. Admin user logout and re-login to Users page

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the Users tab
    - expect: Users page is displayed
  2. Click on the user profile button and select 'Logout'
    - expect: User is logged out and redirected to login page
  3. Login again with admin credentials
    - expect: Login is successful
  4. Navigate back to the Users tab
    - expect: Users page loads correctly with the same user list data

#### 4.6. Admin can navigate between dashboard tabs (Products, Orders, Users)

**File:** `./__tests__/e2e/admin-users-management.spec.ts`

**Steps:**
  1. Login as admin and navigate to the admin dashboard
    - expect: Admin dashboard is displayed
  2. Click on 'Products' link
    - expect: Products management page is displayed
  3. Click on 'Users' link in the menu
    - expect: Users management page is displayed with the user list table
  4. Click on 'Orders' link
    - expect: Orders management page is displayed
  5. Click on 'Users' link again
    - expect: Users management page is displayed with the user list table
