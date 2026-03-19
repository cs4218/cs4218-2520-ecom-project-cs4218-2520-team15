import { request, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  console.log('🚀 Playwright Global Setup Started');
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const API_URL = 'http://localhost:6060';
  
  try {
    // Create an API request context
    const apiContext = await request.newContext();
    
    // Wait for server to be ready
    let serverReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await apiContext.get(`${API_URL}`, { timeout: 5000 });
        if (response.ok()) {
          serverReady = true;
          console.log('✅ Server is ready');
          break;
        }
      } catch (e) {
        // Server not ready yet
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!serverReady) {
      console.error('⚠️  Server failed to start, but continuing...');
    }
    
    // Seed the database via API
    try {
      console.log('🌱 Seeding database...');
      const seedResponse = await apiContext.post(`${API_URL}/api/v1/test/seed`);
      const seedData = await seedResponse.json();
      
      console.log('Seed response status:', seedResponse.status());
      console.log('Seed response body:', JSON.stringify(seedData, null, 2));
      
      if (seedResponse.ok()) {
        console.log('✅ Database seeded successfully');
        console.log('Seeded data:', seedData.data);
      } else {
        console.error('❌ Failed to seed database:', seedData);
      }
    } catch (error) {
      console.error('❌ Error seeding database:', error);
    }
    
    await apiContext.dispose();
  } catch (error) {
    console.error('Error in global setup:', error);
  }
}

export default globalSetup;
