import { request, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Playwright Global Teardown Started');
  
  const API_URL = 'http://localhost:6060';
  
  try {
    // Create an API request context
    const apiContext = await request.newContext();
    
    // Clear the database via API
    try {
      console.log('🗑️  Clearing test database...');
      const teardownResponse = await apiContext.post(`${API_URL}/api/v1/test/teardown`);
      const teardownData = await teardownResponse.json();
      
      if (teardownResponse.ok()) {
        console.log('✅ Database cleared successfully');
      } else {
        console.error('❌ Failed to clear database:', teardownData);
      }
    } catch (error) {
      console.error('❌ Error clearing database:', error);
    }
    
    await apiContext.dispose();
  } catch (error) {
    console.error('Error in global teardown:', error);
  }
}

export default globalTeardown;
