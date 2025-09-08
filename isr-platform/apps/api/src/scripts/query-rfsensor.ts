import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryRFSensorData() {
  console.log('Querying RFSENSOR data...\n');
  
  try {
    // Check for RFSENSOR devices by phyname
    console.log('=== Devices with phyname containing "RFSENSOR" ===');
    const rfsensorDevices = await prisma.device.findMany({
      where: {
        phyname: {
          contains: 'RFSENSOR',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        basicType: true,
        frequency: true,
        channel: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true,
        signalData: true
      }
    });
    
    console.log(`Found ${rfsensorDevices.length} RFSENSOR devices by phyname:`);
    rfsensorDevices.forEach(device => {
      console.log(`  - ${device.key}: ${device.phyname} (${device.type})`);
    });
    
    // Check for sensor devices by type
    console.log('\n=== Devices with type "sensor" ===');
    const sensorDevices = await prisma.device.findMany({
      where: {
        type: {
          equals: 'sensor',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        basicType: true,
        frequency: true,
        channel: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true,
        signalData: true
      }
    });
    
    console.log(`Found ${sensorDevices.length} sensor devices by type:`);
    sensorDevices.forEach(device => {
      console.log(`  - ${device.key}: ${device.phyname} (${device.type})`);
    });
    
    // Check unique phyname values to understand what RF sensors we have
    console.log('\n=== Unique phyname values (first 20) ===');
    const uniquePhynames = await prisma.$queryRaw<{ phyname: string; count: bigint }[]>`
      SELECT phyname, COUNT(*) as count 
      FROM devices 
      WHERE phyname IS NOT NULL 
      GROUP BY phyname 
      ORDER BY count DESC 
      LIMIT 20
    `;
    
    uniquePhynames.forEach(row => {
      console.log(`  - ${row.phyname}: ${row.count} devices`);
    });
    
    // Check unique type values
    console.log('\n=== Unique type values ===');
    const uniqueTypes = await prisma.$queryRaw<{ type: string; count: bigint }[]>`
      SELECT type, COUNT(*) as count 
      FROM devices 
      WHERE type IS NOT NULL 
      GROUP BY type 
      ORDER BY count DESC
    `;
    
    uniqueTypes.forEach(row => {
      console.log(`  - ${row.type}: ${row.count} devices`);
    });
    
    // Check for any RF-related entries
    console.log('\n=== Devices with RF-related phyname or type ===');
    const rfDevices = await prisma.device.findMany({
      where: {
        OR: [
          { phyname: { contains: 'RF', mode: 'insensitive' } },
          { phyname: { contains: 'sensor', mode: 'insensitive' } },
          { type: { contains: 'RF', mode: 'insensitive' } },
          { type: { contains: 'sensor', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        basicType: true,
        frequency: true,
        channel: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true
      }
    });
    
    console.log(`Found ${rfDevices.length} RF-related devices:`);
    rfDevices.forEach(device => {
      console.log(`  - ${device.key}: ${device.phyname} (${device.type}) - Freq: ${device.frequency}, Ch: ${device.channel}`);
    });
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryRFSensorData();