import { Router, Request, Response } from 'express';
import { kismetIngestionService } from '../services/kismet-ingestion.service';
import { PersistenceAnalysisService } from '../services/persistence-analysis.service';
import { prisma, analysisResultRepository } from '../data-access';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// In-memory storage for data sources (in production, store in database)
interface DataSource {
  id: string;
  type: 'kismet';
  config: {
    filePath: string;
  };
  createdAt: Date;
  lastIngestion?: Date;
  status: 'configured' | 'processing' | 'completed' | 'error';
}

const dataSources: Map<string, DataSource> = new Map();

// POST /api/datasources - Create a new data source configuration
router.post('/datasources', (req: Request, res: Response) => {
  try {
    const { name, path: filePath, type } = req.body;

    // Default to kismet type if not specified
    const dataSourceType = type || 'kismet';

    // Validate input
    if (dataSourceType !== 'kismet') {
      return res.status(400).json({
        error: 'Invalid data source type. Only "kismet" is supported.',
      });
    }

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        error: 'File path is required and must be a string.',
      });
    }

    // Validate and sanitize file path
    const normalizedPath = path.resolve(filePath);
    
    // Security: Restrict to kismet_logs directory only
    const allowedDirectory = path.resolve('/home/kali/kismet_logs');
    if (!normalizedPath.startsWith(allowedDirectory)) {
      return res.status(403).json({
        error: 'Access denied: File must be in /home/kali/kismet_logs directory',
      });
    }

    // Validate file exists
    if (!fs.existsSync(normalizedPath)) {
      return res.status(400).json({
        error: `File not found: ${normalizedPath}`,
      });
    }

    // Validate file extension
    if (!normalizedPath.endsWith('.kismet')) {
      return res.status(400).json({
        error: 'File must have .kismet extension',
      });
    }

    // Create data source
    const id = `ds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const dataSource: DataSource = {
      id,
      type: 'kismet',
      config: { filePath: normalizedPath },
      createdAt: new Date(),
      status: 'configured',
    };

    dataSources.set(id, dataSource);

    console.log(`[${new Date().toISOString()}] INFO: Created data source ${id} for file: ${filePath}`);

    // Return response matching frontend expectations
    return res.status(201).json({
      id: dataSource.id,
      name: name || path.basename(normalizedPath),
      path: normalizedPath,
      status: 'inactive',
      createdAt: dataSource.createdAt.toISOString(),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to create data source:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// POST /api/datasources/:id/ingest - Trigger ingestion process
router.post('/datasources/:id/ingest', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find data source
    const dataSource = dataSources.get(id);
    if (!dataSource) {
      return res.status(404).json({
        error: `Data source not found: ${id}`,
      });
    }

    // Check if already processing
    if (dataSource.status === 'processing') {
      return res.status(409).json({
        error: 'Ingestion already in progress',
      });
    }

    // Update status to processing
    dataSource.status = 'processing';
    dataSource.lastIngestion = new Date();

    console.log(`[${new Date().toISOString()}] INFO: Starting ingestion for data source ${id}`);

    // Run ingestion asynchronously
    kismetIngestionService
      .ingestKismetFile(dataSource.config.filePath)
      .then(async (result) => {
        dataSource.status = 'completed';
        console.log(
          `[${new Date().toISOString()}] INFO: Ingestion completed for data source ${id}. ` +
          `Devices: ${result.devicesProcessed}, Sightings: ${result.sightingsCreated}`
        );
        
        // Automatically trigger persistence analysis after successful ingestion
        console.log(`[${new Date().toISOString()}] INFO: Triggering persistence analysis after ingestion`);
        const analysisService = new PersistenceAnalysisService(prisma);
        
        analysisService
          .analyzeAllDevices()
          .then((analysisResult) => {
            console.log(
              `[${new Date().toISOString()}] INFO: Analysis completed after ingestion. ` +
              `Processed: ${analysisResult.processedCount} devices in ${analysisResult.duration}s, Errors: ${analysisResult.errors}`
            );
          })
          .catch((analysisError) => {
            console.error(`[${new Date().toISOString()}] ERROR: Analysis failed after ingestion:`, analysisError);
          });
      })
      .catch((error) => {
        dataSource.status = 'error';
        console.error(
          `[${new Date().toISOString()}] ERROR: Ingestion failed for data source ${id}:`,
          error
        );
      });
    
    // Return 202 Accepted immediately after starting async process
    return res.status(202).json({
      message: 'Ingestion process started',
      dataSourceId: id,
      status: 'processing',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to start ingestion:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/datasources/available-files - List available Kismet files in the logs directory
router.get('/datasources/available-files', (req: Request, res: Response) => {
  try {
    const kismetLogsDir = '/home/kali/kismet_logs';
    
    // Check if directory exists
    if (!fs.existsSync(kismetLogsDir)) {
      return res.status(404).json({
        error: 'Kismet logs directory not found',
        files: []
      });
    }

    // Read all .kismet files from the directory
    const files = fs.readdirSync(kismetLogsDir)
      .filter(file => file.endsWith('.kismet'))
      .map(file => {
        const filePath = path.join(kismetLogsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()); // Sort by most recent first

    console.log(`[${new Date().toISOString()}] INFO: Found ${files.length} Kismet files in ${kismetLogsDir}`);
    
    return res.status(200).json({
      directory: kismetLogsDir,
      files: files
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to list Kismet files:`, error);
    return res.status(500).json({
      error: 'Failed to list Kismet files',
      files: []
    });
  }
});

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET /api/datasources - List all data sources
router.get('/datasources', (req: Request, res: Response) => {
  try {
    const sources = Array.from(dataSources.values()).map((ds) => ({
      id: ds.id,
      name: path.basename(ds.config.filePath),
      path: ds.config.filePath,
      status: ds.status === 'processing' ? 'ingesting' : ds.status === 'configured' ? 'inactive' : 'active',
      lastIngested: ds.lastIngestion?.toISOString(),
      createdAt: ds.createdAt.toISOString(),
    }));

    return res.status(200).json(sources);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to list data sources:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/datasources/:id - Get specific data source
router.get('/datasources/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = dataSources.get(id);

    if (!dataSource) {
      return res.status(404).json({
        error: `Data source not found: ${id}`,
      });
    }

    return res.status(200).json({
      id: dataSource.id,
      type: dataSource.type,
      config: dataSource.config,
      createdAt: dataSource.createdAt,
      lastIngestion: dataSource.lastIngestion,
      status: dataSource.status,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to get data source:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// POST /api/analysis/trigger - Trigger persistence analysis
router.post('/analysis/trigger', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] INFO: Starting persistence analysis`);

    // Create persistence analysis service instance
    const analysisService = new PersistenceAnalysisService(prisma);

    // Run analysis asynchronously
    analysisService
      .analyzeAllDevices()
      .then((result) => {
        console.log(
          `[${new Date().toISOString()}] INFO: Analysis completed. ` +
          `Processed: ${result.processedCount} devices in ${result.duration}s, Errors: ${result.errors}`
        );
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] ERROR: Analysis failed:`, error);
      });

    // Return 202 Accepted immediately
    return res.status(202).json({
      message: 'Analysis process started',
      startTime: new Date(startTime).toISOString(),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to start analysis:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/analysis/results - Retrieve analysis results with device data
router.get('/analysis/results', async (req: Request, res: Response) => {
  try {
    console.log(`[${new Date().toISOString()}] INFO: Retrieving analysis results`);

    // Parse and validate query parameters
    const minPersistenceScore = req.query.min_persistence_score 
      ? parseFloat(req.query.min_persistence_score as string)
      : undefined;

    // Validate min_persistence_score if provided
    if (minPersistenceScore !== undefined) {
      if (isNaN(minPersistenceScore) || minPersistenceScore < 0.0 || minPersistenceScore > 1.0) {
        console.log(`[${new Date().toISOString()}] WARNING: Invalid min_persistence_score value: ${req.query.min_persistence_score}`);
        return res.status(400).json({
          error: 'Invalid min_persistence_score. Must be a number between 0.0 and 1.0',
        });
      }
    }

    // Retrieve analysis results with device information
    const analysisResults = await analysisResultRepository.findWithDevices(minPersistenceScore);

    // Process each result to include sighting data
    const resultsWithSightings = await Promise.all(
      analysisResults.map(async (result) => {
        // Get all sightings for this device
        const sightings = await prisma.sighting.findMany({
          where: { deviceId: result.deviceId },
          orderBy: { timestamp: 'asc' },
        });

        // Group sightings by unique location (lat/lon pairs)
        const locationMap = new Map<string, any>();
        sightings.forEach((sighting) => {
          const locationKey = `${sighting.latitude},${sighting.longitude}`;
          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, {
              latitude: sighting.latitude,
              longitude: sighting.longitude,
              timestamp: sighting.timestamp.toISOString(),
              signalStrength: sighting.signalStrength,
            });
          }
        });

        // Return structured response for this device
        return {
          deviceId: result.deviceId,
          macAddress: result.device.macAddress,
          persistenceScore: result.persistenceScore,
          firstSeen: result.device.firstSeen.toISOString(),
          lastSeen: result.device.lastSeen.toISOString(),
          locationCount: result.locationCount,
          timeWindowHours: result.timeWindowHours,
          analysisTimestamp: result.analysisTimestamp.toISOString(),
          sightings: Array.from(locationMap.values()),
        };
      })
    );

    console.log(
      `[${new Date().toISOString()}] INFO: Retrieved ${resultsWithSightings.length} analysis results` +
      (minPersistenceScore !== undefined ? ` with min_persistence_score >= ${minPersistenceScore}` : '')
    );

    return res.status(200).json(resultsWithSightings);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to retrieve analysis results:`, error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;