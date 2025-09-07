import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import wigleService from '../services/wigle-integration.service';

const router = Router();
const prisma = new PrismaClient();

// Geospatial Intelligence Endpoints

// 14. WiFi networks within geographic bounding box
router.get('/geospatial/networks/bounding-box', async (req: Request, res: Response) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;
    
    if (!minLat || !maxLat || !minLng || !maxLng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: minLat, maxLat, minLng, maxLng' 
      });
    }

    const networks = await prisma.$queryRaw`
      SELECT ssid, bssid, security_type, latitude, longitude, 
             signal_strength, vendor
      FROM wifi_networks 
      WHERE latitude BETWEEN ${parseFloat(minLat as string)} AND ${parseFloat(maxLat as string)}
        AND longitude BETWEEN ${parseFloat(minLng as string)} AND ${parseFloat(maxLng as string)}
      ORDER BY signal_strength DESC
    `;

    return res.json({
      boundingBox: { minLat, maxLat, minLng, maxLng },
      networks,
      count: Array.isArray(networks) ? networks.length : 0
    });
  } catch (error) {
    console.error('Error fetching networks by bounding box:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 15. Bluetooth devices near specific coordinates (within radius)
router.get('/geospatial/bluetooth/radius', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 500 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lng' 
      });
    }

    const devices = await prisma.$queryRaw`
      SELECT bd_address, device_name, vendor, latitude, longitude,
             SQRT(
               POW((latitude - ${parseFloat(lat as string)}) * 111320, 2) + 
               POW((longitude - ${parseFloat(lng as string)}) * 111320 * COS(RADIANS(${parseFloat(lat as string)})), 2)
             ) as distance_meters
      FROM bluetooth_devices 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING distance_meters < ${parseFloat(radius as string)}
      ORDER BY distance_meters
    `;

    return res.json({
      center: { lat: parseFloat(lat as string), lng: parseFloat(lng as string) },
      radiusMeters: parseFloat(radius as string),
      devices,
      count: Array.isArray(devices) ? devices.length : 0
    });
  } catch (error) {
    console.error('Error fetching Bluetooth devices by radius:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 16. Device density by geographic area (grid analysis)
router.get('/geospatial/density/grid', async (req: Request, res: Response) => {
  try {
    const { precision = 3, minDevices = 5 } = req.query;
    const precisionValue = parseInt(precision as string);

    const gridData = await prisma.$queryRaw`
      SELECT 
          ROUND(latitude::numeric, ${precisionValue}::int)::float as lat_grid,
          ROUND(longitude::numeric, ${precisionValue}::int)::float as lon_grid,
          COUNT(DISTINCT client_mac)::int as wifi_devices,
          COUNT(DISTINCT bd_address)::int as bluetooth_devices,
          (COUNT(DISTINCT client_mac) + COUNT(DISTINCT bd_address))::int as total_devices
      FROM (
          SELECT client_mac, NULL::macaddr as bd_address, latitude, longitude FROM wifi_clients
          UNION ALL
          SELECT NULL::macaddr as client_mac, bd_address, latitude, longitude FROM bluetooth_devices
      ) combined
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY lat_grid, lon_grid
      HAVING COUNT(*) > ${parseInt(minDevices as string)}
      ORDER BY total_devices DESC
    `;

    return res.json({
      gridPrecision: precisionValue,
      minDevicesFilter: parseInt(minDevices as string),
      gridCells: gridData,
      totalCells: Array.isArray(gridData) ? gridData.length : 0
    });
  } catch (error) {
    console.error('Error generating device density grid:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 17. Coverage analysis by signal strength zones
router.get('/geospatial/coverage/signal-zones', async (req: Request, res: Response) => {
  try {
    const signalZones = await prisma.$queryRaw`
      SELECT 
          CASE 
              WHEN signal_strength > -50 THEN 'Excellent (-50 to 0 dBm)'
              WHEN signal_strength > -60 THEN 'Good (-60 to -50 dBm)'  
              WHEN signal_strength > -70 THEN 'Fair (-70 to -60 dBm)'
              WHEN signal_strength > -80 THEN 'Poor (-80 to -70 dBm)'
              ELSE 'Very Poor (< -80 dBm)'
          END as signal_zone,
          COUNT(*)::int as network_count,
          ROUND(AVG(signal_strength)::numeric, 1)::float as avg_signal,
          MIN(signal_strength)::int as min_signal,
          MAX(signal_strength)::int as max_signal
      FROM wifi_networks
      WHERE signal_strength IS NOT NULL
      GROUP BY signal_zone
      ORDER BY AVG(signal_strength) DESC
    `;

    return res.json({
      signalZones,
      totalNetworks: Array.isArray(signalZones) 
        ? signalZones.reduce((sum: number, zone: any) => sum + parseInt(zone.network_count), 0)
        : 0
    });
  } catch (error) {
    console.error('Error analyzing signal coverage zones:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Additional geospatial endpoints for enhanced intelligence

// Get WiFi networks and Bluetooth devices within a polygon area
router.post('/geospatial/devices/polygon', async (req: Request, res: Response) => {
  try {
    const { polygon } = req.body; // Array of [lat, lng] coordinates
    
    if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
      return res.status(400).json({ 
        error: 'Invalid polygon: must be array of at least 3 [lat, lng] coordinates' 
      });
    }

    // Convert polygon to PostGIS format
    const polygonWKT = `POLYGON((${polygon.map(([lat, lng]: [number, number]) => `${lng} ${lat}`).join(', ')}, ${polygon[0][1]} ${polygon[0][0]}))`;

    const devices = await prisma.$queryRaw`
      SELECT 
        'wifi' as device_type,
        bssid::text as identifier,
        ssid as name,
        security_type as details,
        signal_strength,
        latitude,
        longitude,
        vendor,
        last_seen
      FROM wifi_networks 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND ST_Contains(ST_GeomFromText(${polygonWKT}, 4326), ST_Point(longitude, latitude))
      
      UNION ALL
      
      SELECT 
        'bluetooth' as device_type,
        bd_address::text as identifier,
        device_name as name,
        device_type as details,
        rssi as signal_strength,
        latitude,
        longitude,
        vendor,
        last_seen
      FROM bluetooth_devices
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND ST_Contains(ST_GeomFromText(${polygonWKT}, 4326), ST_Point(longitude, latitude))
      
      ORDER BY last_seen DESC
    `;

    return res.json({
      polygon,
      devices,
      counts: {
        wifi: Array.isArray(devices) ? devices.filter((d: any) => d.device_type === 'wifi').length : 0,
        bluetooth: Array.isArray(devices) ? devices.filter((d: any) => d.device_type === 'bluetooth').length : 0,
        total: Array.isArray(devices) ? devices.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching devices within polygon:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get heatmap data for signal strength visualization
router.get('/geospatial/heatmap/signal', async (req: Request, res: Response) => {
  try {
    const { bounds, gridSize = 0.001 } = req.query;
    let whereClause = '';
    let params: any[] = [];

    if (bounds) {
      const { minLat, maxLat, minLng, maxLng } = JSON.parse(bounds as string);
      whereClause = `WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`;
      params = [minLat, maxLat, minLng, maxLng];
    }

    const heatmapData = await prisma.$queryRawUnsafe(`
      SELECT 
        ROUND(latitude / ${gridSize}) * ${gridSize} as lat,
        ROUND(longitude / ${gridSize}) * ${gridSize} as lng,
        AVG(signal_strength) as avg_signal,
        COUNT(*) as count,
        MAX(signal_strength) as max_signal,
        MIN(signal_strength) as min_signal
      FROM wifi_networks 
      ${whereClause}
      AND latitude IS NOT NULL AND longitude IS NOT NULL AND signal_strength IS NOT NULL
      GROUP BY lat, lng
      HAVING COUNT(*) >= 1
      ORDER BY avg_signal DESC
    `, ...params);

    return res.json({
      gridSize: parseFloat(gridSize as string),
      bounds: bounds ? JSON.parse(bounds as string) : null,
      heatmapPoints: heatmapData,
      totalPoints: Array.isArray(heatmapData) ? heatmapData.length : 0
    });
  } catch (error) {
    console.error('Error generating signal heatmap:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// WIGLE API Integration Endpoints

// Search Wigle for networks near coordinates
router.get('/wigle/search', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 0.01, maxResults = 100 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lng' 
      });
    }

    const result = await wigleService.searchNetworksByLocation(
      parseFloat(lat as string),
      parseFloat(lng as string),
      parseFloat(radius as string),
      parseInt(maxResults as string)
    );

    if (!result) {
      return res.status(429).json({ 
        error: 'Wigle API rate limit exceeded or service unavailable',
        suggestion: 'Try again later or use cached data'
      });
    }

    return res.json({
      query: { lat: parseFloat(lat as string), lng: parseFloat(lng as string), radius: parseFloat(radius as string) },
      ...result
    });
  } catch (error) {
    console.error('Error in Wigle search:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrich local networks with Wigle data
router.post('/wigle/enrich', async (req: Request, res: Response) => {
  try {
    const { boundingBox } = req.body;
    
    if (!boundingBox || !boundingBox.minLat || !boundingBox.maxLat || !boundingBox.minLng || !boundingBox.maxLng) {
      return res.status(400).json({ 
        error: 'Missing required boundingBox: {minLat, maxLat, minLng, maxLng}' 
      });
    }

    const result = await wigleService.enrichLocalNetworks(boundingBox);
    
    return res.json({
      message: 'Network enrichment completed',
      boundingBox,
      ...result
    });
  } catch (error) {
    console.error('Error in Wigle enrichment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Wigle API usage statistics
router.get('/wigle/stats', async (req: Request, res: Response) => {
  try {
    const stats = await wigleService.getApiStats();
    return res.json(stats);
  } catch (error) {
    console.error('Error getting Wigle stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear expired Wigle cache
router.delete('/wigle/cache/expired', async (req: Request, res: Response) => {
  try {
    const cleared = await wigleService.clearExpiredCache();
    return res.json({ 
      message: 'Expired cache cleared',
      entriesCleared: cleared 
    });
  } catch (error) {
    console.error('Error clearing Wigle cache:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced geospatial endpoint with Wigle enrichment
router.get('/geospatial/networks/enhanced', async (req: Request, res: Response) => {
  try {
    const { minLat, maxLat, minLng, maxLng, includeWigle = 'false' } = req.query;
    
    if (!minLat || !maxLat || !minLng || !maxLng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: minLat, maxLat, minLng, maxLng' 
      });
    }

    // Get local networks
    const localNetworks = await prisma.$queryRaw`
      SELECT ssid, bssid, security_type, latitude, longitude, 
             signal_strength, vendor, last_seen, 'local' as source
      FROM wifi_networks 
      WHERE latitude BETWEEN ${parseFloat(minLat as string)} AND ${parseFloat(maxLat as string)}
        AND longitude BETWEEN ${parseFloat(minLng as string)} AND ${parseFloat(maxLng as string)}
      ORDER BY signal_strength DESC
    `;

    let combinedResults = Array.isArray(localNetworks) ? [...localNetworks] : [];

    // Optionally include Wigle data
    if (includeWigle === 'true') {
      const centerLat = (parseFloat(minLat as string) + parseFloat(maxLat as string)) / 2;
      const centerLng = (parseFloat(minLng as string) + parseFloat(maxLng as string)) / 2;
      const radius = Math.max(
        Math.abs(parseFloat(maxLat as string) - parseFloat(minLat as string)),
        Math.abs(parseFloat(maxLng as string) - parseFloat(minLng as string))
      ) / 2;

      const wigleData = await wigleService.searchNetworksByLocation(centerLat, centerLng, radius, 200);
      
      if (wigleData?.results) {
        const wigleNetworks = wigleData.results.map((network: any) => ({
          ssid: network.ssid,
          bssid: network.bssid,
          security_type: network.security,
          latitude: network.latitude,
          longitude: network.longitude,
          signal_strength: network.signal,
          vendor: network.vendor || null,
          last_seen: new Date(network.lastupdt),
          source: 'wigle'
        }));
        
        combinedResults.push(...wigleNetworks);
      }
    }

    return res.json({
      boundingBox: { minLat, maxLat, minLng, maxLng },
      networks: combinedResults,
      counts: {
        local: Array.isArray(localNetworks) ? localNetworks.length : 0,
        wigle: includeWigle === 'true' ? combinedResults.length - (Array.isArray(localNetworks) ? localNetworks.length : 0) : 0,
        total: combinedResults.length
      }
    });
  } catch (error) {
    console.error('Error fetching enhanced networks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;