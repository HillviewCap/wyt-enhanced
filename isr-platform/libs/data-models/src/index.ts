export interface HealthStatus {
  status: string;
  timestamp: string;
}

export interface Device {
  id: string;
  macAddress: string;
  firstSeen: Date;
  lastSeen: Date;
}

export interface Sighting {
  id: string;
  deviceId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  signalStrength: number;
}

export interface AnalysisResult {
  id: string;
  deviceId: string;
  persistenceScore: number; // 0.0 to 1.0
  analysisTimestamp: Date;
  locationCount: number;
  timeWindowHours: number;
}