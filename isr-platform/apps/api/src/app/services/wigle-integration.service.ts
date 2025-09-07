import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

interface WigleNetworkData {
  ssid: string;
  bssid: string;
  security: string;
  channel: number;
  signal: number;
  latitude: number;
  longitude: number;
  lastupdt: string;
  vendor?: string;
}

interface WigleSearchResponse {
  success: boolean;
  results: WigleNetworkData[];
  totalResults: number;
  search_after?: string;
}

interface WigleCache {
  id: string;
  queryHash: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
}

export class WigleIntegrationService {
  private prisma: PrismaClient;
  private wigleApi: AxiosInstance;
  private readonly CACHE_DURATION_HOURS = 24; // Cache Wigle responses for 24 hours
  private readonly MAX_REQUESTS_PER_DAY = 10; // Conservative limit for new accounts
  private requestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize Wigle API client
    this.wigleApi = axios.create({
      baseURL: 'https://api.wigle.net',
      timeout: 30000,
      auth: {
        username: process.env.WIGLE_API_NAME || '',
        password: process.env.WIGLE_API_TOKEN || ''
      },
      headers: {
        'User-Agent': 'ISR-Platform/1.0',
        'Accept': 'application/json'
      }
    });

    this.initializeRateLimiting();
  }

  private initializeRateLimiting(): void {
    // Reset request count daily
    const currentDate = new Date().toDateString();
    if (this.lastResetDate !== currentDate) {
      this.requestCount = 0;
      this.lastResetDate = currentDate;
    }
  }

  private generateQueryHash(params: any): string {
    return Buffer.from(JSON.stringify(params)).toString('base64');
  }

  private async getCachedResponse(queryHash: string): Promise<any | null> {
    try {
      // Check if we have this query cached in our database
      const cached = await this.prisma.$queryRaw<WigleCache[]>`
        SELECT * FROM wigle_cache 
        WHERE query_hash = ${queryHash} 
        AND expires_at > NOW()
        LIMIT 1
      `;

      if (cached && cached.length > 0) {
        console.log('🎯 Using cached Wigle response');
        return cached[0].response;
      }
      return null;
    } catch (error) {
      console.error('Error checking Wigle cache:', error);
      return null;
    }
  }

  private async setCachedResponse(queryHash: string, response: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS);

      await this.prisma.$executeRaw`
        INSERT INTO wigle_cache (query_hash, response, expires_at)
        VALUES (${queryHash}, ${JSON.stringify(response)}, ${expiresAt})
        ON CONFLICT (query_hash) DO UPDATE SET
          response = EXCLUDED.response,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Error caching Wigle response:', error);
    }
  }

  private canMakeRequest(): boolean {
    this.initializeRateLimiting();
    
    if (this.requestCount >= this.MAX_REQUESTS_PER_DAY) {
      console.warn(`⚠️ Wigle API rate limit reached (${this.requestCount}/${this.MAX_REQUESTS_PER_DAY})`);
      return false;
    }
    return true;
  }

  async searchNetworksByLocation(
    latitude: number, 
    longitude: number, 
    radius: number = 0.01, // ~1km
    maxResults: number = 100
  ): Promise<WigleSearchResponse | null> {
    const params = { latitude, longitude, radius, maxResults };
    const queryHash = this.generateQueryHash(params);

    // Check cache first
    const cachedResponse = await this.getCachedResponse(queryHash);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check rate limits
    if (!this.canMakeRequest()) {
      console.error('❌ Wigle API rate limit exceeded. Using cached data only.');
      return null;
    }

    try {
      console.log(`🌐 Making Wigle API request (${this.requestCount + 1}/${this.MAX_REQUESTS_PER_DAY})`);
      
      const response = await this.wigleApi.get('/api/v2/network/search', {
        params: {
          latrange1: latitude - radius,
          latrange2: latitude + radius,
          longrange1: longitude - radius,
          longrange2: longitude + radius,
          first: maxResults,
          variance: 0.01 // Reduce variance for more precise results
        }
      });

      this.requestCount++;

      const wigleData: WigleSearchResponse = {
        success: response.data.success || false,
        results: response.data.results || [],
        totalResults: response.data.totalResults || 0,
        search_after: response.data.search_after
      };

      // Cache the response
      await this.setCachedResponse(queryHash, wigleData);

      console.log(`✅ Wigle API returned ${wigleData.results.length} networks`);
      return wigleData;

    } catch (error: any) {
      console.error('❌ Wigle API request failed:', error.message);
      
      if (error.response?.status === 429) {
        console.error('Rate limited by Wigle API');
      } else if (error.response?.status === 401) {
        console.error('Wigle API authentication failed - check API credentials');
      }
      
      return null;
    }
  }

  async enrichLocalNetworks(
    boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): Promise<{ enriched: number; errors: number }> {
    let enriched = 0;
    let errors = 0;

    try {
      // Get local networks that need enrichment (no vendor data)
      const localNetworks = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT bssid, ssid, latitude, longitude 
        FROM wifi_networks 
        WHERE latitude BETWEEN ${boundingBox.minLat} AND ${boundingBox.maxLat}
          AND longitude BETWEEN ${boundingBox.minLng} AND ${boundingBox.maxLng}
          AND (vendor IS NULL OR vendor = '' OR vendor = 'Unknown')
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        LIMIT 50
      `;

      console.log(`🔍 Found ${localNetworks.length} networks needing enrichment`);

      for (const network of localNetworks) {
        try {
          // Search Wigle for this specific location
          const wigleData = await this.searchNetworksByLocation(
            parseFloat(network.latitude),
            parseFloat(network.longitude),
            0.001, // Very small radius to find exact matches
            50
          );

          if (wigleData?.results) {
            // Find matching BSSID in Wigle results
            const match = wigleData.results.find(
              (result: WigleNetworkData) => 
                result.bssid.toLowerCase() === network.bssid.toLowerCase()
            );

            if (match) {
              // Update our local network with Wigle data
              await this.prisma.$executeRaw`
                UPDATE wifi_networks 
                SET 
                  vendor = COALESCE(${match.vendor}, vendor),
                  security_type = CASE 
                    WHEN security_type IS NULL OR security_type = '' 
                    THEN ${match.security} 
                    ELSE security_type 
                  END,
                  channel = COALESCE(${match.channel}, channel),
                  updated_at = NOW()
                WHERE bssid = ${network.bssid}::macaddr
              `;
              
              enriched++;
              console.log(`✅ Enriched network ${network.ssid || 'Hidden'} (${network.bssid})`);
            }
          }

          // Small delay to be respectful to Wigle API
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error enriching network ${network.bssid}:`, error);
          errors++;
        }
      }

      console.log(`🎯 Enrichment complete: ${enriched} networks enriched, ${errors} errors`);
      return { enriched, errors };

    } catch (error) {
      console.error('❌ Error in enrichLocalNetworks:', error);
      return { enriched, errors: errors + 1 };
    }
  }

  async getApiStats(): Promise<{
    requestsToday: number;
    maxRequestsPerDay: number;
    cacheHits: number;
    apiCallsRemaining: number;
  }> {
    this.initializeRateLimiting();

    // Get cache statistics
    const cacheStats = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as cache_hits
      FROM wigle_cache 
      WHERE created_at >= CURRENT_DATE
    `;

    const cacheHits = cacheStats[0]?.cache_hits || 0;

    return {
      requestsToday: this.requestCount,
      maxRequestsPerDay: this.MAX_REQUESTS_PER_DAY,
      cacheHits: parseInt(cacheHits),
      apiCallsRemaining: this.MAX_REQUESTS_PER_DAY - this.requestCount
    };
  }

  async clearExpiredCache(): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM wigle_cache WHERE expires_at < NOW()
      `;
      console.log(`🧹 Cleared ${result} expired Wigle cache entries`);
      return result as number;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }
}

export default new WigleIntegrationService();