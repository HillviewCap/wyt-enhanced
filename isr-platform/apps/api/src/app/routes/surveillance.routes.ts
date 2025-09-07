import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SurveillanceAnalysisService } from '../services/surveillance-analysis.service';

const router = Router();
const prisma = new PrismaClient();
const surveillanceService = new SurveillanceAnalysisService(prisma);

/**
 * GET /api/surveillance/analysis
 * Perform surveillance pattern analysis
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const timeWindowHours = parseInt(req.query.timeWindowHours as string) || 24;
    const minPersistenceScore = parseFloat(req.query.minPersistenceScore as string) || 0.5;

    console.log(`🔍 Running surveillance analysis - Window: ${timeWindowHours}h, Min Score: ${minPersistenceScore}`);

    const result = await surveillanceService.analyzeSurveillancePatterns(
      timeWindowHours,
      minPersistenceScore
    );

    res.json({
      success: true,
      data: result,
      message: `Analysis completed for ${result.totalDevices} devices`
    });

  } catch (error) {
    console.error('Surveillance analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform surveillance analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/surveillance/stalking
 * Analyze for stalking-specific patterns
 */
router.get('/stalking', async (req: Request, res: Response) => {
  try {
    const timeWindowHours = parseInt(req.query.timeWindowHours as string) || 24;
    const minStalkingScore = parseFloat(req.query.minStalkingScore as string) || 0.7;

    console.log(`🚨 Running stalking analysis - Window: ${timeWindowHours}h, Min Score: ${minStalkingScore}`);

    const stalkingDevices = await surveillanceService.analyzeForStalking(
      timeWindowHours,
      minStalkingScore
    );

    res.json({
      success: true,
      data: {
        stalkingDevices: stalkingDevices.length,
        deviceList: stalkingDevices,
        analysisTimestamp: new Date(),
        timeWindowHours,
        minStalkingScore
      },
      message: stalkingDevices.length > 0 
        ? `⚠️ ${stalkingDevices.length} devices with stalking patterns detected!`
        : '✅ No stalking patterns detected'
    });

  } catch (error) {
    console.error('Stalking analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform stalking analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/surveillance/report
 * Generate surveillance analysis report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const timeWindowHours = parseInt(req.query.timeWindowHours as string) || 24;
    const minPersistenceScore = parseFloat(req.query.minPersistenceScore as string) || 0.5;
    const format = (req.query.format as string) || 'markdown';

    const analysisResult = await surveillanceService.analyzeSurveillancePatterns(
      timeWindowHours,
      minPersistenceScore
    );

    const report = await surveillanceService.generateSurveillanceReport(
      analysisResult,
      format as 'markdown' | 'json'
    );

    if (format === 'json') {
      res.json({
        success: true,
        data: JSON.parse(report),
        message: 'Analysis report generated'
      });
    } else {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="surveillance_report_${new Date().toISOString().split('T')[0]}.md"`);
      res.send(report);
    }

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate surveillance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/surveillance/devices/:deviceId/analysis
 * Get detailed analysis for a specific device
 */
router.get('/devices/:deviceId/analysis', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const timeWindowHours = parseInt(req.query.timeWindowHours as string) || 24;
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Get device with sightings
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        sightings: {
          where: {
            timestamp: { gte: timeWindowStart }
          },
          orderBy: { timestamp: 'asc' }
        },
        analysisResults: {
          orderBy: { analysisTimestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!device) {
      res.status(404).json({
        success: false,
        error: 'Device not found'
      });
      return;
    }

    // Analyze this specific device
    const analysisResult = await surveillanceService.analyzeDeviceForSurveillance(
      device,
      timeWindowHours
    );

    res.json({
      success: true,
      data: {
        device: {
          id: device.id,
          macAddress: 'Unknown', // macaddr is unsupported field
          type: device.type,
          vendor: device.manuf,
          firstSeen: device.firstTime,
          lastSeen: device.lastTime
        },
        analysis: analysisResult,
        recentSightings: device.sightings.length,
        historicalAnalysis: device.analysisResults[0] || null
      }
    });
    return;

  } catch (error) {
    console.error('Device analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze device',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /api/surveillance/export/kml
 * Export surveillance data as KML for Google Earth visualization
 */
router.get('/export/kml', async (req: Request, res: Response) => {
  try {
    const timeWindowHours = parseInt(req.query.timeWindowHours as string) || 24;
    const minPersistenceScore = parseFloat(req.query.minPersistenceScore as string) || 0.5;

    const analysisResult = await surveillanceService.analyzeSurveillancePatterns(
      timeWindowHours,
      minPersistenceScore
    );

    // Generate KML content
    const kmlContent = generateKMLFromAnalysis(analysisResult);

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="surveillance_analysis_${new Date().toISOString().split('T')[0]}.kml"`);
    res.send(kmlContent);

  } catch (error) {
    console.error('KML export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate KML export',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function generateKMLFromAnalysis(result: any): string {
  const timestamp = result.analysisTimestamp.toISOString();
  
  let placemarks = '';
  
  for (const device of result.suspiciousDeviceList.slice(0, 20)) { // Limit to top 20 for performance
    const color = getThreatColor(device.persistenceScore);
    const description = `
      <![CDATA[
        <b>Device:</b> ${device.macAddress}<br/>
        <b>Persistence Score:</b> ${device.persistenceScore}<br/>
        <b>Total Sightings:</b> ${device.totalAppearances}<br/>
        <b>Locations:</b> ${device.locationCount}<br/>
        <b>First Seen:</b> ${device.firstSeen}<br/>
        <b>Last Seen:</b> ${device.lastSeen}<br/>
        <b>Threat Indicators:</b><br/>
        ${device.reasons.map((reason: string) => `• ${reason}`).join('<br/>')}
      ]]>
    `;

    // Add placemark for each location
    for (const location of device.locations) {
      placemarks += `
        <Placemark>
          <name>Device ${device.macAddress}</name>
          <description>${description}</description>
          <Style>
            <IconStyle>
              <color>${color}</color>
              <scale>1.2</scale>
              <Icon>
                <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
              </Icon>
            </IconStyle>
          </Style>
          <Point>
            <coordinates>${location.longitude},${location.latitude},0</coordinates>
          </Point>
        </Placemark>`;
    }

    // Add path connecting locations for high-threat devices
    if (device.persistenceScore >= 0.7 && device.locations.length > 1) {
      const coordinates = device.locations
        .map((loc: any) => `${loc.longitude},${loc.latitude},0`)
        .join(' ');

      placemarks += `
        <Placemark>
          <name>Path: ${device.macAddress}</name>
          <Style>
            <LineStyle>
              <color>${color}</color>
              <width>3</width>
            </LineStyle>
          </Style>
          <LineString>
            <coordinates>${coordinates}</coordinates>
          </LineString>
        </Placemark>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ISR Platform Surveillance Analysis</name>
    <description>Generated: ${timestamp}</description>
    
    <Style id="highThreat">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.5</scale>
      </IconStyle>
    </Style>
    
    <Style id="mediumThreat">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.2</scale>
      </IconStyle>
    </Style>
    
    <Style id="lowThreat">
      <IconStyle>
        <color>ffffff00</color>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
    
    ${placemarks}
  </Document>
</kml>`;
}

function getThreatColor(score: number): string {
  if (score >= 0.8) return 'ff0000ff'; // Red for high threat
  if (score >= 0.6) return 'ff00ffff'; // Yellow for medium threat
  return 'ff00ff00'; // Green for low threat
}

export { router as surveillanceRoutes };