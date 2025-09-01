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
}