import { AnalysisResultRepository } from './analysis-result.repository';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    analysisResult: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

describe('AnalysisResultRepository', () => {
  let repository: AnalysisResultRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    repository = new AnalysisResultRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new analysis result', async () => {
      const data = {
        deviceId: 'device-1',
        persistenceScore: 0.75,
        analysisTimestamp: new Date(),
        locationCount: 3,
        timeWindowHours: 24,
      };

      const expected = { id: 'result-1', ...data };
      mockPrisma.analysisResult.create.mockResolvedValue(expected);

      const result = await repository.create(data);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith({
        data: {
          deviceId: data.deviceId,
          persistenceScore: data.persistenceScore,
          analysisTimestamp: data.analysisTimestamp,
          locationCount: data.locationCount,
          timeWindowHours: data.timeWindowHours,
        },
      });
    });
  });

  describe('createMany', () => {
    it('should create multiple analysis results', async () => {
      const data = [
        {
          deviceId: 'device-1',
          persistenceScore: 0.75,
          analysisTimestamp: new Date(),
          locationCount: 3,
          timeWindowHours: 24,
        },
        {
          deviceId: 'device-2',
          persistenceScore: 0.5,
          analysisTimestamp: new Date(),
          locationCount: 2,
          timeWindowHours: 24,
        },
      ];

      mockPrisma.analysisResult.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.createMany(data);

      expect(result.count).toBe(2);
      expect(mockPrisma.analysisResult.createMany).toHaveBeenCalledWith({
        data: data.map(item => ({
          deviceId: item.deviceId,
          persistenceScore: item.persistenceScore,
          analysisTimestamp: item.analysisTimestamp,
          locationCount: item.locationCount,
          timeWindowHours: item.timeWindowHours,
        })),
        skipDuplicates: true,
      });
    });
  });

  describe('findAll', () => {
    it('should find all analysis results ordered by score', async () => {
      const expected = [
        { id: 'result-1', persistenceScore: 0.9 },
        { id: 'result-2', persistenceScore: 0.7 },
      ];

      mockPrisma.analysisResult.findMany.mockResolvedValue(expected);

      const result = await repository.findAll();

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.findMany).toHaveBeenCalledWith({
        orderBy: { persistenceScore: 'desc' },
      });
    });
  });

  describe('findByMinScore', () => {
    it('should find results with minimum score', async () => {
      const minScore = 0.5;
      const expected = [
        { id: 'result-1', persistenceScore: 0.9 },
        { id: 'result-2', persistenceScore: 0.6 },
      ];

      mockPrisma.analysisResult.findMany.mockResolvedValue(expected);

      const result = await repository.findByMinScore(minScore);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.findMany).toHaveBeenCalledWith({
        where: {
          persistenceScore: {
            gte: minScore,
          },
        },
        orderBy: { persistenceScore: 'desc' },
      });
    });
  });

  describe('findByDeviceId', () => {
    it('should find latest result for device', async () => {
      const deviceId = 'device-1';
      const expected = { id: 'result-1', deviceId, analysisTimestamp: new Date() };

      mockPrisma.analysisResult.findFirst.mockResolvedValue(expected);

      const result = await repository.findByDeviceId(deviceId);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.findFirst).toHaveBeenCalledWith({
        where: { deviceId },
        orderBy: { analysisTimestamp: 'desc' },
      });
    });

    it('should return null if no result found', async () => {
      mockPrisma.analysisResult.findFirst.mockResolvedValue(null);

      const result = await repository.findByDeviceId('device-999');

      expect(result).toBeNull();
    });
  });

  describe('findByDeviceIds', () => {
    it('should find results for multiple devices', async () => {
      const deviceIds = ['device-1', 'device-2'];
      const expected = [
        { id: 'result-1', deviceId: 'device-1' },
        { id: 'result-2', deviceId: 'device-2' },
      ];

      mockPrisma.analysisResult.findMany.mockResolvedValue(expected);

      const result = await repository.findByDeviceIds(deviceIds);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.findMany).toHaveBeenCalledWith({
        where: {
          deviceId: {
            in: deviceIds,
          },
        },
        orderBy: { persistenceScore: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update an analysis result', async () => {
      const id = 'result-1';
      const data = {
        persistenceScore: 0.85,
        locationCount: 4,
      };

      const expected = { id, ...data };
      mockPrisma.analysisResult.update.mockResolvedValue(expected);

      const result = await repository.update(id, data);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          persistenceScore: data.persistenceScore,
          analysisTimestamp: undefined,
          locationCount: data.locationCount,
          timeWindowHours: undefined,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete an analysis result', async () => {
      const id = 'result-1';
      mockPrisma.analysisResult.delete.mockResolvedValue({ id });

      await repository.delete(id);

      expect(mockPrisma.analysisResult.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('deleteAll', () => {
    it('should delete all analysis results', async () => {
      mockPrisma.analysisResult.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.deleteAll();

      expect(result.count).toBe(5);
      expect(mockPrisma.analysisResult.deleteMany).toHaveBeenCalledWith({});
    });
  });

  describe('findWithDevices', () => {
    it('should find results with device information', async () => {
      const expected = [
        {
          id: 'result-1',
          persistenceScore: 0.9,
          device: { id: 'device-1', macAddress: '00:11:22:33:44:55' },
        },
      ];

      mockPrisma.analysisResult.findMany.mockResolvedValue(expected);

      const result = await repository.findWithDevices(0.5);

      expect(result).toEqual(expected);
      expect(mockPrisma.analysisResult.findMany).toHaveBeenCalledWith({
        where: { persistenceScore: { gte: 0.5 } },
        include: { device: true },
        orderBy: { persistenceScore: 'desc' },
      });
    });

    it('should find all results when no minimum score', async () => {
      mockPrisma.analysisResult.findMany.mockResolvedValue([]);

      await repository.findWithDevices();

      expect(mockPrisma.analysisResult.findMany).toHaveBeenCalledWith({
        where: {},
        include: { device: true },
        orderBy: { persistenceScore: 'desc' },
      });
    });
  });

  describe('getLatestAnalysisTimestamp', () => {
    it('should return latest timestamp', async () => {
      const timestamp = new Date();
      mockPrisma.analysisResult.findFirst.mockResolvedValue({ analysisTimestamp: timestamp });

      const result = await repository.getLatestAnalysisTimestamp();

      expect(result).toEqual(timestamp);
      expect(mockPrisma.analysisResult.findFirst).toHaveBeenCalledWith({
        orderBy: { analysisTimestamp: 'desc' },
        select: { analysisTimestamp: true },
      });
    });

    it('should return null if no results', async () => {
      mockPrisma.analysisResult.findFirst.mockResolvedValue(null);

      const result = await repository.getLatestAnalysisTimestamp();

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all results', async () => {
      mockPrisma.analysisResult.count.mockResolvedValue(10);

      const result = await repository.count();

      expect(result).toBe(10);
      expect(mockPrisma.analysisResult.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should count results with minimum score', async () => {
      mockPrisma.analysisResult.count.mockResolvedValue(5);

      const result = await repository.count(0.7);

      expect(result).toBe(5);
      expect(mockPrisma.analysisResult.count).toHaveBeenCalledWith({
        where: { persistenceScore: { gte: 0.7 } },
      });
    });
  });
});