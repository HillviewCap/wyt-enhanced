import { Router, Request, Response } from 'express';
import { prisma } from '../data-access';

const router = Router();

const safePromise = <T>(promise: Promise<T>): Promise<[T | null, any | null]> => {
  return promise
    .then(data => [data, null] as [T, null])
    .catch(error => [null, error] as [null, any]);
};

// POST /api/drives/refresh - Refresh drive sessions from wardriving_sessions table
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log(`[${new Date().toISOString()}] INFO: Refreshing drive sessions from wardriving_sessions table`);

    const sessions = await prisma.wardrivingSession.findMany({
      orderBy: { startTime: 'desc' },
    });

    console.log(`[${new Date().toISOString()}] INFO: Found ${sessions.length} wardriving sessions`);

    return res.status(200).json({
      message: 'Drive sessions refreshed',
      totalSessions: sessions.length,
      sessions: sessions.map(session => ({
        id: session.id,
        sessionName: session.sessionName,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString(),
        totalDistance: session.totalDistance ? Number(session.totalDistance) : null,
        areaCovered: session.areaCovered ? Number(session.areaCovered) : null,
        networksDiscovered: session.networksDiscovered,
        devicesDiscovered: session.devicesDiscovered,
      })),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Drive refresh failed:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drives/sessions - List all wardriving sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', start_date, end_date } = req.query;

    const whereClause: any = {};

    if (start_date || end_date) {
      whereClause.startTime = {};
      if (start_date) whereClause.startTime.gte = new Date(start_date as string);
      if (end_date) whereClause.startTime.lte = new Date(end_date as string);
    }

    const sessions = await prisma.wardrivingSession.findMany({
      where: whereClause,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { startTime: 'desc' },
    });

    const total = await prisma.wardrivingSession.count({ where: whereClause });

    return res.status(200).json({
      sessions: sessions.map(session => ({
        id: session.id,
        sessionName: session.sessionName,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString(),
        totalDistance: session.totalDistance ? Number(session.totalDistance) : null,
        areaCovered: session.areaCovered ? Number(session.areaCovered) : null,
        networksDiscovered: session.networksDiscovered,
        devicesDiscovered: session.devicesDiscovered,
        datasourceUuids: session.datasourceUuids,
        routeGeojson: session.routeGeojson,
        metadata: session.metadata,
        createdAt: session.createdAt?.toISOString() || new Date().toISOString(),
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch wardriving sessions:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drives/sessions/:id - Get specific wardriving session with route
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.wardrivingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Wardriving session not found' });
    }

    return res.status(200).json({
      id: session.id,
      sessionName: session.sessionName,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString(),
      totalDistance: session.totalDistance ? Number(session.totalDistance) : null,
      areaCovered: session.areaCovered ? Number(session.areaCovered) : null,
      networksDiscovered: session.networksDiscovered,
      devicesDiscovered: session.devicesDiscovered,
      datasourceUuids: session.datasourceUuids,
      routeGeojson: session.routeGeojson,
      metadata: session.metadata,
      createdAt: session.createdAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch wardriving session:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drives/sessions/:id/networks - Get networks discovered during wardriving session
router.get('/sessions/:id/networks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.wardrivingSession.findUnique({
      where: { id },
      select: { startTime: true, endTime: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Wardriving session not found' });
    }

    if (!session.endTime) {
      return res.status(400).json({ error: 'Session end time not available' });
    }

    // Use raw query to handle macaddr types properly
    const networksRaw = await prisma.$queryRaw<Array<{
      id: string;
      bssid: string;
      ssid: string | null;
      security_type: string | null;
      channel: number | null;
      signal_strength: number | null;
      vendor: string | null;
      latitude: any;
      longitude: any;
      first_seen: Date | null;
      client_count: number;
    }>>`
      SELECT
        n.id,
        n.bssid::text as bssid,
        n.ssid,
        n.security_type,
        n.channel,
        n.signal_strength,
        n.vendor,
        n.latitude,
        n.longitude,
        n.first_seen,
        COUNT(c.id)::integer as client_count
      FROM wifi_networks n
      LEFT JOIN wifi_clients c ON n.bssid = c.network_bssid
      WHERE n.first_seen >= ${session.startTime} AND n.first_seen <= ${session.endTime}
      GROUP BY n.id, n.bssid, n.ssid, n.security_type, n.channel, n.signal_strength, n.vendor, n.latitude, n.longitude, n.first_seen
      ORDER BY n.signal_strength DESC NULLS LAST
    `;

    return res.status(200).json({
      sessionId: id,
      timeRange: {
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
      },
      networks: networksRaw.map(network => ({
        id: network.id,
        bssid: network.bssid,
        ssid: network.ssid,
        securityType: network.security_type,
        channel: network.channel,
        signalStrength: network.signal_strength,
        vendor: network.vendor,
        latitude: network.latitude ? Number(network.latitude) : null,
        longitude: network.longitude ? Number(network.longitude) : null,
        firstSeen: network.first_seen?.toISOString(),
        clientCount: network.client_count,
      })),
      total: networksRaw.length,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch wardriving session networks:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/drives/sessions/:id - Delete a wardriving session
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.wardrivingSession.findUnique({
      where: { id },
      select: { id: true, sessionName: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Wardriving session not found' });
    }

    await prisma.wardrivingSession.delete({
      where: { id },
    });

    console.log(`[${new Date().toISOString()}] INFO: Deleted wardriving session ${id} (${session.sessionName})`);

    return res.status(200).json({
      message: 'Wardriving session deleted successfully',
      deletedSession: {
        id: session.id,
        sessionName: session.sessionName,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to delete wardriving session:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drives/stats - Get wardriving statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      [totalSessions, totalSessionsError],
      [totalDistanceResult, totalDistanceError],
      [totalAreaResult, totalAreaError],
      [recentSessions, recentSessionsError],
    ] = await Promise.all([
      safePromise(prisma.wardrivingSession.count()),
      safePromise(prisma.wardrivingSession.aggregate({
        _sum: { totalDistance: true },
        _avg: { totalDistance: true },
      })),
      safePromise(prisma.wardrivingSession.aggregate({
        _sum: { areaCovered: true },
        _avg: { areaCovered: true },
      })),
      safePromise(prisma.wardrivingSession.findMany({
        take: 50,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          sessionName: true,
          startTime: true,
          totalDistance: true,
          areaCovered: true,
          networksDiscovered: true,
          devicesDiscovered: true,
        },
      })),
    ]);

    if (totalSessionsError || totalDistanceError || totalAreaError || recentSessionsError) {
      console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch wardriving stats components:`, {
        totalSessionsError,
        totalDistanceError,
        totalAreaError,
        recentSessionsError,
      });
      return res.status(500).json({ error: 'Partial or complete failure in fetching stats' });
    }

    return res.status(200).json({
      totalSessions: totalSessions ?? 0,
      totalDistance: totalDistanceResult?._sum.totalDistance ? Number(totalDistanceResult._sum.totalDistance) : 0,
      avgDistance: totalDistanceResult?._avg.totalDistance ? Number(totalDistanceResult._avg.totalDistance) : 0,
      totalAreaCovered: totalAreaResult?._sum.areaCovered ? Number(totalAreaResult._sum.areaCovered) : 0,
      avgAreaCovered: totalAreaResult?._avg.areaCovered ? Number(totalAreaResult._avg.areaCovered) : 0,
      recentSessions: (recentSessions || []).map(session => ({
        id: session.id,
        sessionName: session.sessionName,
        startTime: session.startTime.toISOString(),
        totalDistance: session.totalDistance ? Number(session.totalDistance) : null,
        areaCovered: session.areaCovered ? Number(session.areaCovered) : null,
        networksDiscovered: session.networksDiscovered,
        devicesDiscovered: session.devicesDiscovered,
      })),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch wardriving stats:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
