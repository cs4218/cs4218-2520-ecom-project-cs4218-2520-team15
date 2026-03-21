// spec: plan/admin-users-management.plan.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Admin User Management - Login and Users Tab Verification', () => {
  
  test.describe('1. Admin User Login', () => {
    
    test('1.1 Admin user successfully logs in with valid credentials', async ({ page }) => {
      // 1. Navigate to the login page at http://localhost:3000/login
      await page.goto('http://localhost:3000/login');
      
      // Verify login form elements are displayed
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Enter Your Email' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Enter Your Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();

      // 2. Enter admin email 'e2etest_admin_user@example.com' in the email field
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');

      // 3. Enter admin password 'TestAdmin@12345' in the password field
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');

      // 4. Click the LOGIN button
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify successful login - redirected to home page
      await expect(page).toHaveURL('http://localhost:3000/');
      
      // Verify success message is displayed
      await expect(page.getByText('login successfully')).toBeVisible();
      
      // Verify navigation bar shows admin user button
      await expect(page.getByRole('button', { name: 'E2E Test Admin User' })).toBeVisible();
    });

    test('1.2 Admin user login with incorrect email address', async ({ page }) => {
      // 1. Navigate to the login page
      await page.goto('http://localhost:3000/login');
      
      // Verify login form is displayed
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();

      // 2. Enter invalid email 'invalid@example.com'
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('invalid@example.com');

      // 3. Enter any password
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('SomePassword123');

      // 4. Click the LOGIN button
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify user remains on login page
      await expect(page).toHaveURL('http://localhost:3000/login');
      
      // Verify login form is still visible
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
    });

    test('1.3 Admin user login with incorrect password', async ({ page }) => {
      // 1. Navigate to the login page
      await page.goto('http://localhost:3000/login');
      
      // Verify login form is displayed
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();

      // 2. Enter correct admin email
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');

      // 3. Enter incorrect password 'WrongPassword123'
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('WrongPassword123');

      // 4. Click the LOGIN button
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify user remains on login page
      await expect(page).toHaveURL('http://localhost:3000/login');
      
      // Verify login form is still visible
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
    });

    test('1.4 Admin user login with empty email field', async ({ page }) => {
      // 1. Navigate to the login page
      await page.goto('http://localhost:3000/login');
      
      // Verify login form is displayed
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();

      // 2. Leave the email field empty (no action needed)

      // 3. Enter password
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');

      // 4. Click the LOGIN button
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify user remains on login page (form should have validation)
      await expect(page).toHaveURL('http://localhost:3000/login');
      
      // Verify login form is still visible
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
    });

    test('1.5 Admin user login with empty password field', async ({ page }) => {
      // 1. Navigate to the login page
      await page.goto('http://localhost:3000/login');
      
      // Verify login form is displayed
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();

      // 2. Enter email
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');

      // 3. Leave the password field empty (no action needed)

      // 4. Click the LOGIN button
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify user remains on login page
      await expect(page).toHaveURL('http://localhost:3000/login');
      
      // Verify login form is still visible
      await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
    });
  });

  test.describe('2. Admin Dashboard Navigation', () => {
    
    test('2.1 Admin user navigates from home page to admin dashboard', async ({ page }) => {
      // 1. Login as admin using valid credentials
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      // Verify login is successful
      await expect(page).toHaveURL('http://localhost:3000/');
      await expect(page.getByText('login successfully')).toBeVisible();

      // 2. Click on the 'E2E Test Admin User' button in the navigation bar
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      
      // Verify dropdown menu is displayed with Dashboard and Logout options
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();

      // 3. Click on the 'Dashboard' option in the dropdown menu
      await page.getByRole('link', { name: 'Dashboard' }).click();
      
      // Verify redirected to admin dashboard
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin');
      await expect(page).toHaveTitle('Ecommerce app - shop now');
    });

    test('2.2 Admin dashboard displays correct information and menu options', async ({ page }) => {
      // 1. Login as admin and navigate to the admin dashboard
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();

      // 2 & 3. Verify admin dashboard displays correct information and menu options
      // Verify Admin Panel heading
      await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
      
      // Verify navigation links
      await expect(page.getByRole('link', { name: 'Create Category' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create Product' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Products' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
      
      // Verify admin information is displayed correctly
      await expect(page.getByText('Admin Name : E2E Test Admin User')).toBeVisible();
      await expect(page.getByText('Admin Email : e2etest_admin_user@example.com')).toBeVisible();
      await expect(page.getByText('Admin Contact : 91234567')).toBeVisible();
    });

    test('2.3 Non-admin user cannot access admin dashboard', async ({ page }) => {
      // 1. Login as a normal user
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_normal_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestNormal@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      // Verify login is successful
      await expect(page).toHaveURL('http://localhost:3000/');

      // 2. Attempt to navigate directly to admin dashboard
      await page.goto('http://localhost:3000/dashboard/admin');
      
      // User should either be redirected to home page or see error/permission denied
      const adminPanel = page.getByRole('heading', { name: 'Admin Panel' });
      const isVisible = await adminPanel.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });

  test.describe('3. Users Tab and Table Verification', () => {
    
    test('3.1 Admin user navigates to Users tab and views user list table', async ({ page }) => {
      // 1. Login as admin and navigate to the admin dashboard
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();

      // 2. Click on the 'Users' link in the Admin Panel menu
      await page.getByRole('link', { name: 'Users' }).click();
      
      // 3. Verify page heading and table structure
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/users');
      await expect(page).toHaveTitle('Dashboard - All Users');
      
      // Verify 'All Users' heading is displayed
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();
      
      // Verify table with headers is visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Verify table headers
      const headers = page.locator('table thead th');
      await expect(headers).toHaveCount(5);
      await expect(table.getByRole('columnheader', { name: '#' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Phone' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    });

    test('3.2 User list table displays correct admin user information', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // 2. Verify users page is loaded with correct admin user information
      const table = page.locator('table');
      const rows = table.locator('tbody tr');
      const firstRow = rows.first();
      
      // Verify first row (admin user) contains correct information
      await expect(firstRow.locator('td').nth(0)).toContainText('1');
      await expect(firstRow.locator('td').nth(1)).toContainText('E2E Test Admin User');
      await expect(firstRow.locator('td').nth(2)).toContainText('e2etest_admin_user@example.com');
      await expect(firstRow.locator('td').nth(3)).toContainText('91234567');
      await expect(firstRow.locator('td').nth(4)).toContainText('Admin');
    });

    test('3.3 User list table displays correct normal user information', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // 2. Verify users page is loaded with correct normal user information
      const table = page.locator('table');
      const rows = table.locator('tbody tr');
      const secondRow = rows.nth(1);
      
      // Verify second row (normal user) contains correct information
      await expect(secondRow.locator('td').nth(0)).toContainText('2');
      await expect(secondRow.locator('td').nth(1)).toContainText('E2E Test Normal User');
      await expect(secondRow.locator('td').nth(2)).toContainText('e2etest_normal_user@example.com');
      await expect(secondRow.locator('td').nth(3)).toContainText('91237654');
      await expect(secondRow.locator('td').nth(4)).toContainText('User');
    });

    test('3.4 User list table has correct number of columns', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // 2. Count the number of table headers
      const table = page.locator('table');
      const headers = table.locator('thead th');
      await expect(headers).toHaveCount(5);

      // 3. Verify each row has the same number of cells
      const rows = table.locator('tbody tr');
      
      // Verify cell count for each visible row
      const firstRow = rows.first();
      const firstRowCells = firstRow.locator('td');
      await expect(firstRowCells).toHaveCount(5);

      const secondRow = rows.nth(1);
      const secondRowCells = secondRow.locator('td');
      await expect(secondRowCells).toHaveCount(5);
    });

    test('3.5 User list table displays all users from the database', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // 2. Count the number of user rows in the table
      const table = page.locator('table');
      const rows = table.locator('tbody tr');
      
      // Verify exactly 2 user rows are displayed
      await expect(rows).toHaveCount(2);
    });

    test('3.6 Table is responsive and scrollable on smaller viewports', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // 2. Verify the table is wrapped in a responsive container
      const tableContainer = page.locator('.table-responsive');
      await expect(tableContainer).toBeVisible();
      
      // Verify table is inside responsive container
      const table = tableContainer.locator('table');
      await expect(table).toBeVisible();
    });
  });

  test.describe('4. Edge Cases and Error Scenarios', () => {
    
    test('4.1 Users page handles loading state correctly', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // Verify user list table is displayed with data after loading
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(2);
    });

    test('4.2 Users page displays correct role differentiation', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      const table = page.locator('table');
      const rows = table.locator('tbody tr');
      
      // 2. Verify role column displays 'Admin' for admin users (role = 1)
      const adminRow = rows.first();
      await expect(adminRow.locator('td').nth(4)).toContainText('Admin');

      // 3. Verify role column displays 'User' for normal users (role = 0)
      const normalUserRow = rows.nth(1);
      await expect(normalUserRow.locator('td').nth(4)).toContainText('User');
    });

    test('4.3 User list maintains data consistency across page reloads', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // Get initial user list data
      const table = page.locator('table');
      const initialRows = table.locator('tbody tr');
      const initialRowCount = await initialRows.count();
      
      const initialFirstRowText = await initialRows.first().locator('td').nth(1).textContent();

      // 2. Reload the page
      await page.reload();

      // Verify page is reloaded and user list is displayed with same data
      const reloadedTable = page.locator('table');
      const reloadedRows = reloadedTable.locator('tbody tr');
      const reloadedRowCount = await reloadedRows.count();
      
      const reloadedFirstRowText = await reloadedRows.first().locator('td').nth(1).textContent();

      // Verify the same number of users and same data
      expect(reloadedRowCount).toBe(initialRowCount);
      expect(reloadedFirstRowText).toBe(initialFirstRowText);
    });

    test('4.4 Admin user logout and re-login to Users page', async ({ page }) => {
      // 1. Login as admin and navigate to the Users tab
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // Verify users page is displayed
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();

      // 2. Click on the user profile button and select 'Logout'
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Logout' }).click();

      // Verify user is logged out and redirected to login page
      await expect(page).toHaveURL('http://localhost:3000/login');

      // 3. Login again with admin credentials
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();

      // Verify login is successful
      await expect(page).toHaveURL('http://localhost:3000/');

      // 4. Navigate back to the Users tab
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.getByRole('link', { name: 'Users' }).click();

      // Verify users page loads correctly with the same user list data
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/users');
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();
      
      const table = page.locator('table');
      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(2);
    });

    test('4.5 Admin can navigate between dashboard tabs (Products, Orders, Users)', async ({ page }) => {
      // 1. Login as admin and navigate to the admin dashboard
      await page.goto('http://localhost:3000/login');
      await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('e2etest_admin_user@example.com');
      await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('TestAdmin@12345');
      await page.getByRole('button', { name: 'LOGIN' }).click();
      
      await page.getByRole('button', { name: 'E2E Test Admin User' }).click();
      await page.getByRole('link', { name: 'Dashboard' }).click();

      // Verify admin dashboard is displayed
      await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();

      // 2. Click on 'Products' link
      await page.getByRole('link', { name: 'Products' }).click();
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/products');

      // 3. Click on 'Users' link in the menu
      await page.getByRole('link', { name: 'Users' }).click();
      
      // Verify users management page is displayed
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/users');
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();

      const table = page.locator('table');
      await expect(table).toBeVisible();

      // 4. Click on 'Orders' link
      await page.getByRole('link', { name: 'Orders' }).click();
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/orders');

      // 5. Click on 'Users' link again
      await page.getByRole('link', { name: 'Users' }).click();
      
      // Verify users management page is displayed again with the user list table
      await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/users');
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();
      
      const finalTable = page.locator('table');
      await expect(finalTable).toBeVisible();
      
      const rows = finalTable.locator('tbody tr');
      await expect(rows).toHaveCount(2);
    });
  });
});
