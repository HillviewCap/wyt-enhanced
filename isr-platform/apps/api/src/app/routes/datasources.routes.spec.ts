import request from 'supertest';
import express from 'express';
import router from './datasources.routes';
import { prisma, analysisResultRepository } from '../data-access';

// Mock the data-access module
jest.mock('../data-access', () => ({
  prisma: {
    sighting: {
      findMany: jest.fn(),
    },
  },
  analysisResultRepository: {
    findWithDevices: jest.fn(),
  },
}));

// Mock the services
jest.mock('../services/kismet-ingestion.service');
jest.mock('../services/persistence-analysis.service');

describe('Datasources Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', router);
  });

  describe('GET /api/analysis/results', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Suppress console output during tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully retrieve analysis results without filters', async () => {
      const mockAnalysisResults = [
        {
          id: 'analysis-1',
          deviceId: 'device-1',
          persistenceScore: 0.85,
          analysisTimestamp: new Date('2025-08-30T15:00:00Z'),
          locationCount: 3,
          timeWindowHours: 24,
          device: {
            id: 'device-1',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            firstSeen: new Date('2025-08-30T10:00:00Z'),
            lastSeen: new Date('2025-08-30T14:30:00Z'),
          },
        },
      ];

      const mockSightings = [
        {
          id: 'sighting-1',
          deviceId: 'device-1',
          timestamp: new Date('2025-08-30T10:00:00Z'),
          latitude: 40.7128,
          longitude: -74.0060,
          signalStrength: -65,
        },
        {
          id: 'sighting-2',
          deviceId: 'device-1',
          timestamp: new Date('2025-08-30T12:00:00Z'),
          latitude: 40.7130,
          longitude: -74.0062,
          signalStrength: -70,
        },
      ];

      (analysisResultRepository.findWithDevices as jest.Mock).mockResolvedValue(mockAnalysisResults);
      (prisma.sighting.findMany as jest.Mock).mockResolvedValue(mockSightings);

      const response = await request(app)
        .get('/api/analysis/results')
        .expect(200);

      expect(analysisResultRepository.findWithDevices).toHaveBeenCalledWith(undefined);
      expect(prisma.sighting.findMany).toHaveBeenCalledWith({
        where: { deviceId: 'device-1' },
        orderBy: { timestamp: 'asc' },
      });
      
      expect(response.body).toEqual([
        {
          deviceId: 'device-1',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          persistenceScore: 0.85,
          firstSeen: '2025-08-30T10:00:00.000Z',
          lastSeen: '2025-08-30T14:30:00.000Z',
          locationCount: 3,
          timeWindowHours: 24,
          analysisTimestamp: '2025-08-30T15:00:00.000Z',
          sightings: [
            {
              latitude: 40.7128,
              longitude: -74.0060,
              timestamp: '2025-08-30T10:00:00.000Z',
              signalStrength: -65,
            },
            {
              latitude: 40.7130,
              longitude: -74.0062,
              timestamp: '2025-08-30T12:00:00.000Z',
              signalStrength: -70,
            },
          ],
        },
      ]);
    });

    it('should filter results by min_persistence_score', async () => {
      const mockAnalysisResults = [
        {
          id: 'analysis-1',
          deviceId: 'device-1',
          persistenceScore: 0.85,
          analysisTimestamp: new Date('2025-08-30T15:00:00Z'),
          locationCount: 3,
          timeWindowHours: 24,
          device: {
            id: 'device-1',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            firstSeen: new Date('2025-08-30T10:00:00Z'),
            lastSeen: new Date('2025-08-30T14:30:00Z'),
          },
        },
      ];

      (analysisResultRepository.findWithDevices as jest.Mock).mockResolvedValue(mockAnalysisResults);
      (prisma.sighting.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analysis/results')
        .query({ min_persistence_score: '0.7' })
        .expect(200);

      expect(analysisResultRepository.findWithDevices).toHaveBeenCalledWith(0.7);
      expect(response.body).toHaveLength(1);
    });

    it('should return 400 for invalid min_persistence_score (negative)', async () => {
      const response = await request(app)
        .get('/api/analysis/results')
        .query({ min_persistence_score: '-0.5' })
        .expect(400);

      expect(analysisResultRepository.findWithDevices).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        error: 'Invalid min_persistence_score. Must be a number between 0.0 and 1.0',
      });
    });

    it('should return 400 for invalid min_persistence_score (greater than 1)', async () => {
      const response = await request(app)
        .get('/api/analysis/results')
        .query({ min_persistence_score: '1.5' })
        .expect(400);

      expect(analysisResultRepository.findWithDevices).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        error: 'Invalid min_persistence_score. Must be a number between 0.0 and 1.0',
      });
    });

    it('should return 400 for non-numeric min_persistence_score', async () => {
      const response = await request(app)
        .get('/api/analysis/results')
        .query({ min_persistence_score: 'not-a-number' })
        .expect(400);

      expect(analysisResultRepository.findWithDevices).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        error: 'Invalid min_persistence_score. Must be a number between 0.0 and 1.0',
      });
    });

    it('should handle empty result set', async () => {
      (analysisResultRepository.findWithDevices as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analysis/results')
        .expect(200);

      expect(analysisResultRepository.findWithDevices).toHaveBeenCalledWith(undefined);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      (analysisResultRepository.findWithDevices as jest.Mock).mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/analysis/results')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
      });
    });

    it('should deduplicate sightings by location', async () => {
      const mockAnalysisResults = [
        {
          id: 'analysis-1',
          deviceId: 'device-1',
          persistenceScore: 0.85,
          analysisTimestamp: new Date('2025-08-30T15:00:00Z'),
          locationCount: 2,
          timeWindowHours: 24,
          device: {
            id: 'device-1',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            firstSeen: new Date('2025-08-30T10:00:00Z'),
            lastSeen: new Date('2025-08-30T14:30:00Z'),
          },
        },
      ];

      const mockSightings = [
        {
          id: 'sighting-1',
          deviceId: 'device-1',
          timestamp: new Date('2025-08-30T10:00:00Z'),
          latitude: 40.7128,
          longitude: -74.0060,
          signalStrength: -65,
        },
        {
          id: 'sighting-2',
          deviceId: 'device-1',
          timestamp: new Date('2025-08-30T11:00:00Z'),
          latitude: 40.7128,
          longitude: -74.0060,
          signalStrength: -68,
        },
        {
          id: 'sighting-3',
          deviceId: 'device-1',
          timestamp: new Date('2025-08-30T12:00:00Z'),
          latitude: 40.7130,
          longitude: -74.0062,
          signalStrength: -70,
        },
      ];

      (analysisResultRepository.findWithDevices as jest.Mock).mockResolvedValue(mockAnalysisResults);
      (prisma.sighting.findMany as jest.Mock).mockResolvedValue(mockSightings);

      const response = await request(app)
        .get('/api/analysis/results')
        .expect(200);

      expect(response.body[0].sightings).toHaveLength(2); // Only 2 unique locations
      expect(response.body[0].sightings[0].latitude).toBe(40.7128);
      expect(response.body[0].sightings[1].latitude).toBe(40.7130);
    });
  });
});