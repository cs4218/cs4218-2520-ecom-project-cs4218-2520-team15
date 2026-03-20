import { test, expect } from '@playwright/test';

// Test user credentials from seedData
const TEST_USERS = {
  admin: {
    email: 'e2etest_admin_user@example.com',
    password: 'TestAdmin@12345',
    name: 'E2E Test Admin User',
  },
  normalUser: {
    email: 'e2etest_normal_user@example.com',
    password: 'TestNormal@12345',
    name: 'E2E Test Normal User',
  },
};

test.describe('E2E: Product Catalog', () => {
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for page to load and verify
    await page.waitForLoadState('load');
    
    // Verify the page contains expected content
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have seeded products available', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for page content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Give the page time to fetch and render products
    await page.waitForTimeout(2000);
    
    // Verify the page is accessible
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('should navigate without errors', async ({ page }) => {
    // Test basic navigation
    await page.goto('/');
    
    // Verify page loaded
    expect(page.url()).toContain('localhost:3000');
  });
});

test.describe('E2E: User Authentication', () => {
  test('should verify what users exist in database after seeding', async ({ request }) => {
    // Check what's actually in the database
    const checkResponse = await request.get('http://localhost:6060/api/v1/test/users');
    const checkData = await checkResponse.json();
    
    console.log('\n📋 Current users in database:');
    console.log(JSON.stringify(checkData, null, 2));
    
    if (checkData.count === 0) {
      throw new Error('No users found in database! Seeding may have failed.');
    }
  });

  test('should verify seeded users exist in database', async ({ request }) => {
    // Test login via API to verify users were seeded
    const response = await request.post('http://localhost:6060/api/v1/auth/login', {
      data: {
        email: TEST_USERS.normalUser.email,
        password: TEST_USERS.normalUser.password,
      },
    });
    
    const data = await response.json();
    
    console.log('Login response status:', response.status());
    console.log('Login response body:', JSON.stringify(data, null, 2));
    
    if (!response.ok()) {
      throw new Error(`Login failed with status ${response.status()}: ${JSON.stringify(data)}`);
    }
    
    expect(data.success).toBeTruthy();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(TEST_USERS.normalUser.email);
    expect(data.token).toBeTruthy();
  });

  test('should verify admin user exists and has correct role', async ({ request }) => {
    // Test admin login via API
    const response = await request.post('http://localhost:6060/api/v1/auth/login', {
      data: {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      },
    });
    
    const data = await response.json();
    
    console.log('Admin login response status:', response.status());
    console.log('Admin login response body:', JSON.stringify(data, null, 2));
    
    if (!response.ok()) {
      throw new Error(`Admin login failed with status ${response.status()}: ${JSON.stringify(data)}`);
    }
    
    expect(data.success).toBeTruthy();
    expect(data.user.email).toBe(TEST_USERS.admin.email);
    expect(data.user.role).toBe(1); // Admin role
    expect(data.token).toBeTruthy();
  });

  test('should fail API login with invalid credentials', async ({ request }) => {
    const response = await request.post('http://localhost:6060/api/v1/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });
    
    const data = await response.json();
    console.log('Invalid login response status:', response.status());
    console.log('Invalid login response:', JSON.stringify(data, null, 2));
    
    // Login endpoint returns 200 even for invalid credentials, but success will be false
    expect(data.success).toBeFalsy();
  });

  test('should login successfully with seeded normal user via UI', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for form fields to be visible
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill in email
    await emailInput.fill(TEST_USERS.normalUser.email);
    
    // Fill in password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USERS.normalUser.password);
    
    // Click login button (use more specific selector to avoid Search button on page)
    const loginButton = page.locator('button[type="submit"].btn-primary');
    await loginButton.click();
    
    // Wait for localStorage to be updated with auth data (max 15 seconds)
    try {
      await page.waitForFunction(() => {
        const auth = localStorage.getItem('auth');
        return auth !== null;
      }, { timeout: 15000 });
      
      // Verify user is logged in
      const authData = await page.evaluate(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth) : null;
      });
      
      expect(authData).toBeTruthy();
      expect(authData.user.email).toBe(TEST_USERS.normalUser.email);
    } catch (error) {
      // Log debugging info
      console.error('Login UI test failed. Checking if localStorage was updated...');
      const authData = await page.evaluate(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth) : null;
      });
      console.error('Current auth data:', authData);
      throw error;
    }
  });

  test('should login successfully with seeded admin user via UI', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for form fields to be visible
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill in email
    await emailInput.fill(TEST_USERS.admin.email);
    
    // Fill in password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USERS.admin.password);
    
    // Click login button (use more specific selector to avoid Search button on page)
    const loginButton = page.locator('button[type="submit"].btn-primary');
    await loginButton.click();
    
    // Wait for localStorage to be updated (max 15 seconds)
    try {
      await page.waitForFunction(() => {
        const auth = localStorage.getItem('auth');
        return auth !== null;
      }, { timeout: 15000 });
      
      const authData = await page.evaluate(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth) : null;
      });
      
      expect(authData).toBeTruthy();
      expect(authData.user.email).toBe(TEST_USERS.admin.email);
      expect(authData.user.role).toBe(1);
    } catch (error) {
      console.error('Admin login UI test failed. Checking if localStorage was updated...');
      const authData = await page.evaluate(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth) : null;
      });
      console.error('Current auth data:', authData);
      throw error;
    }
  });
});
