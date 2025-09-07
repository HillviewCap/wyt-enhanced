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
      limit = '100',
      offset = '0',
      bbox, // Bounding box: "minLat,minLon,maxLat,maxLon"
    } = req.query;

    const whereClause: any = {};
    
    if (security_type) {
      whereClause.securityType = security_type;
    }
    
    if (min_signal_strength) {
      whereClause.signalStrength = {
        ...whereClause.signalStrength,
        gte: parseInt(min_signal_strength as string),
      };
    }
    
    if (max_signal_strength) {
      whereClause.signalStrength = {
        ...whereClause.signalStrength,
        lte: parseInt(max_signal_strength as string),
      };
    }
    
    if (channel) {
      whereClause.channel = parseInt(channel as string);
    }
    
    if (vendor) {
      whereClause.vendor = {
        contains: vendor as string,
        mode: 'insensitive',
      };
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

    // Use raw query to handle macaddr type properly
    const networks = await prisma.$queryRaw<Array<{
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
      ORDER BY signal_strength DESC NULLS LAST
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `;

    const totalResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::integer as count FROM wifi_networks
    `;
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
        clientCount: 0, // TODO: Add client count query if needed
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
      limit = '100',
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

export default router;