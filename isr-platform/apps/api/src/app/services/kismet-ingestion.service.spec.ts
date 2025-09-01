import { KismetIngestionService } from './kismet-ingestion.service';
import { deviceRepository, sightingRepository } from '../data-access';

jest.mock('../data-access', () => ({
  deviceRepository: {
    upsert: jest.fn(),
  },
  sightingRepository: {
    createMany: jest.fn(),
  },
}));

describe('KismetIngestionService', () => {
  let service: KismetIngestionService;

  beforeEach(() => {
    service = new KismetIngestionService();
    jest.clearAllMocks();
  });

  describe('transformKismetDevice', () => {
    it('should transform Kismet device data correctly', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: -60,
        avg_lat: 40.7128,
        avg_lon: -74.0060,
      };

      const result = service.transformKismetDevice(kismetDevice);

      expect(result).toEqual({
        macAddress: 'aa:bb:cc:dd:ee:ff',
        firstSeen: new Date(1700000000 * 1000),
        lastSeen: new Date(1700000100 * 1000),
      });
    });

    it('should convert MAC address to lowercase', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: 0,
        avg_lat: 0,
        avg_lon: 0,
      };

      const result = service.transformKismetDevice(kismetDevice);
      expect(result.macAddress).toBe('aa:bb:cc:dd:ee:ff');
    });
  });

  describe('transformKismetSighting', () => {
    it('should transform valid GPS data into sighting', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: -60,
        avg_lat: 40.7128,
        avg_lon: -74.0060,
      };
      const deviceId = 'device-123';

      const result = service.transformKismetSighting(kismetDevice, deviceId);

      expect(result).toEqual({
        deviceId: 'device-123',
        timestamp: new Date(1700000100 * 1000),
        latitude: 40.7128,
        longitude: -74.0060,
        signalStrength: -60,
      });
    });

    it('should return null for invalid GPS coordinates (0,0)', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: -60,
        avg_lat: 0,
        avg_lon: 0,
      };
      const deviceId = 'device-123';

      const result = service.transformKismetSighting(kismetDevice, deviceId);
      expect(result).toBeNull();
    });

    it('should return null for missing GPS coordinates', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: -60,
        avg_lat: null as any,
        avg_lon: null as any,
      };
      const deviceId = 'device-123';

      const result = service.transformKismetSighting(kismetDevice, deviceId);
      expect(result).toBeNull();
    });

    it('should handle missing signal strength', () => {
      const kismetDevice = {
        devmac: 'AA:BB:CC:DD:EE:FF',
        first_time: 1700000000,
        last_time: 1700000100,
        strongest_signal: null as any,
        avg_lat: 40.7128,
        avg_lon: -74.0060,
      };
      const deviceId = 'device-123';

      const result = service.transformKismetSighting(kismetDevice, deviceId);
      expect(result).toEqual({
        deviceId: 'device-123',
        timestamp: new Date(1700000100 * 1000),
        latitude: 40.7128,
        longitude: -74.0060,
        signalStrength: 0,
      });
    });
  });

  describe('validateKismetFile', () => {
    it('should throw error if database connection not established', async () => {
      await expect(service.validateKismetFile()).rejects.toThrow(
        'Database connection not established'
      );
    });
  });

  describe('ingestKismetFile', () => {
    it('should handle invalid file path gracefully', async () => {
      const invalidPath = '/invalid/path/to/file.kismet';
      
      await expect(service.ingestKismetFile(invalidPath)).rejects.toThrow();
    });
  });
});