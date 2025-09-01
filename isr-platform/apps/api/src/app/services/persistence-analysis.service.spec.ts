import { PersistenceAnalysisService } from './persistence-analysis.service';
import { PrismaClient } from '@prisma/client';
import { Device, Sighting } from '@isr-platform/data-models';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    device: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sighting: {
      findMany: jest.fn(),
    },
    analysisResult: {
      createMany: jest.fn(),
    },
  })),
}));

describe('PersistenceAnalysisService', () => {
  let service: PersistenceAnalysisService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new PersistenceAnalysisService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('haversineDistance', () => {
    it('should calculate correct distance between two GPS coordinates', () => {
      // Test with known coordinates: New York to Los Angeles (~4000km)
      const distance = service.haversineDistance(
        40.7128, -74.0060, // New York
        34.0522, -118.2437 // Los Angeles
      );
      
      // Should be approximately 3935 km (3935000 meters)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.haversineDistance(
        40.7128, -74.0060,
        40.7128, -74.0060
      );
      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      // Test with coordinates 100 meters apart (approximately)
      const distance = service.haversineDistance(
        40.7128, -74.0060,
        40.7137, -74.0060
      );
      // Should be approximately 100 meters
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });
  });

  describe('calculatePersistenceScore', () => {
    it('should return score between 0 and 1', () => {
      const locationClusters = [
        {
          centroidLat: 40.7128,
          centroidLon: -74.0060,
          sightings: [createMockSighting('1', new Date('2024-01-01T10:00:00'))],
        },
        {
          centroidLat: 40.7228,
          centroidLon: -74.0160,
          sightings: [createMockSighting('1', new Date('2024-01-01T11:00:00'))],
        },
      ];

      const timeMetrics = {
        timeSpanHours: 5,
        avgIntervalHours: 1,
        regularityScore: 0.8,
      };

      const sightings = [
        createMockSighting('1', new Date('2024-01-01T10:00:00')),
        createMockSighting('1', new Date('2024-01-01T11:00:00')),
        createMockSighting('1', new Date('2024-01-01T12:00:00')),
      ];

      const score = service.calculatePersistenceScore(
        locationClusters,
        timeMetrics,
        sightings
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return higher score for more locations', () => {
      const singleLocation = [
        {
          centroidLat: 40.7128,
          centroidLon: -74.0060,
          sightings: [createMockSighting('1', new Date())],
        },
      ];

      const multipleLocations = [
        {
          centroidLat: 40.7128,
          centroidLon: -74.0060,
          sightings: [createMockSighting('1', new Date())],
        },
        {
          centroidLat: 40.7228,
          centroidLon: -74.0160,
          sightings: [createMockSighting('1', new Date())],
        },
        {
          centroidLat: 40.7328,
          centroidLon: -74.0260,
          sightings: [createMockSighting('1', new Date())],
        },
      ];

      const timeMetrics = {
        timeSpanHours: 5,
        avgIntervalHours: 1,
        regularityScore: 0.5,
      };

      const sightings = [createMockSighting('1', new Date())];

      const score1 = service.calculatePersistenceScore(
        singleLocation,
        timeMetrics,
        sightings
      );

      const score2 = service.calculatePersistenceScore(
        multipleLocations,
        timeMetrics,
        sightings
      );

      expect(score2).toBeGreaterThan(score1);
    });
  });

  describe('calculateTimeMetrics', () => {
    it('should calculate correct time metrics for multiple sightings', () => {
      const sightings = [
        createMockSighting('1', new Date('2024-01-01T10:00:00')),
        createMockSighting('1', new Date('2024-01-01T11:00:00')),
        createMockSighting('1', new Date('2024-01-01T12:00:00')),
        createMockSighting('1', new Date('2024-01-01T13:00:00')),
      ];

      const metrics = service.calculateTimeMetrics(sightings);

      expect(metrics.timeSpanHours).toBe(3);
      expect(metrics.avgIntervalHours).toBe(1);
      expect(metrics.regularityScore).toBeGreaterThan(0.9); // Very regular intervals
    });

    it('should handle single sighting', () => {
      const sightings = [createMockSighting('1', new Date())];

      const metrics = service.calculateTimeMetrics(sightings);

      expect(metrics.timeSpanHours).toBe(0);
      expect(metrics.avgIntervalHours).toBe(0);
      expect(metrics.regularityScore).toBe(0);
    });

    it('should calculate lower regularity score for irregular intervals', () => {
      const sightings = [
        createMockSighting('1', new Date('2024-01-01T10:00:00')),
        createMockSighting('1', new Date('2024-01-01T10:15:00')), // 15 minutes
        createMockSighting('1', new Date('2024-01-01T13:00:00')), // 2.75 hours
        createMockSighting('1', new Date('2024-01-01T13:30:00')), // 30 minutes
      ];

      const metrics = service.calculateTimeMetrics(sightings);

      expect(metrics.regularityScore).toBeLessThan(0.6); // Irregular intervals
    });
  });

  describe('clusterSightingsByLocation', () => {
    it('should group nearby sightings into clusters', () => {
      const sightings = [
        createMockSightingWithLocation('1', 40.7128, -74.0060),
        createMockSightingWithLocation('1', 40.7129, -74.0061), // Very close
        createMockSightingWithLocation('1', 40.7528, -74.0460), // Far away
        createMockSightingWithLocation('1', 40.7529, -74.0461), // Close to third
      ];

      const clusters = service.clusterSightingsByLocation(sightings);

      expect(clusters.length).toBe(2);
      expect(clusters[0].sightings.length).toBe(2);
      expect(clusters[1].sightings.length).toBe(2);
    });

    it('should create single cluster for all close sightings', () => {
      const sightings = [
        createMockSightingWithLocation('1', 40.7128, -74.0060),
        createMockSightingWithLocation('1', 40.7128, -74.0060),
        createMockSightingWithLocation('1', 40.7128, -74.0060),
      ];

      const clusters = service.clusterSightingsByLocation(sightings);

      expect(clusters.length).toBe(1);
      expect(clusters[0].sightings.length).toBe(3);
    });

    it('should update cluster centroid when adding sightings', () => {
      const sightings = [
        createMockSightingWithLocation('1', 40.0, -74.0),
        createMockSightingWithLocation('1', 40.0002, -74.0002), // Within 100m
      ];

      const clusters = service.clusterSightingsByLocation(sightings);

      expect(clusters.length).toBe(1);
      expect(clusters[0].centroidLat).toBeCloseTo(40.0001, 4);
      expect(clusters[0].centroidLon).toBeCloseTo(-74.0001, 4);
    });
  });

  describe('calculateTimeWindowOverlaps', () => {
    it('should count overlaps within time window', () => {
      const sightings = [
        createMockSighting('1', new Date('2024-01-01T10:00:00')),
        createMockSighting('1', new Date('2024-01-01T11:00:00')),
        createMockSighting('1', new Date('2024-01-01T12:00:00')),
        createMockSighting('1', new Date('2024-01-02T11:00:00')), // Next day
      ];

      const overlaps = service.calculateTimeWindowOverlaps(sightings);

      expect(overlaps).toBe(5); // Pairs within 24 hours: (0,1), (0,2), (0,3), (1,2), (1,3)
    });

    it('should return 0 for single sighting', () => {
      const sightings = [createMockSighting('1', new Date())];

      const overlaps = service.calculateTimeWindowOverlaps(sightings);

      expect(overlaps).toBe(0);
    });
  });

  describe('analyzeDevice', () => {
    it('should return null for device with insufficient sightings', async () => {
      const device: Device = {
        id: 'device-1',
        macAddress: '00:11:22:33:44:55',
        firstSeen: new Date(),
        lastSeen: new Date(),
      };

      mockPrisma.sighting.findMany.mockResolvedValue([
        createMockSighting('device-1', new Date()),
        createMockSighting('device-1', new Date()),
      ]);

      const result = await service.analyzeDevice(device);

      expect(result).toBeNull();
    });

    it('should analyze device with sufficient sightings', async () => {
      const device: Device = {
        id: 'device-1',
        macAddress: '00:11:22:33:44:55',
        firstSeen: new Date(),
        lastSeen: new Date(),
      };

      const sightings = [
        createMockSightingWithLocation('device-1', 40.7128, -74.0060, new Date('2024-01-01T10:00:00')),
        createMockSightingWithLocation('device-1', 40.7129, -74.0061, new Date('2024-01-01T11:00:00')),
        createMockSightingWithLocation('device-1', 40.7528, -74.0460, new Date('2024-01-01T12:00:00')),
        createMockSightingWithLocation('device-1', 40.7529, -74.0461, new Date('2024-01-01T13:00:00')),
      ];

      mockPrisma.sighting.findMany.mockResolvedValue(sightings);

      const result = await service.analyzeDevice(device);

      expect(result).not.toBeNull();
      expect(result?.deviceId).toBe('device-1');
      expect(result?.persistenceScore).toBeGreaterThanOrEqual(0);
      expect(result?.persistenceScore).toBeLessThanOrEqual(1);
      expect(result?.locationCount).toBe(2);
      expect(result?.totalSightings).toBe(4);
    });
  });

  describe('analyzeAllDevices', () => {
    it('should process devices in batches', async () => {
      const devices = Array.from({ length: 250 }, (_, i) => ({
        id: `device-${i}`,
        macAddress: `00:11:22:33:44:${i.toString().padStart(2, '0')}`,
        firstSeen: new Date(),
        lastSeen: new Date(),
      }));

      mockPrisma.device.count.mockResolvedValue(250);
      mockPrisma.device.findMany
        .mockResolvedValueOnce(devices.slice(0, 100))
        .mockResolvedValueOnce(devices.slice(100, 200))
        .mockResolvedValueOnce(devices.slice(200, 250));

      mockPrisma.sighting.findMany.mockResolvedValue([]);
      mockPrisma.analysisResult.createMany.mockResolvedValue({ count: 0 });

      const result = await service.analyzeAllDevices();

      expect(result.processedCount).toBe(250);
      expect(mockPrisma.device.findMany).toHaveBeenCalledTimes(3);
      expect(result.errors).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.device.count.mockResolvedValue(100);
      mockPrisma.device.findMany.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.analyzeAllDevices();

      expect(result.errors).toBe(1);
      expect(result.processedCount).toBe(0);
    });
  });

  describe('identifyMultiLocationDevices', () => {
    it('should identify devices appearing at multiple locations', async () => {
      const devices = [
        {
          id: 'device-1',
          macAddress: '00:11:22:33:44:55',
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const sightings = [
        createMockSightingWithLocation('device-1', 40.7128, -74.0060, new Date('2024-01-01T10:00:00')),
        createMockSightingWithLocation('device-1', 40.7128, -74.0060, new Date('2024-01-01T11:00:00')),
        createMockSightingWithLocation('device-1', 40.7528, -74.0460, new Date('2024-01-01T12:00:00')),
      ];

      mockPrisma.device.findMany.mockResolvedValue(devices);
      mockPrisma.sighting.findMany.mockResolvedValue(sightings);

      const result = await service.identifyMultiLocationDevices();

      expect(result).toContain('device-1');
    });

    it('should not include devices at single location', async () => {
      const devices = [
        {
          id: 'device-1',
          macAddress: '00:11:22:33:44:55',
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ];

      const sightings = [
        createMockSightingWithLocation('device-1', 40.7128, -74.0060),
        createMockSightingWithLocation('device-1', 40.7128, -74.0060),
        createMockSightingWithLocation('device-1', 40.7128, -74.0060),
      ];

      mockPrisma.device.findMany.mockResolvedValue(devices);
      mockPrisma.sighting.findMany.mockResolvedValue(sightings);

      const result = await service.identifyMultiLocationDevices();

      expect(result).toHaveLength(0);
    });
  });
});

// Helper functions
function createMockSighting(deviceId: string, timestamp: Date = new Date()): Sighting {
  return {
    id: `sighting-${Math.random()}`,
    deviceId,
    timestamp,
    latitude: 40.7128,
    longitude: -74.0060,
    signalStrength: -50,
  };
}

function createMockSightingWithLocation(
  deviceId: string,
  latitude: number,
  longitude: number,
  timestamp: Date = new Date()
): Sighting {
  return {
    id: `sighting-${Math.random()}`,
    deviceId,
    timestamp,
    latitude,
    longitude,
    signalStrength: -50,
  };
}