import { PrismaClient } from '@prisma/client';
import { Device, Sighting } from '@wyt-enhanced/data-models';

export interface AnalysisConfig {
  batchSize: number;
  timeWindowHours: number;
  proximityRadiusMeters: number;
  minSightingsThreshold: number;
}

export interface LocationCluster {
  centroidLat: number;
  centroidLon: number;
  sightings: Sighting[];
}

export interface DeviceAnalysis {
  deviceId: string;
  persistenceScore: number;
  locationCount: number;
  timeWindowHours: number;
  totalSightings: number;
}

export class PersistenceAnalysisService {
  private prisma: PrismaClient;
  private config: AnalysisConfig;

  constructor(prisma: PrismaClient, config?: Partial<AnalysisConfig>) {
    this.prisma = prisma;
    this.config = {
      batchSize: config?.batchSize || Number(process.env['ANALYSIS_BATCH_SIZE']) || 100,
      timeWindowHours: config?.timeWindowHours || Number(process.env['ANALYSIS_TIME_WINDOW_HOURS']) || 24,
      proximityRadiusMeters: config?.proximityRadiusMeters || Number(process.env['ANALYSIS_PROXIMITY_RADIUS_METERS']) || 100,
      minSightingsThreshold: config?.minSightingsThreshold || Number(process.env['ANALYSIS_MIN_SIGHTINGS_THRESHOLD']) || 3,
    };
  }

