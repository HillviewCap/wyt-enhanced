import { PrismaClient, Device } from '@prisma/client';

export class DeviceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    macAddress: string;
    firstSeen: Date;
    lastSeen: Date;
  }): Promise<Device> {
    return this.prisma.device.create({
      data: {
        key: data.macAddress, // Use macAddress as key for compatibility
        firstTime: data.firstSeen,
        lastTime: data.lastSeen,
      },
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
      where: { key: macAddress },
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
      where: { key: macAddress },
      data,
    });
  }

  async upsert(data: {
    macAddress: string;
    firstSeen: Date;
    lastSeen: Date;
  }): Promise<Device> {
    // Fetch existing device to properly handle firstSeen update
    // Use key instead of macaddr since macaddr is unsupported type
    const existing = await this.prisma.device.findUnique({
      where: { key: data.macAddress },
    });

    if (existing) {
      // Only update firstSeen if the new one is earlier
      const updateData: any = {
        lastTime: data.lastSeen,
      };
      
      if (existing.firstTime && data.firstSeen < existing.firstTime) {
        updateData.firstTime = data.firstSeen;
      }
      
      return this.prisma.device.update({
        where: { key: data.macAddress },
        data: updateData,
      });
    }

    return this.prisma.device.create({
      data: {
        key: data.macAddress, // Use macAddress as key for compatibility
        firstTime: data.firstSeen,
        lastTime: data.lastSeen,
      },
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