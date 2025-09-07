import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface SuspiciousDevice {
  id: string;
  macAddress: string;
  persistenceScore: number;
  totalAppearances: number;
  locationCount: number;
  firstSeen: Date;
  lastSeen: Date;
  reasons: string[];
  locations: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
    signalStrength?: number;
  }>;
  stalking_score?: number;
  stalking_reasons?: string[];
}

export interface SurveillanceAnalysisResult {
  totalDevices: number;
  suspiciousDevices: number;
  highThreatDevices: number;
  multiLocationDevices: number;
  locationSessions: number;
  suspiciousDeviceList: SuspiciousDevice[];
  analysisTimestamp: Date;
  timeWindowHours: number;
}

export class SurveillanceAnalysisService {
  constructor(private readonly prisma: PrismaClient) {}

  async analyzeSurveillancePatterns(
    timeWindowHours: number = 24,
    minPersistenceScore: number = 0.5
  ): Promise<SurveillanceAnalysisResult> {
    const analysisTimestamp = new Date();
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    console.log(`🔍 Starting surveillance analysis for last ${timeWindowHours} hours...`);

    // Get all devices with sightings in the time window using raw query to handle macaddr field
    const devicesWithSightings = await this.prisma.$queryRaw`
      SELECT 
        d.id, 
        d.key, 
        d.macaddr::text as macaddr,
        d.type, 
        d.manuf,
        d.first_time as "firstSeen",
        d.last_time as "lastSeen",
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', s.id,
              'timestamp', s.timestamp,
              'latitude', s.latitude,
              'longitude', s.longitude,
              'signalStrength', s.signal_strength
            )
            ORDER BY s.timestamp ASC
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'::json
        ) as sightings
      FROM devices d
      LEFT JOIN sightings s ON d.id = s.device_id 
        AND s.timestamp >= ${timeWindowStart}
      WHERE EXISTS (
        SELECT 1 FROM sightings s2 
        WHERE s2.device_id = d.id 
        AND s2.timestamp >= ${timeWindowStart}
      )
      GROUP BY d.id, d.key, d.macaddr, d.type, d.manuf, d.first_time, d.last_time
    ` as any[];

    console.log(`📊 Found ${devicesWithSightings.length} devices with activity in time window`);

    const suspiciousDevices: SuspiciousDevice[] = [];

    for (const device of devicesWithSightings) {
      const suspiciousDevice = await this.analyzeDeviceForSurveillance(device, timeWindowHours);
      
      if (suspiciousDevice.persistenceScore >= minPersistenceScore) {
        suspiciousDevices.push(suspiciousDevice);
        
        // Store analysis result in database
        try {
          await this.prisma.analysisResult.create({
            data: {
              deviceId: device.id,
              persistenceScore: new Decimal(suspiciousDevice.persistenceScore),
              analysisTimestamp,
              locationCount: suspiciousDevice.locationCount,
              timeWindowHours
            }
          });
        } catch (error) {
          // If duplicate, update the most recent result for this device
          const existingResult = await this.prisma.analysisResult.findFirst({
            where: { deviceId: device.id },
            orderBy: { analysisTimestamp: 'desc' }
          });
          
          if (existingResult) {
            await this.prisma.analysisResult.update({
              where: { id: existingResult.id },
              data: {
                persistenceScore: new Decimal(suspiciousDevice.persistenceScore),
                analysisTimestamp,
                locationCount: suspiciousDevice.locationCount,
                timeWindowHours
              }
            });
          }
        }
      }
    }

    // Sort by persistence score
    suspiciousDevices.sort((a, b) => b.persistenceScore - a.persistenceScore);

    const highThreatDevices = suspiciousDevices.filter(d => d.persistenceScore >= 0.8).length;
    const multiLocationDevices = suspiciousDevices.filter(d => d.locationCount >= 3).length;

    // Count location sessions (drive sessions + snapshots)
    const [driveSessions, snapshots] = await Promise.all([
      this.prisma.driveSession.count({
        where: {
          startTime: {
            gte: timeWindowStart
          }
        }
      }),
      this.prisma.snapshot.count({
        where: {
          ts: {
            gte: timeWindowStart
          }
        }
      })
    ]);

    const locationSessions = driveSessions + snapshots;

    return {
      totalDevices: devicesWithSightings.length,
      suspiciousDevices: suspiciousDevices.length,
      highThreatDevices,
      multiLocationDevices,
      locationSessions,
      suspiciousDeviceList: suspiciousDevices,
      analysisTimestamp,
      timeWindowHours
    };
  }

