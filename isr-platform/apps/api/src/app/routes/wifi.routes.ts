import { Router, Request, Response } from 'express';
import { prisma } from '../data-access';

const router = Router();

// GET /api/wifi/networks - List WiFi networks with filtering
router.get('/networks', async (req: Request, res: Response) => {
  try {
    const {
      security_type,
      min_signal_strength,
      max_signal_strength,
      channel,
      vendor,
      has_clients, // Filter for networks with associated clients
      min_clients, // Minimum number of clients
      limit = '5000',
      offset = '0',
      bbox, // Bounding box: "minLat,minLon,maxLat,maxLon"
    } = req.query;

    // Build WHERE conditions for networks query
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (security_type) {
      whereConditions.push(`n.security_type = $${paramIndex}`);
      queryParams.push(security_type);
      paramIndex++;
    }

    if (min_signal_strength) {
      whereConditions.push(`n.signal_strength >= $${paramIndex}`);
      queryParams.push(parseInt(min_signal_strength as string));
      paramIndex++;
    }

    if (max_signal_strength) {
      whereConditions.push(`n.signal_strength <= $${paramIndex}`);
      queryParams.push(parseInt(max_signal_strength as string));
      paramIndex++;
    }

    if (channel) {
      whereConditions.push(`n.channel = $${paramIndex}`);
      queryParams.push(parseInt(channel as string));
      paramIndex++;
    }

    if (vendor) {
      whereConditions.push(`n.vendor ILIKE $${paramIndex}`);
      queryParams.push(`%${vendor}%`);
      paramIndex++;
    }

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereConditions.push(`n.latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      whereConditions.push(`n.longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`);
      queryParams.push(minLat, maxLat, minLon, maxLon);
      paramIndex += 4;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build HAVING conditions for client filtering (since it's based on aggregated data)
    let havingConditions: string[] = [];
    let havingParams: any[] = [];
    let havingParamIndex = paramIndex;

    if (has_clients === 'true') {
      havingConditions.push(`COUNT(c.id) > 0`);
    } else if (has_clients === 'false') {
      havingConditions.push(`COUNT(c.id) = 0`);
    }

    if (min_clients) {
      havingConditions.push(`COUNT(c.id) >= $${havingParamIndex}`);
      havingParams.push(parseInt(min_clients as string));
      havingParamIndex++;
    }

    const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(' AND ')}` : '';
    const allParams = [...queryParams, ...havingParams];

    // Use raw query to handle macaddr type and include client count
    const networks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      bssid: string;
      ssid: string | null;
      security_type: string | null;
      encryption: string | null;
      channel: number | null;
      frequency: number | null;
      signal_strength: number | null;
      vendor: string | null;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      last_seen: Date | null;
      times_seen: number;
      client_count: number;
    }>>(`
      SELECT 
        n.id, 
        n.bssid::text as bssid, 
        n.ssid, 
        n.security_type, 
        n.encryption, 
        n.channel, 
        n.frequency, 
        n.signal_strength, 
        n.vendor, 
        n.latitude, 
        n.longitude, 
        n.first_seen, 
        n.last_seen, 
        n.times_seen,
        COALESCE(COUNT(c.id)::integer, 0) as client_count
      FROM wifi_networks n
      LEFT JOIN wifi_clients c ON n.bssid = c.network_bssid
      ${whereClause}
      GROUP BY n.id, n.bssid, n.ssid, n.security_type, n.encryption, n.channel, 
               n.frequency, n.signal_strength, n.vendor, n.latitude, n.longitude, 
               n.first_seen, n.last_seen, n.times_seen
      ${havingClause}
      ORDER BY n.signal_strength DESC NULLS LAST
      LIMIT $${havingParamIndex} OFFSET $${havingParamIndex + 1}
    `, ...allParams, parseInt(limit as string), parseInt(offset as string));

    // For total count, we need a subquery to handle the client filtering
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::integer as count FROM (
        SELECT n.id
        FROM wifi_networks n
        LEFT JOIN wifi_clients c ON n.bssid = c.network_bssid
        ${whereClause}
        GROUP BY n.id
        ${havingClause}
      ) as filtered_networks
    `, ...allParams);
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      networks: networks.map(network => ({
        id: network.id,
        bssid: network.bssid,
        ssid: network.ssid,
        securityType: network.security_type,
        encryption: network.encryption,
        channel: network.channel,
        frequency: network.frequency,
        signalStrength: network.signal_strength,
        vendor: network.vendor,
        latitude: network.latitude ? Number(network.latitude) : null,
        longitude: network.longitude ? Number(network.longitude) : null,
        firstSeen: network.first_seen?.toISOString(),
        lastSeen: network.last_seen?.toISOString(),
        timesSeen: network.times_seen,
        clientCount: network.client_count,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch WiFi networks:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/networks/:id - Get specific WiFi network with clients
router.get('/networks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use raw query to handle macaddr types properly
    const networkRaw = await prisma.$queryRaw<Array<{
      id: string;
      bssid: string;
      ssid: string | null;
      security_type: string | null;
      encryption: string | null;
      channel: number | null;
      frequency: number | null;
      signal_strength: number | null;
      vendor: string | null;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      last_seen: Date | null;
      times_seen: number;
    }>>`
      SELECT 
        id, 
        bssid::text as bssid, 
        ssid, 
        security_type, 
        encryption, 
        channel, 
        frequency, 
        signal_strength, 
        vendor, 
        latitude, 
        longitude, 
        first_seen, 
        last_seen, 
        times_seen
      FROM wifi_networks
      WHERE id = ${id}::uuid
    `;
    
    if (networkRaw.length === 0) {
      return res.status(404).json({ error: 'Network not found' });
    }
    
    const network = networkRaw[0];
    
    // Get clients for this network using raw query
    const clientsRaw = await prisma.$queryRaw<Array<{
      id: string;
      client_mac: string;
      vendor: string | null;
      last_seen: Date | null;
      packets_total: number | null;
    }>>`
      SELECT 
        id,
        client_mac::text as client_mac,
        vendor,
        last_seen,
        packets_total
      FROM wifi_clients
      WHERE network_bssid = ${network.bssid}::macaddr
      ORDER BY last_seen DESC NULLS LAST
      LIMIT 50
    `;


    return res.status(200).json({
      id: network.id,
      bssid: network.bssid,
      ssid: network.ssid,
      securityType: network.security_type,
      encryption: network.encryption,
      channel: network.channel,
      frequency: network.frequency,
      signalStrength: network.signal_strength,
      vendor: network.vendor,
      latitude: network.latitude ? Number(network.latitude) : null,
      longitude: network.longitude ? Number(network.longitude) : null,
      firstSeen: network.first_seen?.toISOString(),
      lastSeen: network.last_seen?.toISOString(),
      timesSeen: network.times_seen,
      clients: clientsRaw.map(client => ({
        id: client.id,
        clientMac: client.client_mac,
        vendor: client.vendor,
        lastSeen: client.last_seen?.toISOString(),
        packetsTotal: client.packets_total,
      })),
      associations: [], // Note: associations table doesn't exist in current schema
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch WiFi network:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/clients - List WiFi clients with filtering
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const {
      vendor,
      client_type,
      min_packets,
      limit = '5000',
      offset = '0',
      bbox,
    } = req.query;

    const whereClause: any = {};
    
    if (vendor) {
      whereClause.vendor = {
        contains: vendor as string,
        mode: 'insensitive',
      };
    }
    
    if (client_type) {
      whereClause.clientType = client_type;
    }
    
    if (min_packets) {
      whereClause.packetsTotal = {
        gte: parseInt(min_packets as string),
      };
    }

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

    // Use raw query to handle macaddr fields properly
    const clientsRaw = await prisma.$queryRaw<Array<{
      id: string;
      client_mac: string;
      vendor: string | null;
      client_type: string | null;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      last_seen: Date | null;
      packets_total: number | null;
      data_bytes: any;
      network_ssid: string | null;
      network_bssid: string;
      network_security_type: string | null;
    }>>`
      SELECT 
        c.id,
        c.client_mac::text as client_mac,
        c.vendor,
        c.client_type,
        c.latitude,
        c.longitude,
        c.first_seen,
        c.last_seen,
        c.packets_total,
        c.data_bytes,
        n.ssid as network_ssid,
        n.bssid::text as network_bssid,
        n.security_type as network_security_type
      FROM wifi_clients c
      LEFT JOIN wifi_networks n ON c.network_bssid = n.bssid
      ORDER BY c.last_seen DESC NULLS LAST
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `;


    const totalResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::integer as count FROM wifi_clients
    `;
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      clients: clientsRaw.map(client => ({
        id: client.id,
        clientMac: client.client_mac,
        vendor: client.vendor,
        clientType: client.client_type,
        latitude: client.latitude ? Number(client.latitude) : null,
        longitude: client.longitude ? Number(client.longitude) : null,
        firstSeen: client.first_seen?.toISOString(),
        lastSeen: client.last_seen?.toISOString(),
        packetsTotal: client.packets_total,
        dataBytes: Number(client.data_bytes),
        network: {
          ssid: client.network_ssid,
          bssid: client.network_bssid,
          securityType: client.network_security_type,
        },
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch WiFi clients:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/clients/:id/locations - Get all locations where a specific client was seen
router.get('/clients/:id/locations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get client info and all its location points
    const clientRaw = await prisma.$queryRaw<Array<{
      id: string;
      client_mac: string;
      vendor: string | null;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      last_seen: Date | null;
      network_ssid: string | null;
      network_bssid: string;
    }>>`
      SELECT 
        c.id,
        c.client_mac::text as client_mac,
        c.vendor,
        c.latitude,
        c.longitude,
        c.first_seen,
        c.last_seen,
        n.ssid as network_ssid,
        n.bssid::text as network_bssid
      FROM wifi_clients c
      LEFT JOIN wifi_networks n ON c.network_bssid = n.bssid
      WHERE c.id = ${id}::uuid
    `;
    
    if (clientRaw.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientRaw[0];
    
    // Get all locations where this client MAC was seen
    const allLocationsRaw = await prisma.$queryRaw<Array<{
      id: string;
      client_mac: string;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      last_seen: Date | null;
      network_ssid: string | null;
      network_bssid: string;
      signal_strength: number | null;
    }>>`
      SELECT 
        c.id,
        c.client_mac::text as client_mac,
        c.latitude,
        c.longitude,
        c.first_seen,
        c.last_seen,
        c.signal_strength,
        n.ssid as network_ssid,
        n.bssid::text as network_bssid
      FROM wifi_clients c
      LEFT JOIN wifi_networks n ON c.network_bssid = n.bssid
      WHERE c.client_mac = ${client.client_mac}::macaddr
      AND c.latitude IS NOT NULL 
      AND c.longitude IS NOT NULL
      ORDER BY c.last_seen DESC
    `;
    
    return res.status(200).json({
      client: {
        id: client.id,
        clientMac: client.client_mac,
        vendor: client.vendor,
        latitude: client.latitude ? Number(client.latitude) : null,
        longitude: client.longitude ? Number(client.longitude) : null,
        firstSeen: client.first_seen?.toISOString(),
        lastSeen: client.last_seen?.toISOString(),
        primaryNetwork: {
          ssid: client.network_ssid,
          bssid: client.network_bssid,
        },
      },
      locations: allLocationsRaw.map(location => ({
        id: location.id,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        firstSeen: location.first_seen?.toISOString(),
        lastSeen: location.last_seen?.toISOString(),
        signalStrength: location.signal_strength,
        network: {
          ssid: location.network_ssid,
          bssid: location.network_bssid,
        },
      })),
      totalLocations: allLocationsRaw.length,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch client locations:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/networks/geospatial - Get networks with geospatial clustering
router.get('/networks/geospatial', async (req: Request, res: Response) => {
  try {
    const {
      bbox,
      cluster_radius = '100', // meters
      min_networks = '2',
    } = req.query;

    let whereClause = 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    const params: any[] = [];

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereClause += ' AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4';
      params.push(minLat, maxLat, minLon, maxLon);
    }

    // Use raw SQL for geospatial clustering
    const clusterRadius = parseInt(cluster_radius as string);
    const minNetworks = parseInt(min_networks as string);

    const query = `
      WITH clustered_networks AS (
        SELECT 
          id, bssid, ssid, security_type, channel, signal_strength, vendor,
          latitude, longitude, first_seen, last_seen,
          ROUND(latitude::numeric, 3) as lat_cluster,
          ROUND(longitude::numeric, 3) as lon_cluster
        FROM wifi_networks
        ${whereClause}
      ),
      network_clusters AS (
        SELECT 
          lat_cluster, lon_cluster,
          COUNT(*) as network_count,
          AVG(latitude) as center_lat,
          AVG(longitude) as center_lon,
          ARRAY_AGG(id) as network_ids,
          ARRAY_AGG(DISTINCT security_type) as security_types,
          AVG(signal_strength) as avg_signal
        FROM clustered_networks
        GROUP BY lat_cluster, lon_cluster
        HAVING COUNT(*) >= $${params.length + 1}
      )
      SELECT * FROM network_clusters
      ORDER BY network_count DESC
      LIMIT 200;
    `;

    params.push(minNetworks);

    const clusters = await prisma.$queryRawUnsafe(query, ...params);

    return res.status(200).json({
      clusters: clusters,
      clusterRadius,
      minNetworks,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch geospatial networks:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/stats - Get WiFi statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalNetworks,
      totalClients,
      securityStats,
      channelStats,
    ] = await Promise.all([
      prisma.wifiNetwork.count(),
      prisma.wifiClient.count(),
      prisma.wifiNetwork.groupBy({
        by: ['securityType'],
        _count: true,
        orderBy: { securityType: 'asc' },
      }),
      prisma.wifiNetwork.groupBy({
        by: ['channel'],
        _count: true,
        where: { channel: { not: null } },
        orderBy: { channel: 'asc' },
      }),
    ]);

    return res.status(200).json({
      totalNetworks,
      totalClients,
      securityDistribution: securityStats.map(stat => ({
        securityType: stat.securityType,
        count: stat._count,
      })),
      channelDistribution: channelStats.map(stat => ({
        channel: stat.channel,
        count: stat._count,
      })),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch WiFi stats:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/probes - List WiFi probe requests with filtering
router.get('/probes', async (req: Request, res: Response) => {
  try {
    const {
      client_mac,
      ssid,
      vendor,
      min_signal,
      hours_back = '24',
      limit = '5000',
      offset = '0',
      bbox,
    } = req.query;

    let whereConditions: string[] = ['p.packet_type = \'management\'', 'p.sub_type = \'probe_req\''];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Time filtering - default to last 24 hours
    const hoursBack = parseInt(hours_back as string);
    whereConditions.push(`p.ts >= NOW() - INTERVAL '${hoursBack} hours'`);

    if (client_mac) {
      whereConditions.push(`p.source_mac = $${paramIndex}::macaddr`);
      queryParams.push(client_mac);
      paramIndex++;
    }

    if (vendor) {
      whereConditions.push(`p.dot11_info->>'vendor' ILIKE $${paramIndex}`);
      queryParams.push(`%${vendor}%`);
      paramIndex++;
    }

    if (min_signal) {
      whereConditions.push(`p.signal_dbm >= $${paramIndex}`);
      queryParams.push(parseInt(min_signal as string));
      paramIndex++;
    }

    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = (bbox as string).split(',').map(Number);
      whereConditions.push(`p.latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      whereConditions.push(`p.longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`);
      queryParams.push(minLat, maxLat, minLon, maxLon);
      paramIndex += 4;
    }

    // Add SSID filter - handle both explicit SSID and broadcast probes
    let ssidCondition = '';
    if (ssid) {
      if (ssid === 'broadcast') {
        ssidCondition = `AND (p.dot11_info->>'ssid' IS NULL OR p.dot11_info->>'ssid' = '')`;
      } else {
        whereConditions.push(`p.dot11_info->>'ssid' ILIKE $${paramIndex}`);
        queryParams.push(`%${ssid}%`);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.join(' AND ') + ssidCondition;

    const probeRequests = await prisma.$queryRawUnsafe<Array<{
      id: string;
      ts: Date;
      source_mac: string;
      ssid: string | null;
      signal_dbm: number | null;
      channel: string | null;
      latitude: any;
      longitude: any;
      vendor: string | null;
      dot11_info: any;
    }>>(`
      SELECT 
        p.id,
        p.ts,
        p.source_mac::text as source_mac,
        p.dot11_info->>'ssid' as ssid,
        p.signal_dbm,
        p.channel,
        p.latitude,
        p.longitude,
        p.dot11_info->>'vendor' as vendor,
        p.dot11_info
      FROM packets p
      WHERE ${whereClause}
      ORDER BY p.ts DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, parseInt(limit as string), parseInt(offset as string));

    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::integer as count
      FROM packets p
      WHERE ${whereClause}
    `, ...queryParams);
    const total = totalResult[0]?.count || 0;

    return res.status(200).json({
      probes: probeRequests.map(probe => ({
        id: probe.id,
        timestamp: probe.ts.toISOString(),
        clientMac: probe.source_mac,
        ssid: probe.ssid || null,
        signalStrength: probe.signal_dbm,
        channel: probe.channel,
        latitude: probe.latitude ? Number(probe.latitude) : null,
        longitude: probe.longitude ? Number(probe.longitude) : null,
        vendor: probe.vendor,
        isBroadcast: !probe.ssid || probe.ssid === '',
        dot11Info: probe.dot11_info,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      filters: {
        hoursBack,
        clientMac: client_mac,
        ssid,
        vendor,
        minSignal: min_signal,
        bbox,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch probe requests:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/probes/clients - Get clients by their probe activity
router.get('/probes/clients', async (req: Request, res: Response) => {
  try {
    const {
      min_probes = '5',
      hours_back = '24',
      vendor,
      limit = '1000',
      offset = '0',
    } = req.query;

    const hoursBack = parseInt(hours_back as string);
    const minProbes = parseInt(min_probes as string);

    let whereConditions: string[] = [
      'p.packet_type = \'management\'',
      'p.sub_type = \'probe_req\'',
      `p.ts >= NOW() - INTERVAL '${hoursBack} hours'`
    ];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (vendor) {
      whereConditions.push(`p.dot11_info->>'vendor' ILIKE $${paramIndex}`);
      queryParams.push(`%${vendor}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const clientProbeActivity = await prisma.$queryRawUnsafe<Array<{
      client_mac: string;
      probe_count: number;
      unique_ssids: number;
      vendor: string | null;
      first_seen: Date;
      last_seen: Date;
      ssids_probed: string[];
      broadcast_probes: number;
    }>>(`
      SELECT 
        p.source_mac::text as client_mac,
        COUNT(*)::integer as probe_count,
        COUNT(DISTINCT NULLIF(p.dot11_info->>'ssid', ''))::integer as unique_ssids,
        COALESCE(MAX(p.dot11_info->>'vendor'), 'Unknown') as vendor,
        MIN(p.ts) as first_seen,
        MAX(p.ts) as last_seen,
        ARRAY_AGG(DISTINCT NULLIF(p.dot11_info->>'ssid', '')) FILTER (WHERE p.dot11_info->>'ssid' != '') as ssids_probed,
        COUNT(*) FILTER (WHERE p.dot11_info->>'ssid' IS NULL OR p.dot11_info->>'ssid' = '')::integer as broadcast_probes
      FROM packets p
      WHERE ${whereClause}
      GROUP BY p.source_mac
      HAVING COUNT(*) >= $${paramIndex}
      ORDER BY probe_count DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `, ...queryParams, minProbes, parseInt(limit as string), parseInt(offset as string));

    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(DISTINCT p.source_mac)::integer as count
      FROM packets p
      WHERE ${whereClause}
      GROUP BY p.source_mac
      HAVING COUNT(*) >= $${paramIndex}
    `, ...queryParams, minProbes);
    const total = totalResult.length;

    return res.status(200).json({
      clients: clientProbeActivity.map(client => ({
        clientMac: client.client_mac,
        probeCount: client.probe_count,
        uniqueSSIDs: client.unique_ssids,
        vendor: client.vendor,
        firstSeen: client.first_seen?.toISOString(),
        lastSeen: client.last_seen?.toISOString(),
        ssidsProbed: client.ssids_probed?.filter(Boolean) || [],
        broadcastProbes: client.broadcast_probes,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      filters: {
        minProbes,
        hoursBack,
        vendor,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch client probe activity:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wifi/probes/networks - Get networks being probed for
router.get('/probes/networks', async (req: Request, res: Response) => {
  try {
    const {
      min_probes = '1',
      hours_back = '24',
      unknown_only = 'false',
      include_wigle = 'false',
      limit = '5000',
      offset = '0',
    } = req.query;

    const hoursBack = parseInt(hours_back as string);
    const minProbes = parseInt(min_probes as string);

    // Get networks being probed for
    const probedNetworks = await prisma.$queryRawUnsafe<Array<{
      ssid: string;
      probe_count: number;
      unique_clients: number;
      first_probed: Date;
      last_probed: Date;
      is_in_database: boolean;
      network_bssid: string | null;
      network_security: string | null;
    }>>(`
      WITH probe_data AS (
        SELECT 
          p.dot11_info->>'ssid' as ssid,
          COUNT(*)::integer as probe_count,
          COUNT(DISTINCT p.source_mac)::integer as unique_clients,
          MIN(p.ts) as first_probed,
          MAX(p.ts) as last_probed
        FROM packets p
        WHERE p.packet_type = 'management' 
          AND p.sub_type = 'probe_req'
          AND p.ts >= NOW() - INTERVAL '${hoursBack} hours'
          AND p.dot11_info->>'ssid' IS NOT NULL
          AND p.dot11_info->>'ssid' != ''
        GROUP BY p.dot11_info->>'ssid'
        HAVING COUNT(*) >= ${minProbes}
      )
      SELECT 
        pd.ssid,
        pd.probe_count,
        pd.unique_clients,
        pd.first_probed,
        pd.last_probed,
        (n.ssid IS NOT NULL OR wc.ssid IS NOT NULL) as is_in_database,
        n.bssid::text as network_bssid,
        COALESCE(n.security_type, 
          CASE 
            WHEN wc.ssid IS NOT NULL THEN 'Wigle Data Available'
            ELSE NULL 
          END
        ) as network_security
      FROM probe_data pd
      LEFT JOIN wifi_networks n ON pd.ssid = n.ssid
      LEFT JOIN wigle_cache wc ON wc.ssid = pd.ssid
      ${unknown_only === 'true' ? 'WHERE n.ssid IS NULL AND wc.ssid IS NULL' : ''}
      ORDER BY pd.probe_count DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `);

    // If include_wigle is true, enrich unknown networks with Wigle data
    if (include_wigle === 'true') {
      const wigleService = await import('../services/wigle-integration.service');
      
      for (const network of probedNetworks) {
        if (!network.is_in_database) {
          // This is a placeholder - in reality you'd need to implement SSID-based Wigle search
          // Wigle API primarily works with BSSID/location, not just SSID
          network.network_security = 'Unknown - Wigle lookup needed';
        }
      }
    }

    return res.status(200).json({
      networks: probedNetworks.map(network => ({
        ssid: network.ssid,
        probeCount: network.probe_count,
        uniqueClients: network.unique_clients,
        firstProbed: network.first_probed?.toISOString(),
        lastProbed: network.last_probed?.toISOString(),
        isInDatabase: network.is_in_database,
        networkBSSID: network.network_bssid,
        networkSecurity: network.network_security,
        isUnknown: !network.is_in_database,
      })),
      total: probedNetworks.length,
      filters: {
        minProbes,
        hoursBack,
        unknownOnly: unknown_only === 'true',
        includeWigle: include_wigle === 'true',
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch probed networks:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wifi/wigle/lookup-ssid - Lookup a single SSID in Wigle
router.post('/wigle/lookup-ssid', async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[${requestId}] Starting Wigle SSID lookup request`);
  
  try {
    const { ssid } = req.body;
    console.log(`[${requestId}] SSID to lookup: ${ssid}`);

    if (!ssid || typeof ssid !== 'string') {
      console.log(`[${requestId}] Invalid SSID provided`);
      return res.status(400).json({ error: 'SSID is required and must be a string' });
    }

    const wigleService = await import('../services/wigle-integration.service');
    
    // Check API stats first
    const stats = await wigleService.default.getApiStats();
    console.log(`[${requestId}] Wigle API Stats:`, stats);
    
    if (stats.apiCallsRemaining <= 0) {
      console.log(`[${requestId}] Rate limit exceeded - no calls remaining`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: `Daily limit reached. ${stats.requestsToday}/${stats.maxRequestsPerDay} requests used today.`,
        stats: stats
      });
    }
    
    const result = await wigleService.default.searchNetworkBySSID(ssid);
    console.log(`[${requestId}] Wigle service returned:`, result ? 'success' : 'null');

    if (!result) {
      console.log(`[${requestId}] Wigle service returned null - likely rate limited`);
      return res.status(429).json({ 
        error: 'Wigle API request failed', 
        message: 'Rate limit exceeded or API unavailable',
        stats: await wigleService.default.getApiStats()
      });
    }

    console.log(`[${requestId}] Returning successful response with ${result.results.length} results`);
    return res.status(200).json({
      success: result.success,
      ssid: ssid,
      totalResults: result.totalResults,
      results: result.results.slice(0, 10), // Limit to first 10 results
      cached: false, // For now, assume fresh unless we add cache detection
      stats: await wigleService.default.getApiStats()
    });

  } catch (error) {
    console.error(`[${requestId}] ERROR: Wigle SSID lookup failed:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;