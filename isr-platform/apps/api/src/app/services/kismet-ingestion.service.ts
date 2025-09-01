import * as sqlite3 from 'sqlite3';
import { deviceRepository, sightingRepository } from '../data-access';
import { Device, Sighting } from '@prisma/client';

interface KismetDevice {
  devmac: string;
  first_time: number;
  last_time: number;
  strongest_signal: number;
  avg_lat: number;
  avg_lon: number;
  min_lat?: number;
  min_lon?: number;
  max_lat?: number;
  max_lon?: number;
}

export class KismetIngestionService {
  private db: sqlite3.Database | null = null;

  async connectToKismetFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error(`[${new Date().toISOString()}] ERROR: Failed to connect to Kismet file: ${err.message}`);
          reject(err);
        } else {
          console.log(`[${new Date().toISOString()}] INFO: Connected to Kismet file: ${filePath}`);
          resolve();
        }
      });
    });
  }

  async validateKismetFile(): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='devices'",
        (err, row) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] ERROR: Failed to validate Kismet file: ${err.message}`);
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  async getKismetDevices(): Promise<KismetDevice[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(
        `SELECT 
          devmac, 
          first_time, 
          last_time, 
          strongest_signal,
          avg_lat,
          avg_lon,
          min_lat,
          min_lon,
          max_lat,
          max_lon
        FROM devices 
        WHERE devmac IS NOT NULL AND devmac != ''`,
        (err, rows: KismetDevice[]) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] ERROR: Failed to fetch devices: ${err.message}`);
            reject(err);
          } else {
            console.log(`[${new Date().toISOString()}] INFO: Found ${rows.length} devices in Kismet file`);
            resolve(rows);
          }
        }
      );
    });
  }

  transformKismetDevice(kismetDevice: KismetDevice): {
    macAddress: string;
    firstSeen: Date;
    lastSeen: Date;
  } {
    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(kismetDevice.devmac)) {
      throw new Error(`Invalid MAC address format: ${kismetDevice.devmac}`);
    }

    return {
      macAddress: kismetDevice.devmac.toLowerCase(),
      firstSeen: new Date(kismetDevice.first_time * 1000),
      lastSeen: new Date(kismetDevice.last_time * 1000),
    };
  }

  transformKismetSighting(
    kismetDevice: KismetDevice,
    deviceId: string
  ): {
    deviceId: string;
    timestamp: Date;
    latitude: number;
    longitude: number;
    signalStrength: number;
  } | null {
    // Only create sighting if we have valid GPS coordinates
    if (
      !kismetDevice.avg_lat ||
      !kismetDevice.avg_lon ||
      (kismetDevice.avg_lat === 0 && kismetDevice.avg_lon === 0)
    ) {
      return null;
    }

    return {
      deviceId,
      timestamp: new Date(kismetDevice.last_time * 1000),
      latitude: kismetDevice.avg_lat,
      longitude: kismetDevice.avg_lon,
      signalStrength: kismetDevice.strongest_signal || 0,
    };
  }

  async ingestKismetFile(filePath: string): Promise<{
    devicesProcessed: number;
    sightingsCreated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let devicesProcessed = 0;
    let sightingsCreated = 0;

    try {
      console.log(`[${new Date().toISOString()}] INFO: Starting ingestion of file: ${filePath}`);
      
      // Connect to Kismet file
      await this.connectToKismetFile(filePath);

      // Validate it's a valid Kismet file
      const isValid = await this.validateKismetFile();
      if (!isValid) {
        throw new Error('Invalid Kismet file: devices table not found');
      }

      // Get all devices from Kismet file
      const kismetDevices = await this.getKismetDevices();

      // Process devices in batches for efficiency
      const batchSize = 100;
      const sightingsToCreate: Array<{
        deviceId: string;
        timestamp: Date;
        latitude: number;
        longitude: number;
        signalStrength: number;
      }> = [];

      for (let i = 0; i < kismetDevices.length; i += batchSize) {
        const batch = kismetDevices.slice(i, i + batchSize);
        
        for (const kismetDevice of batch) {
          try {
            // Transform and upsert device
            const deviceData = this.transformKismetDevice(kismetDevice);
            const device = await deviceRepository.upsert(deviceData);
            devicesProcessed++;

            // Transform and prepare sighting if GPS data exists
            const sightingData = this.transformKismetSighting(kismetDevice, device.id);
            if (sightingData) {
              sightingsToCreate.push(sightingData);
            }
          } catch (err) {
            const errorMsg = `Failed to process device ${kismetDevice.devmac}: ${err}`;
            console.error(`[${new Date().toISOString()}] ERROR: ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        console.log(`[${new Date().toISOString()}] INFO: Processed ${Math.min(i + batchSize, kismetDevices.length)}/${kismetDevices.length} devices`);
      }

      // Batch insert sightings
      if (sightingsToCreate.length > 0) {
        const result = await sightingRepository.createMany(sightingsToCreate);
        sightingsCreated = result.count;
        console.log(`[${new Date().toISOString()}] INFO: Created ${sightingsCreated} sightings`);
      }

      console.log(`[${new Date().toISOString()}] INFO: Ingestion completed successfully`);
      console.log(`[${new Date().toISOString()}] INFO: Devices processed: ${devicesProcessed}, Sightings created: ${sightingsCreated}`);

    } catch (err) {
      const errorMsg = `Ingestion failed: ${err}`;
      console.error(`[${new Date().toISOString()}] ERROR: ${errorMsg}`);
      errors.push(errorMsg);
      throw err;
    } finally {
      // Close database connection
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] ERROR: Failed to close database: ${err.message}`);
          }
        });
        this.db = null;
      }
    }

    return {
      devicesProcessed,
      sightingsCreated,
      errors,
    };
  }
}

// Export a singleton instance
export const kismetIngestionService = new KismetIngestionService();