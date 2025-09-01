import { PrismaClient, Sighting } from '@prisma/client';

export class SightingRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    deviceId: string;
    timestamp: Date;
    latitude: number;
    longitude: number;
    signalStrength: number;
  }): Promise<Sighting> {
    return this.prisma.sighting.create({
      data,
    });
  }

  async createMany(
    data: Array<{
      deviceId: string;
      timestamp: Date;
      latitude: number;
      longitude: number;
      signalStrength: number;
    }>
  ): Promise<{ count: number }> {
    return this.prisma.sighting.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async findById(id: string): Promise<Sighting | null> {
    return this.prisma.sighting.findUnique({
      where: { id },
      include: { device: true },
    });
  }

  async findByDeviceId(deviceId: string): Promise<Sighting[]> {
    return this.prisma.sighting.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<Sighting[]> {
    return this.prisma.sighting.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      include: { device: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findByLocation(
    latitude: number,
    longitude: number,
    radiusInDegrees: number = 0.001
  ): Promise<Sighting[]> {
    return this.prisma.sighting.findMany({
      where: {
        AND: [
          {
            latitude: {
              gte: latitude - radiusInDegrees,
              lte: latitude + radiusInDegrees,
            },
          },
          {
            longitude: {
              gte: longitude - radiusInDegrees,
              lte: longitude + radiusInDegrees,
            },
          },
        ],
      },
      include: { device: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findAll(limit?: number): Promise<Sighting[]> {
    return this.prisma.sighting.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: { device: false },
    });
  }

  async update(
    id: string,
    data: Partial<{
      deviceId: string;
      timestamp: Date;
      latitude: number;
      longitude: number;
      signalStrength: number;
    }>
  ): Promise<Sighting> {
    return this.prisma.sighting.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Sighting> {
    return this.prisma.sighting.delete({
      where: { id },
    });
  }

  async deleteByDeviceId(deviceId: string): Promise<{ count: number }> {
    return this.prisma.sighting.deleteMany({
      where: { deviceId },
    });
  }

  async count(): Promise<number> {
    return this.prisma.sighting.count();
  }

  async countByDeviceId(deviceId: string): Promise<number> {
    return this.prisma.sighting.count({
      where: { deviceId },
    });
  }
}