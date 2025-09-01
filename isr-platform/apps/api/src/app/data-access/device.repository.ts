import { PrismaClient, Device } from '@prisma/client';

export class DeviceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    macAddress: string;
    firstSeen: Date;
    lastSeen: Date;
  }): Promise<Device> {
    return this.prisma.device.create({
      data,
    });
  }

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: { id },
      include: { sightings: true },
    });
  }

  async findByMacAddress(macAddress: string): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: { macAddress },
      include: { sightings: true },
    });
  }

  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany({
      include: { sightings: false },
    });
  }

  async update(
    id: string,
    data: Partial<{
      macAddress: string;
      firstSeen: Date;
      lastSeen: Date;
    }>
  ): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data,
    });
  }

  async updateByMacAddress(
    macAddress: string,
    data: Partial<{
      firstSeen: Date;
      lastSeen: Date;
    }>
  ): Promise<Device> {
    return this.prisma.device.update({
      where: { macAddress },
      data,
    });
  }

  async upsert(data: {
    macAddress: string;
    firstSeen: Date;
    lastSeen: Date;
  }): Promise<Device> {
    // Fetch existing device to properly handle firstSeen update
    const existing = await this.prisma.device.findUnique({
      where: { macAddress: data.macAddress },
    });

    if (existing) {
      // Only update firstSeen if the new one is earlier
      const updateData: any = {
        lastSeen: data.lastSeen,
      };
      
      if (data.firstSeen < existing.firstSeen) {
        updateData.firstSeen = data.firstSeen;
      }
      
      return this.prisma.device.update({
        where: { macAddress: data.macAddress },
        data: updateData,
      });
    }

    return this.prisma.device.create({
      data,
    });
  }

  async delete(id: string): Promise<Device> {
    return this.prisma.device.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return this.prisma.device.count();
  }
}