  async analyzeDeviceForSurveillance(
    deviceWithSightings: any,
    timeWindowHours: number
  ): Promise<SuspiciousDevice> {
    const device = deviceWithSightings;
    const sightings = Array.isArray(device.sightings) ? device.sightings : JSON.parse(device.sightings || '[]');
    
    const locations = sightings.map((sighting: any) => ({
      latitude: Number(sighting.latitude),
      longitude: Number(sighting.longitude),
      timestamp: new Date(sighting.timestamp),
      signalStrength: sighting.signalStrength
    }));

    // Calculate unique locations (cluster nearby points)
    const uniqueLocations = this.clusterLocations(locations, 50); // 50 meter threshold
    
    const totalAppearances = sightings.length;
    const locationCount = uniqueLocations.length;
    const timeSpan = sightings.length > 0 ? 
      (new Date(sightings[sightings.length - 1].timestamp).getTime() - new Date(sightings[0].timestamp).getTime()) / (1000 * 60 * 60) : 0;

    // Calculate persistence score based on CYT methodology
    let persistenceScore = 0;
    const reasons: string[] = [];

    // Base score from appearance frequency
    if (totalAppearances >= 10) {
      persistenceScore += 0.3;
      reasons.push(`High frequency: ${totalAppearances} appearances`);
    } else if (totalAppearances >= 5) {
      persistenceScore += 0.2;
      reasons.push(`Moderate frequency: ${totalAppearances} appearances`);
    }

    // Score from location diversity
    if (locationCount >= 5) {
      persistenceScore += 0.4;
      reasons.push(`Follows across ${locationCount} distinct locations`);
    } else if (locationCount >= 3) {
      persistenceScore += 0.3;
      reasons.push(`Seen at ${locationCount} different locations`);
    }

    // Score from time persistence
    if (timeSpan >= 12) {
      persistenceScore += 0.3;
      reasons.push(`Persistent over ${timeSpan.toFixed(1)} hours`);
    } else if (timeSpan >= 4) {
      persistenceScore += 0.2;
      reasons.push(`Active for ${timeSpan.toFixed(1)} hours`);
    }

    // Additional suspicious patterns
    const avgTimeBetweenSightings = timeSpan / Math.max(totalAppearances - 1, 1);
    if (avgTimeBetweenSightings > 0 && avgTimeBetweenSightings < 2) {
      persistenceScore += 0.2;
      reasons.push('Very frequent sightings (< 2h intervals)');
    }

    // Device type considerations
    if (device.type && (device.type.includes('mobile') || device.type.includes('phone'))) {
      persistenceScore += 0.1;
      reasons.push('Mobile device pattern');
    }

    // Cap at 1.0
    persistenceScore = Math.min(persistenceScore, 1.0);

    return {
      id: device.id,
      macAddress: device.macaddr || 'Unknown',
      persistenceScore: Number(persistenceScore.toFixed(3)),
      totalAppearances,
      locationCount,
      firstSeen: device.firstSeen ? new Date(device.firstSeen) : (sightings[0] ? new Date(sightings[0].timestamp) : new Date()),
      lastSeen: device.lastSeen ? new Date(device.lastSeen) : (sightings[sightings.length - 1] ? new Date(sightings[sightings.length - 1].timestamp) : new Date()),
      reasons,
      locations
    };
  }

  async analyzeForStalking(
    timeWindowHours: number = 24,
    minStalkingScore: number = 0.7
  ): Promise<SuspiciousDevice[]> {
    const surveillanceResult = await this.analyzeSurveillancePatterns(timeWindowHours, 0.5);
    
    const stalkingCandidates: SuspiciousDevice[] = [];

    for (const device of surveillanceResult.suspiciousDeviceList) {
      if (device.persistenceScore >= 0.6) {
        let stalkingScore = 0;
        const stalkingReasons: string[] = [];

        // Stalking-specific indicators
        if (device.locationCount >= 3) {
          stalkingScore += 0.4;
          stalkingReasons.push(`Follows across ${device.locationCount} locations`);
        }

        if (device.totalAppearances >= 15) {
          stalkingScore += 0.3;
          stalkingReasons.push(`Very high frequency (${device.totalAppearances} sightings)`);
        }

        const timeSpanHours = (device.lastSeen.getTime() - device.firstSeen.getTime()) / (1000 * 60 * 60);
        if (timeSpanHours >= 24) {
          stalkingScore += 0.3;
          stalkingReasons.push(`Persistent over ${(timeSpanHours / 24).toFixed(1)} days`);
        }

        // Pattern analysis
        const locationPattern = this.analyzeMovementPattern(device.locations);
        if (locationPattern.followsRoute) {
          stalkingScore += 0.2;
          stalkingReasons.push('Follows consistent route pattern');
        }

        if (stalkingScore >= minStalkingScore) {
          device.stalking_score = Number(stalkingScore.toFixed(3));
          device.stalking_reasons = stalkingReasons;
          stalkingCandidates.push(device);
        }
      }
    }

    return stalkingCandidates.sort((a, b) => (b.stalking_score || 0) - (a.stalking_score || 0));
  }

