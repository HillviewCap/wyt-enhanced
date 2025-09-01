import { PrismaClient, AnalysisResult as PrismaAnalysisResult } from '@prisma/client';
import { AnalysisResult } from '@isr-platform/data-models';

export class AnalysisResultRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new analysis result
   */
  async create(data: Omit<AnalysisResult, 'id'>): Promise<AnalysisResult> {
    return await this.prisma.analysisResult.create({
      data: {
        deviceId: data.deviceId,
        persistenceScore: data.persistenceScore,
        analysisTimestamp: data.analysisTimestamp,
        locationCount: data.locationCount,
        timeWindowHours: data.timeWindowHours,
      },
    });
  }

  /**
   * Create multiple analysis results in batch
   */
  async createMany(data: Omit<AnalysisResult, 'id'>[]): Promise<{ count: number }> {
    return await this.prisma.analysisResult.createMany({
      data: data.map(item => ({
        deviceId: item.deviceId,
        persistenceScore: item.persistenceScore,
        analysisTimestamp: item.analysisTimestamp,
        locationCount: item.locationCount,
        timeWindowHours: item.timeWindowHours,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Find all analysis results
   */
  async findAll(): Promise<AnalysisResult[]> {
    return await this.prisma.analysisResult.findMany({
      orderBy: { persistenceScore: 'desc' },
    });
  }

  /**
   * Find analysis results by minimum persistence score
   */
  async findByMinScore(minScore: number): Promise<AnalysisResult[]> {
    return await this.prisma.analysisResult.findMany({
      where: {
        persistenceScore: {
          gte: minScore,
        },
      },
      orderBy: { persistenceScore: 'desc' },
    });
  }

  /**
   * Find analysis result by device ID
   */
  async findByDeviceId(deviceId: string): Promise<AnalysisResult | null> {
    return await this.prisma.analysisResult.findFirst({
      where: { deviceId },
      orderBy: { analysisTimestamp: 'desc' },
    });
  }

  /**
   * Find analysis results by device IDs
   */
  async findByDeviceIds(deviceIds: string[]): Promise<AnalysisResult[]> {
    return await this.prisma.analysisResult.findMany({
      where: {
        deviceId: {
          in: deviceIds,
        },
      },
      orderBy: { persistenceScore: 'desc' },
    });
  }

  /**
   * Update an analysis result
   */
  async update(id: string, data: Partial<Omit<AnalysisResult, 'id'>>): Promise<AnalysisResult> {
    return await this.prisma.analysisResult.update({
      where: { id },
      data: {
        persistenceScore: data.persistenceScore,
        analysisTimestamp: data.analysisTimestamp,
        locationCount: data.locationCount,
        timeWindowHours: data.timeWindowHours,
      },
    });
  }

  /**
   * Delete an analysis result
   */
  async delete(id: string): Promise<void> {
    await this.prisma.analysisResult.delete({
      where: { id },
    });
  }

  /**
   * Delete all analysis results
   */
  async deleteAll(): Promise<{ count: number }> {
    return await this.prisma.analysisResult.deleteMany({});
  }

  /**
   * Link analysis results to devices
   */
  async linkToDevices(analysisResults: PrismaAnalysisResult[]): Promise<void> {
    // The linking is automatic through the foreign key relationship
    // This method is here for clarity and potential future enhancements
    for (const result of analysisResults) {
      await this.prisma.analysisResult.update({
        where: { id: result.id },
        data: {
          device: {
            connect: { id: result.deviceId },
          },
        },
      });
    }
  }

  /**
   * Get analysis results with device information
   */
  async findWithDevices(minScore?: number): Promise<(AnalysisResult & { device: any })[]> {
    const where = minScore ? { persistenceScore: { gte: minScore } } : {};
    
    return await this.prisma.analysisResult.findMany({
      where,
      include: {
        device: true,
      },
      orderBy: { persistenceScore: 'desc' },
    });
  }

  /**
   * Get latest analysis timestamp
   */
  async getLatestAnalysisTimestamp(): Promise<Date | null> {
    const latest = await this.prisma.analysisResult.findFirst({
      orderBy: { analysisTimestamp: 'desc' },
      select: { analysisTimestamp: true },
    });
    
    return latest?.analysisTimestamp || null;
  }

  /**
   * Count analysis results
   */
  async count(minScore?: number): Promise<number> {
    const where = minScore ? { persistenceScore: { gte: minScore } } : {};
    return await this.prisma.analysisResult.count({ where });
  }
}