import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRFSensorCorrelations() {
  console.log('Analyzing RFSENSOR data correlations...\n');
  
  try {
    // Get detailed RFSENSOR data with geographic and temporal information
    const rfsensorDevices = await prisma.device.findMany({
      where: {
        phyname: 'RFSENSOR'
      },
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true,
        altitude: true,
        signalData: true,
        location: true,
        minLatitude: true,
        maxLatitude: true,
        minLongitude: true,
        maxLongitude: true,
        frequency: true,
        channel: true,
        sightings: {
          select: {
            timestamp: true,
            latitude: true,
            longitude: true,
            altitude: true,
            signalStrength: true
          }
        }
      }
    });
    
    console.log(`=== TEMPORAL ANALYSIS ===`);
    console.log(`Total RFSENSOR devices: ${rfsensorDevices.length}`);
    
    // Temporal analysis
    const validTimes = rfsensorDevices.filter(d => d.firstTime && d.lastTime);
    if (validTimes.length > 0) {
      const firstTimestamp = Math.min(...validTimes.map(d => d.firstTime!.getTime()));
      const lastTimestamp = Math.max(...validTimes.map(d => d.lastTime!.getTime()));
      const totalDuration = lastTimestamp - firstTimestamp;
      
      console.log(`Collection period: ${new Date(firstTimestamp).toISOString()} to ${new Date(lastTimestamp).toISOString()}`);
      console.log(`Total duration: ${Math.round(totalDuration / (1000 * 60 * 60 * 24))} days`);
      console.log(`Devices with valid timestamps: ${validTimes.length}/${rfsensorDevices.length}`);
      
      // Activity distribution by hour
      const hourCounts: { [key: number]: number } = {};
      validTimes.forEach(device => {
        const hour = device.firstTime!.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      console.log('\nActivity by hour of day:');
      for (let hour = 0; hour < 24; hour++) {
        const count = hourCounts[hour] || 0;
        const bar = '█'.repeat(Math.round(count / 5));
        console.log(`  ${hour.toString().padStart(2, '0')}:00 - ${count.toString().padStart(3)} devices ${bar}`);
      }
    }
    
    console.log(`\n=== GEOGRAPHIC ANALYSIS ===`);
    
    // Geographic analysis
    const geoDevices = rfsensorDevices.filter(d => d.latitude && d.longitude);
    console.log(`Devices with GPS coordinates: ${geoDevices.length}/${rfsensorDevices.length}`);
    
    if (geoDevices.length > 0) {
      const lats = geoDevices.map(d => parseFloat(d.latitude!.toString()));
      const lons = geoDevices.map(d => parseFloat(d.longitude!.toString()));
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      console.log(`Geographic bounds:`);
      console.log(`  Latitude: ${minLat.toFixed(6)} to ${maxLat.toFixed(6)}`);
      console.log(`  Longitude: ${minLon.toFixed(6)} to ${maxLon.toFixed(6)}`);
      console.log(`  Coverage area: ~${((maxLat - minLat) * 111).toFixed(1)}km x ${((maxLon - minLon) * 111 * Math.cos(minLat * Math.PI / 180)).toFixed(1)}km`);
      
      // Geographic clustering analysis
      const clusters = analyzeGeographicClusters(geoDevices.map(d => ({
        lat: parseFloat(d.latitude!.toString()),
        lon: parseFloat(d.longitude!.toString()),
        key: d.key
      })));
      
      console.log(`\nGeographic clustering (within 1km):`);
      console.log(`  Found ${clusters.length} clusters`);
      clusters.forEach((cluster, i) => {
        console.log(`  Cluster ${i + 1}: ${cluster.length} devices`);
      });
    }
    
    console.log(`\n=== SIGNAL DATA ANALYSIS ===`);
    
    // Signal data analysis
    const signalDevices = rfsensorDevices.filter(d => d.signalData);
    console.log(`Devices with signal data: ${signalDevices.length}/${rfsensorDevices.length}`);
    
    if (signalDevices.length > 0) {
      console.log('\nSample signal data structures:');
      signalDevices.slice(0, 3).forEach((device, i) => {
        console.log(`  Device ${i + 1} (${device.key}):`);
        console.log(`    Signal data: ${JSON.stringify(device.signalData).substring(0, 200)}...`);
      });
    }
    
    console.log(`\n=== SIGHTINGS ANALYSIS ===`);
    
    // Analyze sightings for RFSENSOR devices
    const devicesWithSightings = rfsensorDevices.filter(d => d.sightings.length > 0);
    console.log(`Devices with sightings: ${devicesWithSightings.length}/${rfsensorDevices.length}`);
    
    if (devicesWithSightings.length > 0) {
      const totalSightings = devicesWithSightings.reduce((sum, d) => sum + d.sightings.length, 0);
      const avgSightings = totalSightings / devicesWithSightings.length;
      
      console.log(`Total sightings: ${totalSightings}`);
      console.log(`Average sightings per device: ${avgSightings.toFixed(1)}`);
      
      // Sighting signal strength analysis
      const sightingsWithSignal = devicesWithSightings.flatMap(d => d.sightings).filter(s => s.signalStrength !== null);
      if (sightingsWithSignal.length > 0) {
        const signalStrengths = sightingsWithSignal.map(s => s.signalStrength!);
        const minSignal = Math.min(...signalStrengths);
        const maxSignal = Math.max(...signalStrengths);
        const avgSignal = signalStrengths.reduce((sum, s) => sum + s, 0) / signalStrengths.length;
        
        console.log(`Signal strength range: ${minSignal} to ${maxSignal} dBm`);
        console.log(`Average signal strength: ${avgSignal.toFixed(1)} dBm`);
      }
    }
    
    console.log(`\n=== KEY PATTERN ANALYSIS ===`);
    
    // Analyze key patterns
    const keyPatterns = analyzeKeyPatterns(rfsensorDevices.map(d => d.key));
    console.log(`Key pattern analysis:`);
    console.log(`  Common prefix: ${keyPatterns.commonPrefix}`);
    console.log(`  Unique suffixes: ${keyPatterns.uniqueSuffixes}`);
    console.log(`  Average suffix length: ${keyPatterns.avgSuffixLength.toFixed(1)}`);
    
  } catch (error) {
    console.error('Error analyzing RFSENSOR data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function analyzeGeographicClusters(points: { lat: number; lon: number; key: string }[], thresholdKm: number = 1): string[][] {
  const clusters: string[][] = [];
  const visited = new Set<string>();
  
  points.forEach(point => {
    if (visited.has(point.key)) return;
    
    const cluster: string[] = [point.key];
    visited.add(point.key);
    
    points.forEach(otherPoint => {
      if (visited.has(otherPoint.key)) return;
      
      const distance = calculateDistance(point.lat, point.lon, otherPoint.lat, otherPoint.lon);
      if (distance <= thresholdKm) {
        cluster.push(otherPoint.key);
        visited.add(otherPoint.key);
      }
    });
    
    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  });
  
  return clusters;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function analyzeKeyPatterns(keys: string[]): {
  commonPrefix: string;
  uniqueSuffixes: number;
  avgSuffixLength: number;
} {
  if (keys.length === 0) return { commonPrefix: '', uniqueSuffixes: 0, avgSuffixLength: 0 };
  
  // Find common prefix
  let commonPrefix = keys[0];
  for (let i = 1; i < keys.length; i++) {
    let j = 0;
    while (j < Math.min(commonPrefix.length, keys[i].length) && 
           commonPrefix[j] === keys[i][j]) {
      j++;
    }
    commonPrefix = commonPrefix.substring(0, j);
  }
  
  // Analyze suffixes
  const suffixes = keys.map(key => key.substring(commonPrefix.length));
  const uniqueSuffixes = new Set(suffixes).size;
  const avgSuffixLength = suffixes.reduce((sum, suffix) => sum + suffix.length, 0) / suffixes.length;
  
  return { commonPrefix, uniqueSuffixes, avgSuffixLength };
}

analyzeRFSensorCorrelations();