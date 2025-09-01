import { ApiService, AnalysisResult, DataSource, CreateDataSourceRequest } from './ApiService';

describe('ApiService', () => {
  const mockFetch = jest.fn();
  
  beforeAll(() => {
    global.fetch = mockFetch as any;
    // Mock getBaseUrl to return consistent value for tests
    jest.spyOn(ApiService as any, 'getBaseUrl').mockReturnValue('/api');
    // Reset the baseUrl with mocked value
    (ApiService as any).baseUrl = '/api';
  });

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterAll(() => {
    (global.fetch as any) = undefined;
    jest.restoreAllMocks();
  });

  describe('fetchAnalysisResults', () => {
    const mockAnalysisResults: AnalysisResult[] = [
      {
        deviceId: '123e4567-e89b-12d3-a456-426614174000',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        persistenceScore: 0.75,
        firstSeen: '2024-01-15T10:00:00Z',
        lastSeen: '2024-01-15T14:00:00Z',
        locationCount: 5,
        timeWindowHours: 4,
        analysisTimestamp: '2024-01-15T14:30:00Z',
        sightings: [
          {
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: '2024-01-15T10:00:00Z',
            signalStrength: -65
          },
          {
            latitude: 40.7130,
            longitude: -74.0062,
            timestamp: '2024-01-15T14:00:00Z',
            signalStrength: -70
          }
        ]
      },
      {
        deviceId: '987f6543-b21a-34c5-d678-123456789abc',
        macAddress: '11:22:33:44:55:66',
        persistenceScore: 0.25,
        firstSeen: '2024-01-15T09:00:00Z',
        lastSeen: '2024-01-15T09:15:00Z',
        locationCount: 2,
        timeWindowHours: 0.25,
        analysisTimestamp: '2024-01-15T14:30:00Z',
        sightings: [
          {
            latitude: 40.7580,
            longitude: -73.9855,
            timestamp: '2024-01-15T09:00:00Z',
            signalStrength: -80
          }
        ]
      }
    ];

    it('should fetch analysis results successfully without filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResults,
      });

      const results = await ApiService.fetchAnalysisResults();

      expect(mockFetch).toHaveBeenCalledWith('/api/analysis/results', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(results).toEqual(mockAnalysisResults);
    });

    it('should fetch analysis results with minimum persistence score filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockAnalysisResults[0]],
      });

      const results = await ApiService.fetchAnalysisResults(0.5);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analysis/results?min_persistence_score=0.5',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(results).toEqual([mockAnalysisResults[0]]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(ApiService.fetchAnalysisResults()).rejects.toThrow('Network error');
    });

    it('should handle API error responses with JSON body', async () => {
      const errorMessage = 'Invalid persistence score value';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: errorMessage }),
      });

      await expect(ApiService.fetchAnalysisResults(1.5)).rejects.toThrow(errorMessage);
    });

    it('should handle API error responses with plain text body', async () => {
      const errorText = 'Bad Request';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => errorText,
      });

      await expect(ApiService.fetchAnalysisResults()).rejects.toThrow(
        'API request failed with status 400: Bad Request'
      );
    });

    it('should handle API error responses with no body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      });

      await expect(ApiService.fetchAnalysisResults()).rejects.toThrow(
        'API request failed with status 500'
      );
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce('Not an Error object');

      await expect(ApiService.fetchAnalysisResults()).rejects.toThrow(
        'An unexpected error occurred while fetching analysis results'
      );
    });

    it('should return empty array when API returns empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const results = await ApiService.fetchAnalysisResults();

      expect(results).toEqual([]);
    });
  });

  describe('fetchDataSources', () => {
    const mockDataSources: DataSource[] = [
      {
        id: '1',
        name: 'Test Source 1',
        path: '/path/to/kismet1.db',
        status: 'active',
        lastIngested: '2025-01-15T10:00:00Z',
        createdAt: '2025-01-10T10:00:00Z',
      },
      {
        id: '2',
        name: 'Test Source 2',
        path: '/path/to/kismet2.db',
        status: 'inactive',
        createdAt: '2025-01-12T10:00:00Z',
      },
    ];

    it('should fetch data sources successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataSources,
      });

      const results = await ApiService.fetchDataSources();

      expect(mockFetch).toHaveBeenCalledWith('/api/datasources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(results).toEqual(mockDataSources);
    });

    it('should handle fetch data sources errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(ApiService.fetchDataSources()).rejects.toThrow(
        'Failed to fetch data sources: 404: Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(ApiService.fetchDataSources()).rejects.toThrow('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      await expect(ApiService.fetchDataSources()).rejects.toThrow(
        'An unexpected error occurred while fetching data sources'
      );
    });
  });

  describe('createDataSource', () => {
    it('should create data source successfully', async () => {
      const request: CreateDataSourceRequest = {
        name: 'New Source',
        path: '/path/to/new.db',
      };

      const mockResponse: DataSource = {
        id: '123',
        name: 'New Source',
        path: '/path/to/new.db',
        status: 'active',
        createdAt: '2025-01-20T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await ApiService.createDataSource(request);

      expect(mockFetch).toHaveBeenCalledWith('/api/datasources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle create data source validation errors', async () => {
      const request: CreateDataSourceRequest = {
        name: '',
        path: 'invalid',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid request' }),
      });

      await expect(ApiService.createDataSource(request)).rejects.toThrow('Invalid request');
    });

    it('should handle server errors', async () => {
      const request: CreateDataSourceRequest = {
        name: 'Test',
        path: '/test.db',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      });

      await expect(ApiService.createDataSource(request)).rejects.toThrow(
        'Failed to create data source: 500: Server Error'
      );
    });
  });

  describe('triggerIngestion', () => {
    it('should trigger ingestion successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      await ApiService.triggerIngestion('123');

      expect(mockFetch).toHaveBeenCalledWith('/api/datasources/123/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Data source not found' }),
      });

      await expect(ApiService.triggerIngestion('999')).rejects.toThrow('Data source not found');
    });

    it('should handle server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(ApiService.triggerIngestion('123')).rejects.toThrow(
        'Failed to trigger ingestion: 500: Internal Server Error'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(ApiService.triggerIngestion('123')).rejects.toThrow('Connection refused');
    });
  });
});