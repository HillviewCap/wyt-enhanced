import { Router, Request, Response } from 'express';
import { prisma } from '../data-access';

const router = Router();

const safePromise = <T>(promise: Promise<T>): Promise<[T | null, any | null]> => {
  return promise
    .then(data => [data, null] as [T, null])
    .catch(error => [null, error] as [null, any]);
};

// GET /api/mobility/health - Health check for mobility routes
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Quick check that we can query the database
    const result = await prisma.$queryRaw<Array<{ table_exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'device_signatures'
      ) as table_exists
    `;

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tables_ready: result[0]?.table_exists || false
    });
  } catch (error) {
    console.error('Mobility health check failed:', error);
    return res.status(503).json({
      status: 'error',
      message: 'Mobility tracking tables not ready'
    });
  }
});

// GET /api/mobility/signatures - List device signatures with filtering
router.get('/signatures', async (req: Request, res: Response) => {
  try {
    const {
      min_confidence = '0.7',
      min_locations = '2',
      signature_hash,
      client_mac,
      limit = '1000',
      offset = '0',
      bbox,
    } = req.query;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    whereConditions.push(`confidence_score >= $${paramIndex}`);
    queryParams.push(parseFloat(min_confidence as string));
    paramIndex++;

    whereConditions.push(`location_count >= $${paramIndex}`);
    queryParams.push(parseInt(min_locations as string));
    paramIndex++;

    if (signature_hash) {
      whereConditions.push(`signature_hash = $${paramIndex}`);
      queryParams.push(signature_hash);
      paramIndex++;
    }

    if (client_mac) {
      whereConditions.push(`client_mac = $${paramIndex}::macaddr`);
      queryParams.push(client_mac);
      paramIndex++;
    }

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(locations_json) AS loc
          WHERE (loc->>0)::numeric BETWEEN $${paramIndex} AND $${paramIndex + 1}
          AND (loc->>1)::numeric BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}
        )
      `);
      queryParams.push(minLat, maxLat, minLon, maxLon);
      paramIndex += 4;
    }

    const whereClause = whereConditions.join(' AND ');

    const signatures = await prisma.$queryRawUnsafe<Array<{
      id: string;
      client_mac: string;
      signature_hash: string;
      ssids_json: any;
      confidence_score: number;
      location_count: number;
      locations_json: any;
      first_seen: Date;
      last_seen: Date;
      total_probes: number;
    }>>(`
      SELECT
        id,
        client_mac::text as client_mac,
        signature_hash,
        ssids_json,
        confidence_score,
        location_count,
        locations_json,
        first_seen,
        last_seen,
        total_probes
      FROM device_signatures
      WHERE ${whereClause}
      ORDER BY confidence_score DESC, location_count DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, parseInt(limit as string), parseInt(offset as string));

    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::integer as count
      FROM device_signatures
      WHERE ${whereClause}
    `, ...queryParams);
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      signatures: signatures.map(sig => ({
        id: sig.id,
        clientMac: sig.client_mac,
        signatureHash: sig.signature_hash,
        ssids: sig.ssids_json,
        confidenceScore: sig.confidence_score,
        locationCount: sig.location_count,
        locations: sig.locations_json,
        firstSeen: sig.first_seen?.toISOString(),
        lastSeen: sig.last_seen?.toISOString(),
        totalProbes: sig.total_probes,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch device signatures:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/signatures/:hash - Get signature details and related MACs
router.get('/signatures/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    // Get all devices with this signature
    const devices = await prisma.$queryRaw<Array<{
      id: string;
      client_mac: string;
      confidence_score: number;
      location_count: number;
      ssids_json: any;
      locations_json: any;
      first_seen: Date;
      last_seen: Date;
      total_probes: number;
    }>>`
      SELECT
        id,
        client_mac::text as client_mac,
        confidence_score,
        location_count,
        ssids_json,
        locations_json,
        first_seen,
        last_seen,
        total_probes
      FROM device_signatures
      WHERE signature_hash = ${hash}
      ORDER BY last_seen DESC
    `;

    if (devices.length === 0) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Get mobility events for this signature
    const events = await prisma.$queryRaw<Array<{
      id: string;
      from_latitude: number;
      from_longitude: number;
      to_latitude: number;
      to_longitude: number;
      distance_meters: number;
      time_delta_seconds: number;
      speed_kmh: number;
      event_timestamp: Date;
      client_macs: string[];
    }>>`
      SELECT
        id,
        from_latitude,
        from_longitude,
        to_latitude,
        to_longitude,
        distance_meters,
        time_delta_seconds,
        speed_kmh,
        event_timestamp,
        client_macs
      FROM client_mobility_events
      WHERE signature_hash = ${hash}
      ORDER BY event_timestamp DESC
      LIMIT 100
    `;

    // Determine if this is likely MAC randomization
    const uniqueMacs = new Set(devices.map(d => d.client_mac));
    const isRandomized = uniqueMacs.size > 1;

    return res.status(200).json({
      signatureHash: hash,
      isRandomized,
      uniqueMacCount: uniqueMacs.size,
      devices: devices.map(device => ({
        id: device.id,
        clientMac: device.client_mac,
        confidenceScore: device.confidence_score,
        locationCount: device.location_count,
        ssids: device.ssids_json,
        locations: device.locations_json,
        firstSeen: device.first_seen?.toISOString(),
        lastSeen: device.last_seen?.toISOString(),
        totalProbes: device.total_probes,
      })),
      mobilityEvents: events.map(event => ({
        id: event.id,
        fromLocation: {
          latitude: event.from_latitude,
          longitude: event.from_longitude,
        },
        toLocation: {
          latitude: event.to_latitude,
          longitude: event.to_longitude,
        },
        distanceMeters: event.distance_meters,
        timeDeltaSeconds: event.time_delta_seconds,
        speedKmh: event.speed_kmh,
        timestamp: event.event_timestamp?.toISOString(),
        clientMacs: event.client_macs,
      })),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch signature details:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/events - Get mobility events with filtering
router.get('/events', async (req: Request, res: Response) => {
  try {
    const {
      min_distance = '50',
      max_speed = '200',
      hours_back = '168', // Default to last week
      signature_hash,
      client_mac,
      limit = '1000',
      offset = '0',
      bbox,
    } = req.query;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    whereConditions.push(`distance_meters >= $${paramIndex}`);
    queryParams.push(parseFloat(min_distance as string));
    paramIndex++;

    whereConditions.push(`speed_kmh <= $${paramIndex}`);
    queryParams.push(parseFloat(max_speed as string));
    paramIndex++;

    const hoursBack = parseInt(hours_back as string);
    whereConditions.push(`event_timestamp >= NOW() - INTERVAL '${hoursBack} hours'`);

    if (signature_hash) {
      whereConditions.push(`signature_hash = $${paramIndex}`);
      queryParams.push(signature_hash);
      paramIndex++;
    }

    if (client_mac) {
      whereConditions.push(`$${paramIndex}::macaddr = ANY(client_macs)`);
      queryParams.push(client_mac);
      paramIndex++;
    }

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereConditions.push(`
        (from_latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}
         AND from_longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3})
        OR
        (to_latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}
         AND to_longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3})
      `);
      queryParams.push(minLat, maxLat, minLon, maxLon);
      paramIndex += 4;
    }

    const whereClause = whereConditions.join(' AND ');

    const events = await prisma.$queryRawUnsafe<Array<{
      id: string;
      signature_hash: string;
      from_latitude: number;
      from_longitude: number;
      to_latitude: number;
      to_longitude: number;
      distance_meters: number;
      time_delta_seconds: number;
      speed_kmh: number;
      event_timestamp: Date;
      client_macs: string[];
      confidence_score: number;
      movement_category: string;
      transportation_mode: string;
    }>>(`
      SELECT
        e.id,
        e.signature_hash,
        e.from_latitude,
        e.from_longitude,
        e.to_latitude,
        e.to_longitude,
        e.distance_meters,
        e.time_delta_seconds,
        e.speed_kmh,
        e.event_timestamp,
        e.client_macs,
        e.confidence_score,
        CASE
          WHEN e.distance_meters < 100 THEN 'Local'
          WHEN e.distance_meters < 1000 THEN 'Neighborhood'
          WHEN e.distance_meters < 5000 THEN 'City'
          WHEN e.distance_meters < 50000 THEN 'Regional'
          ELSE 'Long Distance'
        END as movement_category,
        CASE
          WHEN e.speed_kmh < 7 THEN 'Walking'
          WHEN e.speed_kmh < 25 THEN 'Cycling'
          WHEN e.speed_kmh < 100 THEN 'Driving'
          ELSE 'High Speed'
        END as transportation_mode
      FROM client_mobility_events e
      WHERE ${whereClause}
      ORDER BY e.event_timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, parseInt(limit as string), parseInt(offset as string));

    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::integer as count
      FROM client_mobility_events
      WHERE ${whereClause}
    `, ...queryParams);
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      events: events.map(event => ({
        id: event.id,
        signatureHash: event.signature_hash,
        fromLocation: {
          latitude: event.from_latitude,
          longitude: event.from_longitude,
        },
        toLocation: {
          latitude: event.to_latitude,
          longitude: event.to_longitude,
        },
        distanceMeters: event.distance_meters,
        timeDeltaSeconds: event.time_delta_seconds,
        speedKmh: event.speed_kmh,
        timestamp: event.event_timestamp?.toISOString(),
        clientMacs: event.client_macs,
        confidenceScore: event.confidence_score,
        movementCategory: event.movement_category,
        transportationMode: event.transportation_mode,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch mobility events:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/tracking/:mac - Track specific MAC/signature movement
router.get('/tracking/:mac', async (req: Request, res: Response) => {
  try {
    const { mac } = req.params;
    const { hours_back = '168' } = req.query;

    // First, find the signature for this MAC
    const signatureResult = await prisma.$queryRaw<Array<{
      signature_hash: string;
      confidence_score: number;
      ssids_json: any;
    }>>`
      SELECT signature_hash, confidence_score, ssids_json
      FROM device_signatures
      WHERE client_mac = ${mac}::macaddr
      ORDER BY confidence_score DESC
      LIMIT 1
    `;

    if (signatureResult.length === 0) {
      return res.status(404).json({ error: 'No signature found for this MAC' });
    }

    const signature = signatureResult[0];

    // Get location history
    const hoursBack = parseInt(hours_back as string);
    const locationHistory = await prisma.$queryRaw<Array<{
      client_mac: string;
      timestamp: Date;
      latitude: number;
      longitude: number;
      ssids_probed: any;
      confidence_score: number;
    }>>`
      SELECT
        client_mac::text as client_mac,
        timestamp,
        latitude,
        longitude,
        ssids_probed_json as ssids_probed,
        confidence_score
      FROM client_location_history
      WHERE signature_hash = ${signature.signature_hash}
        AND timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    // Get related MACs (potential randomization)
    const relatedMacs = await prisma.$queryRaw<Array<{
      client_mac: string;
      confidence_score: number;
      first_seen: Date;
      last_seen: Date;
    }>>`
      SELECT
        client_mac::text as client_mac,
        confidence_score,
        first_seen,
        last_seen
      FROM device_signatures
      WHERE signature_hash = ${signature.signature_hash}
      ORDER BY last_seen DESC
    `;

    // Get mobility events
    const mobilityEvents = await prisma.$queryRaw<Array<{
      from_latitude: number;
      from_longitude: number;
      to_latitude: number;
      to_longitude: number;
      distance_meters: number;
      speed_kmh: number;
      event_timestamp: Date;
    }>>`
      SELECT
        from_latitude,
        from_longitude,
        to_latitude,
        to_longitude,
        distance_meters,
        speed_kmh,
        event_timestamp
      FROM client_mobility_events
      WHERE signature_hash = ${signature.signature_hash}
        AND event_timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY event_timestamp DESC
      LIMIT 100
    `;

    return res.status(200).json({
      device: {
        mac: mac,
        signatureHash: signature.signature_hash,
        confidenceScore: signature.confidence_score,
        ssids: signature.ssids_json,
      },
      relatedMacs: relatedMacs.map(m => ({
        mac: m.client_mac,
        confidenceScore: m.confidence_score,
        firstSeen: m.first_seen?.toISOString(),
        lastSeen: m.last_seen?.toISOString(),
      })),
      locationHistory: locationHistory.map(loc => ({
        mac: loc.client_mac,
        timestamp: loc.timestamp?.toISOString(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        ssidsProbed: loc.ssids_probed,
        confidenceScore: loc.confidence_score,
      })),
      mobilityEvents: mobilityEvents.map(event => ({
        fromLocation: {
          latitude: event.from_latitude,
          longitude: event.from_longitude,
        },
        toLocation: {
          latitude: event.to_latitude,
          longitude: event.to_longitude,
        },
        distanceMeters: event.distance_meters,
        speedKmh: event.speed_kmh,
        timestamp: event.event_timestamp?.toISOString(),
      })),
      totalLocations: locationHistory.length,
      totalEvents: mobilityEvents.length,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to track device:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/clusters - Get MAC randomization clusters
router.get('/clusters', async (req: Request, res: Response) => {
  try {
    const {
      min_macs = '2',
      min_confidence = '0.7',
      limit = '100',
      offset = '0',
    } = req.query;

    const clusters = await prisma.$queryRawUnsafe<Array<{
      signature_hash: string;
      unique_macs: number;
      client_macs: string[];
      avg_confidence: number;
      total_locations: number;
      ssids_json: any;
      first_seen: Date;
      last_seen: Date;
    }>>(`
      SELECT
        signature_hash,
        unique_macs,
        client_macs,
        avg_confidence,
        total_locations,
        ssids_json,
        first_seen,
        last_seen
      FROM signature_clusters
      WHERE unique_macs >= $1
        AND avg_confidence >= $2
      ORDER BY unique_macs DESC, avg_confidence DESC
      LIMIT $3 OFFSET $4
    `, parseInt(min_macs as string), parseFloat(min_confidence as string),
       parseInt(limit as string), parseInt(offset as string));

    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::integer as count
      FROM signature_clusters
      WHERE unique_macs >= $1
        AND avg_confidence >= $2
    `, parseInt(min_macs as string), parseFloat(min_confidence as string));
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      clusters: clusters.map(cluster => ({
        signatureHash: cluster.signature_hash,
        uniqueMacCount: cluster.unique_macs,
        clientMacs: cluster.client_macs,
        avgConfidence: cluster.avg_confidence,
        totalLocations: cluster.total_locations,
        ssids: cluster.ssids_json,
        firstSeen: cluster.first_seen?.toISOString(),
        lastSeen: cluster.last_seen?.toISOString(),
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch clusters:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/hotspots - Get frequently visited locations
router.get('/hotspots', async (req: Request, res: Response) => {
  try {
    const {
      min_visits = '5',
      radius_meters = '100',
      hours_back = '168',
      limit = '100',
      bbox,
    } = req.query;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    const hoursBack = parseInt(hours_back as string);
    whereConditions.push(`timestamp >= NOW() - INTERVAL '${hoursBack} hours'`);

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereConditions.push(`
        center_latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}
        AND center_longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}
      `);
      queryParams.push(minLat, maxLat, minLon, maxLon);
      paramIndex += 4;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const hotspots = await prisma.$queryRawUnsafe<Array<{
      center_latitude: number;
      center_longitude: number;
      visit_count: number;
      unique_devices: number;
      unique_signatures: number;
      first_seen: Date;
      last_seen: Date;
      avg_dwell_time: number;
    }>>(`
      WITH location_clusters AS (
        SELECT
          ROUND(latitude::numeric, 4) as lat_cluster,
          ROUND(longitude::numeric, 4) as lon_cluster,
          COUNT(*) as visit_count,
          COUNT(DISTINCT client_mac) as unique_devices,
          COUNT(DISTINCT signature_hash) as unique_signatures,
          AVG(latitude) as center_latitude,
          AVG(longitude) as center_longitude,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / COUNT(DISTINCT DATE(timestamp)) as avg_dwell_time
        FROM client_location_history
        ${whereClause}
        GROUP BY lat_cluster, lon_cluster
        HAVING COUNT(*) >= $${paramIndex}
      )
      SELECT * FROM location_clusters
      ORDER BY visit_count DESC
      LIMIT $${paramIndex + 1}
    `, ...queryParams, parseInt(min_visits as string), parseInt(limit as string));

    return res.status(200).json({
      hotspots: hotspots.map(hotspot => ({
        location: {
          latitude: hotspot.center_latitude,
          longitude: hotspot.center_longitude,
        },
        visitCount: hotspot.visit_count,
        uniqueDevices: hotspot.unique_devices,
        uniqueSignatures: hotspot.unique_signatures,
        firstSeen: hotspot.first_seen?.toISOString(),
        lastSeen: hotspot.last_seen?.toISOString(),
        avgDwellTimeSeconds: hotspot.avg_dwell_time,
      })),
      total: hotspots.length,
      filters: {
        minVisits: parseInt(min_visits as string),
        radiusMeters: parseInt(radius_meters as string),
        hoursBack,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch hotspots:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobility/analysis - Advanced analytics
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const { type = 'summary', hours_back = '168' } = req.query;
    const hoursBack = parseInt(hours_back as string);

    if (type === 'summary') {
      // Get overall statistics
      const [
        [totalSignatures, totalSignaturesError],
        [totalEvents, totalEventsError],
        [randomizedDevices, randomizedDevicesError],
        [activeDevices, activeDevicesError],
      ] = await Promise.all([
        safePromise(prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT signature_hash)::integer as count
          FROM device_signatures
          WHERE confidence_score >= 0.7
        `),
        safePromise(prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::integer as count
          FROM client_mobility_events
          WHERE event_timestamp >= NOW() - INTERVAL '${hoursBack} hours'
        `),
        safePromise(prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::integer as count
          FROM signature_clusters
          WHERE unique_macs >= 2
        `),
        safePromise(prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT signature_hash)::integer as count
          FROM client_location_history
          WHERE timestamp >= NOW() - INTERVAL '${hoursBack} hours'
        `),
      ]);

      if (totalSignaturesError || totalEventsError || randomizedDevicesError || activeDevicesError) {
        console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch mobility analysis summary components:`, {
          totalSignaturesError,
          totalEventsError,
          randomizedDevicesError,
          activeDevicesError,
        });
        return res.status(500).json({ error: 'Partial or complete failure in fetching analysis summary' });
      }

      return res.status(200).json({
        summary: {
          totalSignatures: totalSignatures?.[0]?.count || 0,
          totalMobilityEvents: totalEvents?.[0]?.count || 0,
          randomizedDevices: randomizedDevices?.[0]?.count || 0,
          activeDevices: activeDevices?.[0]?.count || 0,
          timeRange: {
            hoursBack,
            from: new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          },
        },
      });
    } else if (type === 'commuters') {
      // Detect regular commuter patterns
      const commuters = await prisma.$queryRaw<Array<{
        signature_hash: string;
        pattern_count: number;
        avg_distance: number;
        avg_speed: number;
        common_times: string[];
      }>>`
        WITH commuter_patterns AS (
          SELECT
            signature_hash,
            COUNT(*) as pattern_count,
            AVG(distance_meters) as avg_distance,
            AVG(speed_kmh) as avg_speed,
            ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM event_timestamp)::text) as common_times
          FROM client_mobility_events
          WHERE event_timestamp >= NOW() - INTERVAL '${hoursBack} hours'
            AND distance_meters BETWEEN 1000 AND 50000
            AND speed_kmh BETWEEN 20 AND 100
          GROUP BY signature_hash
          HAVING COUNT(*) >= 5
        )
        SELECT * FROM commuter_patterns
        ORDER BY pattern_count DESC
        LIMIT 50
      `;

      return res.status(200).json({
        commuters: commuters.map(c => ({
          signatureHash: c.signature_hash,
          patternCount: c.pattern_count,
          avgDistanceMeters: c.avg_distance,
          avgSpeedKmh: c.avg_speed,
          commonHours: c.common_times,
        })),
      });
    } else if (type === 'patterns') {
      // Analyze movement patterns
      const patterns = await prisma.$queryRaw<Array<{
        movement_category: string;
        transportation_mode: string;
        event_count: number;
        avg_distance: number;
        avg_speed: number;
      }>>`
        SELECT
          CASE
            WHEN distance_meters < 100 THEN 'Local'
            WHEN distance_meters < 1000 THEN 'Neighborhood'
            WHEN distance_meters < 5000 THEN 'City'
            WHEN distance_meters < 50000 THEN 'Regional'
            ELSE 'Long Distance'
          END as movement_category,
          CASE
            WHEN speed_kmh < 7 THEN 'Walking'
            WHEN speed_kmh < 25 THEN 'Cycling'
            WHEN speed_kmh < 100 THEN 'Driving'
            ELSE 'High Speed'
          END as transportation_mode,
          COUNT(*)::integer as event_count,
          AVG(distance_meters) as avg_distance,
          AVG(speed_kmh) as avg_speed
        FROM client_mobility_events
        WHERE event_timestamp >= NOW() - INTERVAL '${hoursBack} hours'
        GROUP BY movement_category, transportation_mode
        ORDER BY event_count DESC
      `;

      return res.status(200).json({
        patterns: patterns.map(p => ({
          movementCategory: p.movement_category,
          transportationMode: p.transportation_mode,
          eventCount: p.event_count,
          avgDistanceMeters: p.avg_distance,
          avgSpeedKmh: p.avg_speed,
        })),
      });
    }

    return res.status(400).json({ error: 'Invalid analysis type' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to perform analysis:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
