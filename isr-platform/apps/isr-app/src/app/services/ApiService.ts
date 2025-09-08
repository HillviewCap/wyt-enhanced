export interface DeviceSighting {
  latitude: number;
  longitude: number;
  timestamp: string;
  signalStrength: number;
}

export interface AnalysisResult {
  deviceId: string;
  macAddress: string;
  persistenceScore: number;
  firstSeen: string;
  lastSeen: string;
  locationCount: number;
  timeWindowHours: number;
  analysisTimestamp: string;
  sightings: DeviceSighting[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface DataSource {
  id: string;
  name: string;
  path: string;
  status: 'active' | 'inactive' | 'ingesting';
  lastIngested?: string;
  createdAt: string;
}

export interface CreateDataSourceRequest {
  name: string;
  path: string;
  type?: string;
}

export interface KismetFile {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  modifiedAt: string;
  createdAt: string;
}

export interface ProbeRequest {
  id: string;
  timestamp: string;
  clientMac: string;
  ssid: string | null;
  signalStrength: number | null;
  channel: string | null;
  latitude: number | null;
  longitude: number | null;
  vendor: string | null;
  isBroadcast: boolean;
  dot11Info: unknown;
}

export interface ProbeClient {
  clientMac: string;
  probeCount: number;
  uniqueSSIDs: number;
  vendor: string;
  firstSeen: string;
  lastSeen: string;
  ssidsProbed: string[];
  broadcastProbes: number;
}

export interface ProbedNetwork {
  ssid: string;
  probeCount: number;
  uniqueClients: number;
  firstProbed: string;
  lastProbed: string;
  isInDatabase: boolean;
  networkBSSID: string | null;
  networkSecurity: string | null;
  isUnknown: boolean;
}

export interface ProbeFilters {
  hoursBack: number;
  minProbes: number;
  vendor: string;
  unknownOnly: boolean;
  limit?: number;
  offset?: number;
}

export interface AvailableFilesResponse {
  directory: string;
  files: KismetFile[];
}

export class ApiService {
  private static getBaseUrl(): string {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api' 
      : '/api';
  }

  private static baseUrl = ApiService.getBaseUrl();

  static async fetchAnalysisResults(minPersistenceScore?: number): Promise<AnalysisResult[]> {
    try {
      let url = `${this.baseUrl}/analysis/results`;
      
      if (minPersistenceScore !== undefined) {
        const params = new URLSearchParams({
          min_persistence_score: minPersistenceScore.toString()
        });
        url = `${url}?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API request failed with status ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorBody) {
            errorMessage = `${errorMessage}: ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: AnalysisResult[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching analysis results');
    }
  }

  static async fetchAvailableKismetFiles(): Promise<AvailableFilesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/datasources/available-files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Failed to fetch available files: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorBody) {
            errorMessage = `${errorMessage}: ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: AvailableFilesResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching available files');
    }
  }

  static async fetchDataSources(): Promise<DataSource[]> {
    try {
      const response = await fetch(`${this.baseUrl}/datasources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Failed to fetch data sources: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorBody) {
            errorMessage = `${errorMessage}: ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: DataSource[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching data sources');
    }
  }

  static async createDataSource(request: CreateDataSourceRequest): Promise<DataSource> {
    try {
      const response = await fetch(`${this.baseUrl}/datasources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          type: request.type || 'kismet'
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Failed to create data source: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorBody) {
            errorMessage = `${errorMessage}: ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: DataSource = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while creating data source');
    }
  }

  static async triggerIngestion(dataSourceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/datasources/${dataSourceId}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Failed to trigger ingestion: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorBody) {
            errorMessage = `${errorMessage}: ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      // 202 Accepted response, no body expected
      return;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while triggering ingestion');
    }
  }

  // WiFi Probe Request Methods
  static async fetchProbeRequests(filters: Partial<ProbeFilters> = {}): Promise<{
    probes: ProbeRequest[];
    total: number;
    filters: any;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.hoursBack) params.append('hours_back', filters.hoursBack.toString());
      if (filters.vendor) params.append('vendor', filters.vendor);

      const response = await fetch(`${this.baseUrl}/wifi/probes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch probe requests: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching probe requests');
    }
  }

  static async fetchProbeClients(filters: Partial<ProbeFilters> = {}): Promise<{
    clients: ProbeClient[];
    total: number;
    filters: any;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.hoursBack) params.append('hours_back', filters.hoursBack.toString());
      if (filters.minProbes) params.append('min_probes', filters.minProbes.toString());
      if (filters.vendor) params.append('vendor', filters.vendor);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${this.baseUrl}/wifi/probes/clients?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch probe clients: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching probe clients');
    }
  }

  static async fetchProbedNetworks(filters: Partial<ProbeFilters> = {}): Promise<{
    networks: ProbedNetwork[];
    total: number;
    filters: any;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.hoursBack) params.append('hours_back', filters.hoursBack.toString());
      if (filters.unknownOnly !== undefined) params.append('unknown_only', filters.unknownOnly.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      params.append('include_wigle', 'true');

      const response = await fetch(`${this.baseUrl}/wifi/probes/networks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch probed networks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching probed networks');
    }
  }

  // Wigle Integration Methods
  static async searchWigleNetworks(lat: number, lng: number, radius: number = 0.01): Promise<any> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString()
      });

      const response = await fetch(`${this.baseUrl}/intelligence/wigle/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search Wigle networks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while searching Wigle networks');
    }
  }

  static async enrichNetworksWithWigle(boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Promise<{ enriched: number; errors: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/intelligence/wigle/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boundingBox }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to enrich networks with Wigle: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while enriching networks with Wigle');
    }
  }

  static async getWigleStats(): Promise<{
    requestsToday: number;
    maxRequestsPerDay: number;
    cacheHits: number;
    apiCallsRemaining: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/intelligence/wigle/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to get Wigle stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching Wigle stats');
    }
  }

  static async lookupSSIDInWigle(ssid: string): Promise<{
    success: boolean;
    ssid: string;
    totalResults: number;
    results: any[];
    cached: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/wifi/wigle/lookup-ssid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ssid }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to lookup SSID in Wigle: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while looking up SSID in Wigle');
    }
  }
}