const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Test Kismet coordinate scaling issue
async function testKismetCoordinates() {
  // Find a Kismet file with GPS data
  const kismetFiles = [
    '/home/kali/kismet_logs/CyberSecResearch-20250830-11-13-00-1.kismet',
    '/home/kali/kismet_logs/CyberSecResearch-20250830-11-04-25-1.kismet',
    '/home/kali/kismet_logs/Kismet-20250827-20-13-38-1.kismet'
  ];

  for (const file of kismetFiles) {
    if (!fs.existsSync(file)) continue;
    
    console.log(`\nChecking file: ${file}`);
    
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
    
    await new Promise((resolve, reject) => {
      db.all(
        `SELECT devmac, avg_lat, avg_lon, min_lat, max_lat, min_lon, max_lon 
         FROM devices 
         WHERE avg_lat IS NOT NULL AND avg_lon IS NOT NULL 
         LIMIT 10`,
        (err, rows) => {
          if (err) {
            console.error('Error:', err);
            reject(err);
            return;
          }
          
          console.log(`Found ${rows.length} devices with GPS data`);
          
          if (rows.length > 0) {
            console.log('\nSample coordinates (raw from database):');
            rows.slice(0, 3).forEach(row => {
              console.log(`  Device: ${row.devmac}`);
              console.log(`    avg_lat: ${row.avg_lat}, avg_lon: ${row.avg_lon}`);
              console.log(`    min_lat: ${row.min_lat}, max_lat: ${row.max_lat}`);
              console.log(`    min_lon: ${row.min_lon}, max_lon: ${row.max_lon}`);
              
              // Check if coordinates look like they need scaling
              if (Math.abs(row.avg_lat) > 180 || Math.abs(row.avg_lon) > 180) {
                console.log('    -> Coordinates appear to be scaled!');
                console.log(`    -> Scaled: lat=${row.avg_lat / 100000}, lon=${row.avg_lon / 100000}`);
              }
            });
          }
          
          resolve();
        }
      );
    });
    
    db.close();
  }
}

testKismetCoordinates().catch(console.error);