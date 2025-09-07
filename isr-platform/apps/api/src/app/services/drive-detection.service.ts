import { PrismaClient } from '@prisma/client';

interface GpsPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
}

interface DriveSegment {
  startTime: Date;
  endTime: Date;
  points: GpsPoint[];
  totalDistance: number;
  avgSpeed: number;
  maxSpeed: number;
}

interface DriveDetectionResult {
  sessions: DriveSegment[];
  totalSessions: number;
  processingStats: {
    pointsProcessed: number;
    sessionsDetected: number;
    duration: string;
  };
}

export class DriveDetectionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async detectDriveSessionsFromSnapshots(
    startTime?: Date, 
    endTime?: Date
  ): Promise<DriveDetectionResult> {
    const startProcessing = Date.now();

    const whereClause: any = {};
    if (startTime || endTime) {
      whereClause.timestamp = {};
      if (startTime) whereClause.timestamp.gte = startTime;
      if (endTime) whereClause.timestamp.lte = endTime;
    }

    // Use raw query since the actual database schema differs from Prisma schema
    let query = `
      SELECT ts, latitude, longitude, altitude
      FROM snapshots 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND snaptype = 'GPS'
    `;
    
    const params: any[] = [];
    if (startTime) {
      query += ` AND ts >= $${params.length + 1}`;
      params.push(startTime);
    }
    if (endTime) {
      query += ` AND ts <= $${params.length + 1}`;
      params.push(endTime);
    }
    query += ` ORDER BY ts ASC`;
    
    const snapshots = await this.prisma.$queryRawUnsafe<Array<{
      ts: Date;
      latitude: any;
      longitude: any;
      altitude: any;
    }>>(query, ...params);

    const gpsPoints: GpsPoint[] = snapshots.map(s => ({
      timestamp: s.ts,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      altitude: s.altitude ? Number(s.altitude) : undefined,
      accuracy: undefined, // Not available in current schema
      speed: undefined, // Not available in current schema
    }));

    const sessions = this.detectDriveSegments(gpsPoints);
    const processingTime = Date.now() - startProcessing;

    return {
      sessions,
      totalSessions: sessions.length,
      processingStats: {
        pointsProcessed: gpsPoints.length,
        sessionsDetected: sessions.length,
        duration: `${processingTime}ms`,
      },
    };
  }

  private detectDriveSegments(points: GpsPoint[]): DriveSegment[] {
    if (points.length < 2) return [];

    const segments: DriveSegment[] = [];
    const MOVEMENT_THRESHOLD_M = 10; // 10 meters minimum movement
    const STATIONARY_TIME_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
    const MIN_DRIVE_DURATION_MS = 30 * 1000; // 30 seconds
    const SPEED_THRESHOLD_KMH = 6; // Above 6 km/h considered driving

    let currentSegment: GpsPoint[] = [];
    let lastMovementTime = points[0].timestamp;

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];

      const distance = this.calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        currentPoint.latitude,
        currentPoint.longitude
      );

      const timeDiffMs = currentPoint.timestamp.getTime() - prevPoint.timestamp.getTime();
      const speed = timeDiffMs > 0 ? (distance * 3600000) / (timeDiffMs * 1000) : 0; // km/h

      const isMoving = distance > MOVEMENT_THRESHOLD_M || 
                      (currentPoint.speed && currentPoint.speed > SPEED_THRESHOLD_KMH) ||
                      speed > SPEED_THRESHOLD_KMH;

      if (isMoving) {
        if (currentSegment.length === 0) {
          currentSegment.push(prevPoint);
        }
        currentSegment.push(currentPoint);
        lastMovementTime = currentPoint.timestamp;
      } else {
        const stationaryTime = currentPoint.timestamp.getTime() - lastMovementTime.getTime();
        
        if (stationaryTime > STATIONARY_TIME_THRESHOLD_MS && currentSegment.length > 0) {
          const segmentDuration = currentSegment[currentSegment.length - 1].timestamp.getTime() - 
                                currentSegment[0].timestamp.getTime();
          
          if (segmentDuration >= MIN_DRIVE_DURATION_MS) {
            const driveSegment = this.createDriveSegment(currentSegment);
            segments.push(driveSegment);
          }
          
          currentSegment = [];
        }
      }
    }

    if (currentSegment.length > 0) {
      const segmentDuration = currentSegment[currentSegment.length - 1].timestamp.getTime() - 
                            currentSegment[0].timestamp.getTime();
      
      if (segmentDuration >= MIN_DRIVE_DURATION_MS) {
        const driveSegment = this.createDriveSegment(currentSegment);
        segments.push(driveSegment);
      }
    }

    return segments;
  }

  private createDriveSegment(points: GpsPoint[]): DriveSegment {
    if (points.length === 0) {
      throw new Error('Cannot create drive segment from empty points array');
    }

    let totalDistance = 0;
    const speeds: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
      totalDistance += distance;

      const timeDiffMs = points[i].timestamp.getTime() - points[i - 1].timestamp.getTime();
      if (timeDiffMs > 0) {
        const speed = (distance * 3600000) / (timeDiffMs * 1000); // km/h
        speeds.push(speed);
      }
    }

    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

    return {
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      points,
      totalDistance,
      avgSpeed,
      maxSpeed,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async persistDriveSessions(sessions: DriveSegment[]): Promise<any[]> {
    const persistedSessions = [];

    for (const session of sessions) {
      // Check if a session already exists with the same start/end times and similar location
      const existingSession = await this.prisma.driveSession.findFirst({
        where: {
          startTime: session.startTime,
          endTime: session.endTime,
          startLatitude: {
            gte: session.points[0].latitude - 0.001, // ~100m tolerance
            lte: session.points[0].latitude + 0.001,
          },
          startLongitude: {
            gte: session.points[0].longitude - 0.001,
            lte: session.points[0].longitude + 0.001,
          },
        },
      });

      if (existingSession) {
        console.log(`[${new Date().toISOString()}] INFO: Skipping duplicate drive session for ${session.startTime.toISOString()}`);
        continue;
      }

      const routeGeojson = {
        type: 'LineString',
        coordinates: session.points.map(p => [p.longitude, p.latitude]),
      };

      const networksDiscovered = await this.countNetworksInTimeRange(
        session.startTime,
        session.endTime
      );

      const clientsDiscovered = await this.countClientsInTimeRange(
        session.startTime,
        session.endTime
      );

      const driveSession = await this.prisma.driveSession.create({
        data: {
          sessionName: `Drive ${session.startTime.toISOString().substring(0, 16)}`,
          startTime: session.startTime,
          endTime: session.endTime,
          totalDistanceM: session.totalDistance,
          avgSpeedKmh: session.avgSpeed,
          maxSpeedKmh: session.maxSpeed,
          networksDiscovered,
          clientsDiscovered,
          routeGeojson,
          startLatitude: session.points[0].latitude,
          startLongitude: session.points[0].longitude,
          endLatitude: session.points[session.points.length - 1].latitude,
          endLongitude: session.points[session.points.length - 1].longitude,
          metadata: {
            pointsCount: session.points.length,
            durationMinutes: (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60),
          },
        },
      });

      persistedSessions.push(driveSession);
    }

    return persistedSessions;
  }

  private async countNetworksInTimeRange(startTime: Date, endTime: Date): Promise<number> {
    const count = await this.prisma.wifiNetwork.count({
      where: {
        firstSeen: {
          gte: startTime,
          lte: endTime,
        },
      },
    });
    return count;
  }

  private async countClientsInTimeRange(startTime: Date, endTime: Date): Promise<number> {
    const count = await this.prisma.wifiClient.count({
      where: {
        firstSeen: {
          gte: startTime,
          lte: endTime,
        },
      },
    });
    return count;
  }

  async getAllDriveSessions(): Promise<any[]> {
    return this.prisma.driveSession.findMany({
      orderBy: { startTime: 'desc' },
    });
  }

  async getDriveSession(id: string): Promise<any | null> {
    return this.prisma.driveSession.findUnique({
      where: { id },
    });
  }
}