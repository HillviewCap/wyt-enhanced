export interface HealthStatus {
  status: string;
  timestamp: string;
}

export interface Device {
  id: string;
  macAddress: string | null;
  firstSeen: Date | null;
  lastSeen: Date | null;
}

export interface Sighting {
  id: string;
  deviceId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  signalStrength: number | null;
}

export interface AnalysisResult {
  id: string;
  deviceId: string;
  persistenceScore: number; // 0.0 to 1.0
  analysisTimestamp: Date;
  locationCount: number;
  timeWindowHours: number;
}