import { Router, Request, Response } from 'express';
import { prisma } from '../data-access';

const router = Router();

// GET /api/rfsensor/devices - List RFSENSOR devices with filtering
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const {
      min_signal_strength,
      max_signal_strength,
      has_location = 'all', // 'true', 'false', 'all'
      date_from,
      date_to,
      limit = '1000',
      offset = '0',
      bbox, // Bounding box: "minLat,minLon,maxLat,maxLon"
    } = req.query;

    const whereClause: any = {
      phyname: 'RFSENSOR',
      type: 'Sensor'
    };

    // Filter by date range
    if (date_from || date_to) {
      whereClause.firstTime = {};
      if (date_from) {
        whereClause.firstTime.gte = new Date(date_from as string);
      }
      if (date_to) {
        whereClause.firstTime.lte = new Date(date_to as string);
      }
    }

    // Filter by location availability
    if (has_location === 'true') {
      whereClause.AND = [
        { latitude: { not: null } },
        { longitude: { not: null } }
      ];
    } else if (has_location === 'false') {
      whereClause.OR = [
        { latitude: null },
        { longitude: null }
      ];
    }

    // Bounding box filter
    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereClause.latitude = {
        gte: minLat,
        lte: maxLat,
      };
      whereClause.longitude = {
        gte: minLon,
        lte: maxLon,
      };
    }

    const devices = await prisma.device.findMany({
      where: whereClause,
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        basicType: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true,
        altitude: true,
        frequency: true,
        channel: true,
        signalData: true,
        createdAt: true,
        sightings: {
          select: {
            timestamp: true,
            latitude: true,
            longitude: true,
            signalStrength: true,
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 10 // Latest 10 sightings per device
        }
      },
      orderBy: [
        { firstTime: 'desc' },
        { key: 'asc' }
      ],
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
    });

    const total = await prisma.device.count({
      where: whereClause
    });

    return res.status(200).json({
      devices: devices.map(device => ({
        id: device.id,
        key: device.key,
        phyname: device.phyname,
        type: device.type,
        basicType: device.basicType,
        firstTime: device.firstTime?.toISOString(),
        lastTime: device.lastTime?.toISOString(),
        latitude: device.latitude ? Number(device.latitude) : null,
        longitude: device.longitude ? Number(device.longitude) : null,
        altitude: device.altitude ? Number(device.altitude) : null,
        frequency: device.frequency,
        channel: device.channel,
        signalData: device.signalData,
        createdAt: device.createdAt?.toISOString(),
        sightingsCount: device.sightings.length,
        latestSightings: device.sightings.map(sighting => ({
          timestamp: sighting.timestamp.toISOString(),
          latitude: sighting.latitude ? Number(sighting.latitude) : null,
          longitude: sighting.longitude ? Number(sighting.longitude) : null,
          signalStrength: sighting.signalStrength,
        }))
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch RFSENSOR devices:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rfsensor/devices/:id - Get specific RFSENSOR device with detailed information
router.get('/devices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: {
        id: id,
        phyname: 'RFSENSOR',
        type: 'Sensor'
      },
      select: {
        id: true,
        key: true,
        phyname: true,
        type: true,
        basicType: true,
        firstTime: true,
        lastTime: true,
        latitude: true,
        longitude: true,
        altitude: true,
        minLatitude: true,
        maxLatitude: true,
        minLongitude: true,
        maxLongitude: true,
        frequency: true,
        channel: true,
        signalData: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        sightings: {
          select: {
            id: true,
            timestamp: true,
            latitude: true,
            longitude: true,
            altitude: true,
            signalStrength: true,
            accuracy: true,
          },
          orderBy: {
            timestamp: 'desc'
          }
        },
        analysisResults: {
          select: {
            id: true,
            persistenceScore: true,
            analysisTimestamp: true,
            locationCount: true,
            timeWindowHours: true,
          },
          orderBy: {
            analysisTimestamp: 'desc'
          }
        }
      }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'RFSENSOR device not found' });
    }

    return res.status(200).json({
      id: device.id,
      key: device.key,
      phyname: device.phyname,
      type: device.type,
      basicType: device.basicType,
      firstTime: device.firstTime?.toISOString(),
      lastTime: device.lastTime?.toISOString(),
      latitude: device.latitude ? Number(device.latitude) : null,
      longitude: device.longitude ? Number(device.longitude) : null,
      altitude: device.altitude ? Number(device.altitude) : null,
      minLatitude: device.minLatitude ? Number(device.minLatitude) : null,
      maxLatitude: device.maxLatitude ? Number(device.maxLatitude) : null,
      minLongitude: device.minLongitude ? Number(device.minLongitude) : null,
      maxLongitude: device.maxLongitude ? Number(device.maxLongitude) : null,
      frequency: device.frequency,
      channel: device.channel,
      signalData: device.signalData,
      location: device.location,
      createdAt: device.createdAt?.toISOString(),
      updatedAt: device.updatedAt?.toISOString(),
      sightings: device.sightings.map(sighting => ({
        id: sighting.id,
        timestamp: sighting.timestamp.toISOString(),
        latitude: sighting.latitude ? Number(sighting.latitude) : null,
        longitude: sighting.longitude ? Number(sighting.longitude) : null,
        altitude: sighting.altitude ? Number(sighting.altitude) : null,
        signalStrength: sighting.signalStrength,
        accuracy: sighting.accuracy ? Number(sighting.accuracy) : null,
      })),
      analysisResults: device.analysisResults.map(result => ({
        id: result.id,
        persistenceScore: Number(result.persistenceScore),
        analysisTimestamp: result.analysisTimestamp.toISOString(),
        locationCount: result.locationCount,
        timeWindowHours: result.timeWindowHours,
      })),
      sightingsCount: device.sightings.length,
      analysisCount: device.analysisResults.length,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch RFSENSOR device:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rfsensor/temporal - Get temporal analysis of RFSENSOR activity
router.get('/temporal', async (req: Request, res: Response) => {
  try {
    const {
      group_by = 'hour', // 'hour', 'day', 'week'
      date_from,
      date_to,
    } = req.query;

    let dateFilter = {};
    if (date_from || date_to) {
      dateFilter = {
        firstTime: {}
      };
      if (date_from) {
        (dateFilter as any).firstTime.gte = new Date(date_from as string);
      }
      if (date_to) {
        (dateFilter as any).firstTime.lte = new Date(date_to as string);
      }
    }

    // SQL query for temporal analysis
    let timeFormat = 'YYYY-MM-DD HH24:00:00';
    let timeInterval = '1 hour';
    
    switch (group_by) {
      case 'day':
        timeFormat = 'YYYY-MM-DD';
        timeInterval = '1 day';
        break;
      case 'week':
        timeFormat = 'IYYY-IW';
        timeInterval = '1 week';
        break;
    }

    const temporalData = await prisma.$queryRaw<Array<{
      time_bucket: string;
      device_count: number;
      first_activity: Date;
      last_activity: Date;
    }>>`
      SELECT 
        to_char(date_trunc(${group_by as string}, first_time), ${timeFormat}) as time_bucket,
        COUNT(*)::integer as device_count,
        MIN(first_time) as first_activity,
        MAX(last_time) as last_activity
      FROM devices
      WHERE phyname = 'RFSENSOR' 
        AND type = 'Sensor'
        AND first_time IS NOT NULL
        ${date_from ? `AND first_time >= ${date_from as string}::timestamp` : ''}
        ${date_to ? `AND first_time <= ${date_to as string}::timestamp` : ''}
      GROUP BY time_bucket
      ORDER BY time_bucket
    `;

    // Get hourly distribution (regardless of grouping, for pattern analysis)
    const hourlyDistribution = await prisma.$queryRaw<Array<{
      hour: number;
      device_count: number;
    }>>`
      SELECT 
        EXTRACT(hour FROM first_time)::integer as hour,
        COUNT(*)::integer as device_count
      FROM devices
      WHERE phyname = 'RFSENSOR' 
        AND type = 'Sensor'
        AND first_time IS NOT NULL
        ${date_from ? `AND first_time >= ${date_from as string}::timestamp` : ''}
        ${date_to ? `AND first_time <= ${date_to as string}::timestamp` : ''}
      GROUP BY hour
      ORDER BY hour
    `;

    return res.status(200).json({
      groupBy: group_by,
      temporalData: temporalData.map(data => ({
        timeBucket: data.time_bucket,
        deviceCount: data.device_count,
        firstActivity: data.first_activity?.toISOString(),
        lastActivity: data.last_activity?.toISOString(),
      })),
      hourlyDistribution: hourlyDistribution.map(data => ({
        hour: data.hour,
        deviceCount: data.device_count,
      })),
      totalDevices: temporalData.reduce((sum, d) => sum + d.device_count, 0),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch temporal analysis:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rfsensor/geographic - Get geographic clusters of RFSENSOR devices
router.get('/geographic', async (req: Request, res: Response) => {
  try {
    const {
      cluster_radius = '1', // km
      min_devices = '2',
      bbox,
    } = req.query;

    let whereClause = 'WHERE phyname = \'RFSENSOR\' AND type = \'Sensor\' AND latitude IS NOT NULL AND longitude IS NOT NULL';
    const params: any[] = [];

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereClause += ' AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4';
      params.push(minLat, maxLat, minLon, maxLon);
    }

    const clusterRadius = parseFloat(cluster_radius as string);
    const minDevices = parseInt(min_devices as string);

    // Use raw SQL for geographic clustering with proper distance calculation
    const query = `
      WITH device_clusters AS (
        SELECT 
          id, key, latitude, longitude, first_time, last_time, signal_data,
          ROUND(latitude::numeric, 3) as lat_cluster,
          ROUND(longitude::numeric, 3) as lon_cluster
        FROM devices
        ${whereClause}
      ),
      clustered_devices AS (
        SELECT 
          lat_cluster, lon_cluster,
          COUNT(*) as device_count,
          AVG(latitude) as center_lat,
          AVG(longitude) as center_lon,
          ARRAY_AGG(id) as device_ids,
          ARRAY_AGG(key) as device_keys,
          MIN(first_time) as earliest_activity,
          MAX(last_time) as latest_activity,
          MIN(latitude) as min_lat,
          MAX(latitude) as max_lat,
          MIN(longitude) as min_lon,
          MAX(longitude) as max_lon
        FROM device_clusters
        GROUP BY lat_cluster, lon_cluster
        HAVING COUNT(*) >= $${params.length + 1}
      )
      SELECT * FROM clustered_devices
      ORDER BY device_count DESC
      LIMIT 100;
    `;

    params.push(minDevices);

    const clusters = await prisma.$queryRawUnsafe<Array<{
      lat_cluster: number;
      lon_cluster: number;
      device_count: number;
      center_lat: number;
      center_lon: number;
      device_ids: string[];
      device_keys: string[];
      earliest_activity: Date;
      latest_activity: Date;
      min_lat: number;
      max_lat: number;
      min_lon: number;
      max_lon: number;
    }>>(query, ...params);

    return res.status(200).json({
      clusters: clusters.map(cluster => ({
        deviceCount: cluster.device_count,
        centerLatitude: Number(cluster.center_lat),
        centerLongitude: Number(cluster.center_lon),
        deviceIds: cluster.device_ids,
        deviceKeys: cluster.device_keys,
        earliestActivity: cluster.earliest_activity?.toISOString(),
        latestActivity: cluster.latest_activity?.toISOString(),
        bounds: {
          minLatitude: Number(cluster.min_lat),
          maxLatitude: Number(cluster.max_lat),
          minLongitude: Number(cluster.min_lon),
          maxLongitude: Number(cluster.max_lon),
        }
      })),
      clusterRadius,
      minDevices,
      totalClusters: clusters.length,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch geographic clusters:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rfsensor/stats - Get RFSENSOR statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalDevices,
      devicesWithLocation,
      devicesWithSightings,
      timeRange,
      signalStats
    ] = await Promise.all([
      prisma.device.count({
        where: { phyname: 'RFSENSOR', type: 'Sensor' }
      }),
      prisma.device.count({
        where: {
          phyname: 'RFSENSOR',
          type: 'Sensor',
          AND: [
            { latitude: { not: null } },
            { longitude: { not: null } }
          ]
        }
      }),
      prisma.device.count({
        where: {
          phyname: 'RFSENSOR',
          type: 'Sensor',
          sightings: {
            some: {}
          }
        }
      }),
      prisma.device.aggregate({
        where: { phyname: 'RFSENSOR', type: 'Sensor' },
        _min: { firstTime: true },
        _max: { lastTime: true }
      }),
      prisma.$queryRaw<Array<{
        devices_with_signal_data: number;
        avg_strongest_signal: number | null;
        min_strongest_signal: number | null;
        max_strongest_signal: number | null;
      }>>`
        SELECT 
          COUNT(*)::integer as devices_with_signal_data,
          AVG((signal_data->>'strongest_signal')::numeric) as avg_strongest_signal,
          MIN((signal_data->>'strongest_signal')::numeric) as min_strongest_signal,
          MAX((signal_data->>'strongest_signal')::numeric) as max_strongest_signal
        FROM devices 
        WHERE phyname = 'RFSENSOR' 
          AND type = 'Sensor' 
          AND signal_data IS NOT NULL
          AND signal_data->>'strongest_signal' IS NOT NULL
      `
    ]);

    const collectionDuration = timeRange._min.firstTime && timeRange._max.lastTime
      ? Math.round((timeRange._max.lastTime.getTime() - timeRange._min.firstTime.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return res.status(200).json({
      totalDevices,
      devicesWithLocation,
      devicesWithSightings,
      locationCoverage: totalDevices > 0 ? Math.round((devicesWithLocation / totalDevices) * 100) : 0,
      sightingsCoverage: totalDevices > 0 ? Math.round((devicesWithSightings / totalDevices) * 100) : 0,
      collectionPeriod: {
        startTime: timeRange._min.firstTime?.toISOString(),
        endTime: timeRange._max.lastTime?.toISOString(),
        durationDays: collectionDuration,
      },
      signalData: {
        devicesWithSignalData: signalStats[0]?.devices_with_signal_data || 0,
        averageStrongestSignal: signalStats[0]?.avg_strongest_signal ? Number(signalStats[0].avg_strongest_signal) : null,
        minStrongestSignal: signalStats[0]?.min_strongest_signal ? Number(signalStats[0].min_strongest_signal) : null,
        maxStrongestSignal: signalStats[0]?.max_strongest_signal ? Number(signalStats[0].max_strongest_signal) : null,
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch RFSENSOR stats:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rfsensor/export - Export RFSENSOR data in various formats
router.get('/export', async (req: Request, res: Response) => {
  try {
    const {
      format = 'json', // 'json', 'csv', 'geojson'
      include_sightings = 'false',
      bbox,
      date_from,
      date_to,
    } = req.query;

    const whereClause: any = {
      phyname: 'RFSENSOR',
      type: 'Sensor'
    };

    // Apply filters
    if (date_from || date_to) {
      whereClause.firstTime = {};
      if (date_from) whereClause.firstTime.gte = new Date(date_from as string);
      if (date_to) whereClause.firstTime.lte = new Date(date_to as string);
    }

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereClause.latitude = { gte: minLat, lte: maxLat };
      whereClause.longitude = { gte: minLon, lte: maxLon };
    }

    const devices = await prisma.device.findMany({
      where: whereClause,
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
        frequency: true,
        channel: true,
        signalData: true,
        ...(include_sightings === 'true' && {
          sightings: {
            select: {
              timestamp: true,
              latitude: true,
              longitude: true,
              signalStrength: true,
            }
          }
        })
      }
    });

    const exportData = devices.map(device => ({
      id: device.id,
      key: device.key,
      phyname: device.phyname,
      type: device.type,
      firstTime: device.firstTime?.toISOString(),
      lastTime: device.lastTime?.toISOString(),
      latitude: device.latitude ? Number(device.latitude) : null,
      longitude: device.longitude ? Number(device.longitude) : null,
      altitude: device.altitude ? Number(device.altitude) : null,
      frequency: device.frequency,
      channel: device.channel,
      signalData: device.signalData,
      ...(include_sightings === 'true' && {
        sightings: (device as any).sightings?.map((s: any) => ({
          timestamp: s.timestamp.toISOString(),
          latitude: s.latitude ? Number(s.latitude) : null,
          longitude: s.longitude ? Number(s.longitude) : null,
          signalStrength: s.signalStrength,
        }))
      })
    }));

    switch (format) {
      case 'csv':
        // Simple CSV export (flatten the data)
        const csvHeaders = ['id', 'key', 'type', 'firstTime', 'lastTime', 'latitude', 'longitude', 'altitude', 'frequency'];
        const csvRows = exportData.map(device => [
          device.id, device.key, device.type, device.firstTime, device.lastTime,
          device.latitude, device.longitude, device.altitude, device.frequency
        ]);
        
        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${String(field || '')}"`).join(','))
          .join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="rfsensor_devices.csv"');
        return res.send(csvContent);

      case 'geojson':
        const geojson = {
          type: 'FeatureCollection',
          features: exportData
            .filter(device => device.latitude && device.longitude)
            .map(device => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [device.longitude!, device.latitude!]
              },
              properties: {
                id: device.id,
                key: device.key,
                type: device.type,
                firstTime: device.firstTime,
                lastTime: device.lastTime,
                altitude: device.altitude,
                frequency: device.frequency,
                signalData: device.signalData,
              }
            }))
        };
        
        res.setHeader('Content-Type', 'application/geo+json');
        res.setHeader('Content-Disposition', 'attachment; filename="rfsensor_devices.geojson"');
        return res.json(geojson);

      default: // JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="rfsensor_devices.json"');
        return res.json({
          exportedAt: new Date().toISOString(),
          totalDevices: exportData.length,
          format: 'json',
          filters: { bbox, dateFrom: date_from, dateTo: date_to },
          devices: exportData
        });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to export RFSENSOR data:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;