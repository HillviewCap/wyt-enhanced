# **API Specification**

YAML

openapi: 3.0.0  
info:  
  title: ISR Platform API  
  version: 1.0.0  
  description: API for the ISR Platform to manage data sources and retrieve analysis results.  
servers:  
  \- url: /api  
    description: Local development server

paths:  
  /health:  
    get:  
      summary: Health Check  
      responses:  
        '200':  
          description: Service is healthy.

  /datasources:  
    get:  
      summary: List all configured data sources  
      responses:  
        '200':  
          description: A list of data sources.  
    post:  
      summary: Create a new data source  
      responses:  
        '201':  
          description: Data source created.

  /datasources/{id}/ingest:  
    post:  
      summary: Start the ingestion process for a data source  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema:  
            type: string  
      responses:  
        '202':  
          description: Ingestion process started.

  /analysis/results:  
    get:  
      summary: Get analysis results  
      description: Retrieve persistence analysis results for all tracked devices with their associated sighting data  
      parameters:  
        \- name: min\_persistence\_score  
          in: query  
          required: false  
          description: Filter results by minimum persistence score (0.0-1.0)  
          schema:  
            type: number  
            format: float  
            minimum: 0.0  
            maximum: 1.0  
          example: 0.5  
      responses:  
        '200':  
          description: Successfully retrieved analysis results  
          content:  
            application/json:  
              schema:  
                type: array  
                items:  
                  type: object  
                  properties:  
                    deviceId:  
                      type: string  
                      description: Unique identifier for the device  
                      example: "550e8400-e29b-41d4-a716-446655440000"  
                    macAddress:  
                      type: string  
                      description: MAC address of the device  
                      example: "AA:BB:CC:DD:EE:FF"  
                    persistenceScore:  
                      type: number  
                      format: float  
                      description: Persistence score between 0.0 and 1.0  
                      example: 0.85  
                    firstSeen:  
                      type: string  
                      format: date-time  
                      description: ISO 8601 timestamp of first device sighting  
                      example: "2025-08-30T10:00:00Z"  
                    lastSeen:  
                      type: string  
                      format: date-time  
                      description: ISO 8601 timestamp of last device sighting  
                      example: "2025-08-30T14:30:00Z"  
                    locationCount:  
                      type: integer  
                      description: Number of unique locations where device was seen  
                      example: 3  
                    timeWindowHours:  
                      type: integer  
                      description: Analysis time window in hours  
                      example: 24  
                    analysisTimestamp:  
                      type: string  
                      format: date-time  
                      description: ISO 8601 timestamp when analysis was performed  
                      example: "2025-08-30T15:00:00Z"  
                    sightings:  
                      type: array  
                      description: Array of unique sighting locations  
                      items:  
                        type: object  
                        properties:  
                          latitude:  
                            type: number  
                            format: float  
                            description: Latitude coordinate  
                            example: 40.7128  
                          longitude:  
                            type: number  
                            format: float  
                            description: Longitude coordinate  
                            example: -74.0060  
                          timestamp:  
                            type: string  
                            format: date-time  
                            description: ISO 8601 timestamp of the sighting  
                            example: "2025-08-30T10:00:00Z"  
                          signalStrength:  
                            type: integer  
                            description: Signal strength in dBm  
                            example: -65  
              example:  
                \- deviceId: "550e8400-e29b-41d4-a716-446655440000"  
                  macAddress: "AA:BB:CC:DD:EE:FF"  
                  persistenceScore: 0.85  
                  firstSeen: "2025-08-30T10:00:00Z"  
                  lastSeen: "2025-08-30T14:30:00Z"  
                  locationCount: 3  
                  timeWindowHours: 24  
                  analysisTimestamp: "2025-08-30T15:00:00Z"  
                  sightings:  
                    \- latitude: 40.7128  
                      longitude: -74.0060  
                      timestamp: "2025-08-30T10:00:00Z"  
                      signalStrength: -65  
                    \- latitude: 40.7130  
                      longitude: -74.0062  
                      timestamp: "2025-08-30T12:00:00Z"  
                      signalStrength: -70  
        '400':  
          description: Bad Request - Invalid query parameters  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  error:  
                    type: string  
                    description: Error message  
              example:  
                error: "Invalid min_persistence_score. Must be a number between 0.0 and 1.0"  
        '500':  
          description: Internal Server Error  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  error:  
                    type: string  
                    description: Error message  
              example:  
                error: "Internal server error"

\<hr\>
