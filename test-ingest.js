// Test ingestion of a Kismet file with real GPS coordinates
const path = require('path');

async function testIngest() {
  // Set up environment
  process.env.DATABASE_URL = 'postgresql://isr_user:isr_password@localhost:5432/isr_db';
  
  // Change to API directory
  process.chdir('/home/kali/wyt-enhanced/isr-platform/apps/api');
  
  const { kismetIngestionService } = require('/home/kali/wyt-enhanced/isr-platform/apps/api/dist/apps/api/src/app/services/kismet-ingestion.service');
  
  // Use a file with real GPS data
  const testFile = '/home/kali/kismet_logs/Kismet-20250827-18-02-57-1.kismet';
  
  console.log('Testing ingestion of:', testFile);
  console.log('This file has GPS coordinates like: 41.580502866, -75.838521766');
  
  try {
    const result = await kismetIngestionService.ingestKismetFile(testFile);
    console.log('\nIngestion result:', result);
  } catch (error) {
    console.error('Ingestion failed:', error.message);
  }
}

testIngest().catch(console.error);