  /**
   * Main analysis method to process all devices
   */
  async analyzeAllDevices(): Promise<{ processedCount: number; duration: number; errors: number }> {
    const startTime = Date.now();
    let processedCount = 0;
    let errors = 0;

    try {
      const totalDevices = await this.prisma.device.count();
      console.log(`[PersistenceAnalysis] Starting analysis of ${totalDevices} devices`);

      // Process devices in batches
      for (let offset = 0; offset < totalDevices; offset += this.config.batchSize) {
        try {
          const devices = await this.prisma.device.findMany({
            skip: offset,
            take: this.config.batchSize,
          });

          await this.processBatch(devices);
          processedCount += devices.length;

          // Log progress every 10%
          const progress = Math.floor((processedCount / totalDevices) * 10) * 10;
          if (progress > 0 && processedCount % Math.floor(totalDevices / 10) < this.config.batchSize) {
            console.log(`[PersistenceAnalysis] Analyzed ${processedCount}/${totalDevices} devices...`);
          }
        } catch (error) {
          console.error('[PersistenceAnalysis] Batch processing error:', error);
          errors++;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[PersistenceAnalysis] Completed analysis: ${processedCount} devices in ${duration}s`);

      return { processedCount, duration, errors };
    } catch (error) {
      console.error('[PersistenceAnalysis] Error during analysis:', error);
      throw error;
    }
  }

  /**
   * Process a batch of devices
   */
  private async processBatch(devices: Device[]): Promise<void> {
    const analysisResults = [];

    for (const device of devices) {
      try {
        const analysis = await this.analyzeDevice(device);
        if (analysis) {
          analysisResults.push({
            deviceId: device.id,
            persistenceScore: analysis.persistenceScore,
            analysisTimestamp: new Date(),
            locationCount: analysis.locationCount,
            timeWindowHours: analysis.timeWindowHours,
          });
        }
      } catch (error) {
        console.error(`[PersistenceAnalysis] Error analyzing device ${device.id}:`, error);
      }
    }

    // Batch insert analysis results
    if (analysisResults.length > 0) {
      await this.prisma.analysisResult.createMany({
        data: analysisResults,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Analyze a single device
   */
  async analyzeDevice(device: Device): Promise<DeviceAnalysis | null> {
    const sightings = await this.prisma.sighting.findMany({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'asc' },
    });

    if (sightings.length < this.config.minSightingsThreshold) {
      return null;
    }

    // Cluster sightings by location
    const locationClusters = this.clusterSightingsByLocation(sightings);
    
    // Calculate time-based metrics
    const timeMetrics = this.calculateTimeMetrics(sightings);
    
    // Calculate persistence score
    const persistenceScore = this.calculatePersistenceScore(
      locationClusters,
      timeMetrics,
      sightings
    );

    return {
      deviceId: device.id,
      persistenceScore,
      locationCount: locationClusters.length,
      timeWindowHours: this.config.timeWindowHours,
      totalSightings: sightings.length,
    };
  }

  /**
   * Calculate persistence score based on various factors
   */
  calculatePersistenceScore(
    locationClusters: LocationCluster[],
    timeMetrics: { timeSpanHours: number; avgIntervalHours: number; regularityScore: number },
    sightings: Sighting[]
  ): number {
    // Base factors
    const locationFactor = Math.min(locationClusters.length / 5, 1); // Max out at 5 locations
    const frequencyFactor = Math.min(sightings.length / 20, 1); // Max out at 20 sightings
    const timeFactor = Math.min(timeMetrics.timeSpanHours / (this.config.timeWindowHours * 3), 1);
    const regularityFactor = timeMetrics.regularityScore;

    // Weight the factors
    const weights = {
      location: 0.3,
      frequency: 0.25,
      time: 0.25,
      regularity: 0.2,
    };

    const score = 
      locationFactor * weights.location +
      frequencyFactor * weights.frequency +
      timeFactor * weights.time +
      regularityFactor * weights.regularity;

    return Math.min(Math.max(score, 0), 1); // Ensure between 0 and 1
  }

  /**
   * Calculate time-based metrics for sightings
   */
  calculateTimeMetrics(sightings: Sighting[]): {
    timeSpanHours: number;
    avgIntervalHours: number;
    regularityScore: number;
  } {
    if (sightings.length < 2) {
      return { timeSpanHours: 0, avgIntervalHours: 0, regularityScore: 0 };
    }

    const timestamps = sightings.map(s => s.timestamp.getTime());
    const timeSpanMs = Math.max(...timestamps) - Math.min(...timestamps);
    const timeSpanHours = timeSpanMs / (1000 * 60 * 60);

    // Calculate intervals between consecutive sightings
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60));
    }

    const avgIntervalHours = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Calculate regularity (lower variance = higher regularity)
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgIntervalHours, 2);
    }, 0) / intervals.length;
    
    const regularityScore = 1 / (1 + variance / (avgIntervalHours * avgIntervalHours));

    return { timeSpanHours, avgIntervalHours, regularityScore };
  }

  /**
   * Cluster sightings by location using haversine distance
   */
  clusterSightingsByLocation(sightings: Sighting[]): LocationCluster[] {
    const clusters: LocationCluster[] = [];

    for (const sighting of sightings) {
      let addedToCluster = false;

      for (const cluster of clusters) {
        const distance = this.haversineDistance(
          cluster.centroidLat,
          cluster.centroidLon,
          sighting.latitude,
          sighting.longitude
        );

        if (distance <= this.config.proximityRadiusMeters) {
          // Add to existing cluster and update centroid
          cluster.sightings.push(sighting);
          this.updateClusterCentroid(cluster);
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        // Create new cluster
        clusters.push({
          centroidLat: sighting.latitude,
          centroidLon: sighting.longitude,
          sightings: [sighting],
        });
      }
    }

    return clusters;
  }

  /**
   * Update cluster centroid based on all sightings
   */
  private updateClusterCentroid(cluster: LocationCluster): void {
    const avgLat = cluster.sightings.reduce((sum, s) => sum + s.latitude, 0) / cluster.sightings.length;
    const avgLon = cluster.sightings.reduce((sum, s) => sum + s.longitude, 0) / cluster.sightings.length;
    cluster.centroidLat = avgLat;
    cluster.centroidLon = avgLon;
  }

  /**
   * Calculate haversine distance between two GPS coordinates
   */
  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  /**
   * Calculate time window overlaps for a device's sightings
   */
  calculateTimeWindowOverlaps(sightings: Sighting[]): number {
    let overlaps = 0;
    const windowMs = this.config.timeWindowHours * 60 * 60 * 1000;

    for (let i = 0; i < sightings.length; i++) {
      for (let j = i + 1; j < sightings.length; j++) {
        const timeDiff = Math.abs(
          sightings[j].timestamp.getTime() - sightings[i].timestamp.getTime()
        );
        if (timeDiff <= windowMs) {
          overlaps++;
        }
      }
    }

    return overlaps;
  }

  /**
   * Identify devices appearing at multiple locations within time windows
   */
  async identifyMultiLocationDevices(): Promise<string[]> {
    const devices = await this.prisma.device.findMany();
    const multiLocationDevices: string[] = [];

    for (const device of devices) {
      const sightings = await this.prisma.sighting.findMany({
        where: { deviceId: device.id },
        orderBy: { timestamp: 'asc' },
      });

      const clusters = this.clusterSightingsByLocation(sightings);
      if (clusters.length > 1) {
        // Check if sightings at different locations occur within time window
        const windowMs = this.config.timeWindowHours * 60 * 60 * 1000;
        let hasTimeOverlap = false;

        for (let i = 0; i < clusters.length - 1; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const cluster1Times = clusters[i].sightings.map(s => s.timestamp.getTime());
            const cluster2Times = clusters[j].sightings.map(s => s.timestamp.getTime());

            for (const t1 of cluster1Times) {
              for (const t2 of cluster2Times) {
                if (Math.abs(t2 - t1) <= windowMs) {
                  hasTimeOverlap = true;
                  break;
                }
              }
              if (hasTimeOverlap) break;
            }
            if (hasTimeOverlap) break;
          }
          if (hasTimeOverlap) break;
        }

        if (hasTimeOverlap) {
          multiLocationDevices.push(device.id);
        }
      }
    }

    return multiLocationDevices;
  }
}