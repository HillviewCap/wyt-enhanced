import { PrismaClient } from '@prisma/client';
import { DeviceRepository } from './device.repository';
import { SightingRepository } from './sighting.repository';
import { AnalysisResultRepository } from './analysis-result.repository';

// Create a single PrismaClient instance
const prisma = new PrismaClient();

// Export repository instances
export const deviceRepository = new DeviceRepository(prisma);
export const sightingRepository = new SightingRepository(prisma);
export const analysisResultRepository = new AnalysisResultRepository(prisma);

// Export the prisma client for direct usage if needed
export { prisma };

// Export repository classes for testing or custom instantiation
export { DeviceRepository, SightingRepository, AnalysisResultRepository };