import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const prisma = new PrismaClient();

async function getCurrentCounts() {
  const [deviceCount, sightingCount, analysisCount] = await Promise.all([
    prisma.device.count(),
    prisma.sighting.count(),
    prisma.analysisResult.count(),
  ]);

  return {
    devices: deviceCount,
    sightings: sightingCount,
    analysisResults: analysisCount,
  };
}

async function exportDataToJSON() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'db-backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  console.log(`\nExporting data to ${backupFile}...`);

  const [devices, sightings, analysisResults] = await Promise.all([
    prisma.device.findMany({ include: { sightings: true, analysisResults: true } }),
    prisma.sighting.findMany(),
    prisma.analysisResult.findMany(),
  ]);

  const backupData = {
    timestamp,
    counts: await getCurrentCounts(),
    data: {
      devices,
      sightings,
      analysisResults,
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  const fileSize = fs.statSync(backupFile).size;
  console.log(`✓ Backup created successfully (${(fileSize / 1024).toFixed(2)} KB)`);
  
  return backupFile;
}

async function purgeAllDataForce() {
  console.log('\n=== ISR Platform Data Purge Utility (FORCE MODE) ===');
  console.log('This will remove ALL processed data from the database.\n');

  try {
    // Show current counts
    const counts = await getCurrentCounts();
    console.log('Current database contents:');
    console.log(`  - Devices: ${counts.devices}`);
    console.log(`  - Sightings: ${counts.sightings}`);
    console.log(`  - Analysis Results: ${counts.analysisResults}`);

    if (counts.devices === 0 && counts.sightings === 0 && counts.analysisResults === 0) {
      console.log('\n✓ Database is already empty. No purge needed.');
      process.exit(0);
    }

    // Create backup
    console.log('\nStep 1: Creating backup...');
    const backupFile = await exportDataToJSON();

    // Perform purge
    console.log('\nStep 2: Purging data...');
    
    // Delete in correct order due to foreign key constraints
    console.log('  - Deleting analysis results...');
    const deletedAnalysis = await prisma.analysisResult.deleteMany();
    console.log(`    ✓ Deleted ${deletedAnalysis.count} analysis results`);

    console.log('  - Deleting sightings...');
    const deletedSightings = await prisma.sighting.deleteMany();
    console.log(`    ✓ Deleted ${deletedSightings.count} sightings`);

    console.log('  - Deleting devices...');
    const deletedDevices = await prisma.device.deleteMany();
    console.log(`    ✓ Deleted ${deletedDevices.count} devices`);

    // Verify cleanup
    console.log('\nStep 3: Verifying cleanup...');
    const finalCounts = await getCurrentCounts();
    console.log('Final database contents:');
    console.log(`  - Devices: ${finalCounts.devices}`);
    console.log(`  - Sightings: ${finalCounts.sightings}`);
    console.log(`  - Analysis Results: ${finalCounts.analysisResults}`);

    console.log('\n=== Purge Complete ===');
    console.log(`✓ All data has been removed from the database`);
    console.log(`✓ Backup saved at: ${backupFile}`);
    console.log('\nYou can now re-run the ingestion service with the corrected processing logic.');

  } catch (error) {
    console.error('\n✗ Error during purge:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  purgeAllDataForce();
}

export { purgeAllDataForce, getCurrentCounts, exportDataToJSON };