  private clusterLocations(locations: Array<{latitude: number, longitude: number}>, thresholdMeters: number): Array<{latitude: number, longitude: number}> {
    if (locations.length === 0) return [];

    const clusters: Array<{latitude: number, longitude: number}> = [];
    
    for (const location of locations) {
      let addedToCluster = false;
      
      for (const cluster of clusters) {
        const distance = this.haversineDistance(
          location.latitude, location.longitude,
          cluster.latitude, cluster.longitude
        );
        
        if (distance <= thresholdMeters) {
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push({
          latitude: location.latitude,
          longitude: location.longitude
        });
      }
    }
    
    return clusters;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private analyzeMovementPattern(locations: Array<{latitude: number, longitude: number, timestamp: Date}>) {
    // Simple pattern detection - could be enhanced
    const sortedLocations = [...locations].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (sortedLocations.length < 3) {
      return { followsRoute: false };
    }

    // Check for repeated location sequences
    const locationStrings = sortedLocations.map(loc => `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`);
    const uniqueSequences = new Set(locationStrings);
    
    // If there are repeated patterns, it might indicate following behavior
    const followsRoute = uniqueSequences.size < locationStrings.length * 0.8;
    
    return { followsRoute };
  }

  async generateSurveillanceReport(
    result: SurveillanceAnalysisResult,
    outputFormat: 'markdown' | 'json' = 'markdown'
  ): Promise<string> {
    if (outputFormat === 'json') {
      return JSON.stringify(result, null, 2);
    }

    const timestamp = result.analysisTimestamp.toISOString();
    const report = `# ISR Platform Surveillance Analysis Report

Generated: ${timestamp}
Analysis Window: ${result.timeWindowHours} hours

## Summary
- **Total Devices Analyzed**: ${result.totalDevices.toLocaleString()}
- **Suspicious Devices**: ${result.suspiciousDevices}
- **High Threat Devices**: ${result.highThreatDevices}
- **Multi-Location Devices**: ${result.multiLocationDevices}
- **Location Sessions**: ${result.locationSessions}

## Top Suspicious Devices

${result.suspiciousDeviceList.slice(0, 10).map((device, index) => {
  const deviceReport = `### ${index + 1}. Device ${device.macAddress}
- **Persistence Score**: ${device.persistenceScore}
- **Total Sightings**: ${device.totalAppearances}
- **Locations Visited**: ${device.locationCount}
- **Active Period**: ${device.firstSeen.toISOString()} to ${device.lastSeen.toISOString()}
- **Threat Indicators**:
${device.reasons.map(reason => `  - ${reason}`).join('\n')}`;

  const stalkingSection = device.stalking_score ? `
- **Stalking Score**: ${device.stalking_score}
- **Stalking Indicators**:
${device.stalking_reasons?.map(reason => `  - ${reason}`).join('\n') || ''}` : '';

  return deviceReport + stalkingSection;
}).join('\n\n')}

## Analysis Methodology

This analysis uses persistence scoring based on:
1. **Appearance Frequency** (0.0-0.3): Number of device sightings
2. **Location Diversity** (0.0-0.4): Number of distinct locations visited
3. **Time Persistence** (0.0-0.3): Duration of activity window
4. **Behavioral Patterns** (0.0-0.2): Additional suspicious indicators

**Threat Levels:**
- Low (0.3-0.5): Worth monitoring
- Medium (0.5-0.7): Potentially suspicious
- High (0.7-0.9): Likely surveillance
- Critical (0.9-1.0): Active stalking

---
*Generated by ISR Platform Surveillance Analysis Engine*
`;

    return report;
  }
}