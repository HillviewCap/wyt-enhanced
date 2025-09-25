# Client Mobility Tracking Implementation

## Overview

This document describes the Client Mobility Tracking system implemented for Kiz-Log-Buster. The system tracks WiFi client movement across locations using probe request fingerprinting to overcome MAC address randomization, providing enhanced ISR (Intelligence, Surveillance, and Reconnaissance) capabilities.

## Problem Statement

WiFi clients can move between geographic locations and many modern devices use MAC randomization, making traditional MAC-based tracking ineffective. The goal was to:

1. Track client mobility despite MAC address changes
2. Correlate location data with device behavior
3. Provide intelligence for ISR operations
4. Overcome MAC randomization challenges

## Solution Architecture

### Core Components

1. **ClientMobilityTracker** (`src/client_mobility_tracker.py`)
   - Main processing engine for mobility analysis
   - Device fingerprinting using probe request SSID patterns
   - MAC randomization detection and correlation

2. **Database Schema** (`database/migrations/013_client_mobility_tracking.sql`)
   - New tables for storing signatures and mobility events
   - Views for intelligence analysis
   - Indexes optimized for geospatial queries

3. **Analysis Runner** (`run_mobility_analysis.py`)
   - Standalone script for running mobility analysis
   - Multiple operation modes for different analysis types

4. **Intelligence Queries** (`database/MOBILITY_INTELLIGENCE_QUERIES.sql`)
   - Pre-built queries for surveillance and reconnaissance
   - Advanced pattern detection and correlation analysis

## Technical Implementation

### Device Fingerprinting Algorithm

The system creates unique device signatures based on:

- **SSID Set**: Collection of network names probed by the device
- **Signature Hash**: SHA-256 hash of sorted SSID list (first 16 characters)
- **Confidence Score**: Reliability metric (0.0-1.0) based on:
  - SSID diversity (more unique SSIDs = higher confidence)
  - Probe frequency (more probes = more reliable)
  - Location diversity (movement indicates real device)
  - Personal network detection (home networks boost confidence)

### Enhanced SSID Processing

The mobility tracker includes enhanced SSID extraction capabilities:

- **Direct Probe Request Analysis**: Processes actual probe request packets from the packets table
- **Device Metadata Integration**: Extracts SSID information from Kismet device metadata (probed_ssid_map)
- **Synthetic Probe Generation**: Creates synthetic probe request entries for devices where probe packets are missing
- **Multi-source Correlation**: Combines data from packets table and device metadata for comprehensive analysis

### Confidence Scoring Formula

```python
confidence = (
    ssid_score * 0.4 +      # 40% weight on SSID diversity
    probe_score * 0.3 +     # 30% weight on probe frequency
    location_score * 0.3 +  # 30% weight on location diversity
    personal_bonus          # 10% bonus for personal networks
)
```

### MAC Randomization Detection

The system identifies potential MAC randomization by:

1. Grouping devices by signature hash
2. Finding multiple MAC addresses with identical SSID patterns
3. Correlating movement patterns across different MACs
4. Applying confidence thresholds to filter noise

## Database Schema

### New Tables

#### `device_signatures`
Stores SSID-based device fingerprints:
- `client_mac`: Original MAC address observed
- `signature_hash`: 16-character hash of SSID set
- `ssids_json`: JSONB array of SSIDs probed
- `confidence_score`: Reliability rating (0.0-1.0)
- `location_count`: Number of unique locations observed
- `locations_json`: Array of [latitude, longitude] coordinates

#### `client_mobility_events`
Tracks movement between locations:
- `signature_hash`: Device signature identifier
- `from_latitude/longitude`: Starting location
- `to_latitude/longitude`: Destination location
- `distance_meters`: Distance traveled
- `time_delta_seconds`: Time between observations
- `speed_kmh`: Calculated movement speed

#### `client_location_history`
Time-series location data (partitioned by month):
- `client_mac`: MAC address at time of observation
- `signature_hash`: Associated device signature
- `timestamp`: Observation time
- `latitude/longitude`: Geographic coordinates
- `ssids_probed_json`: SSIDs probed at this location

### Intelligence Views

- **`reliable_device_signatures`**: High-confidence signatures (≥0.7 confidence, ≥2 locations)
- **`recent_mobility_events`**: Movement events from last 7 days with speed analysis and movement categorization
- **`signature_clusters`**: Multiple MACs sharing identical signatures (MAC randomization detection)
- **`mobility_hotspots`**: Frequently visited locations based on mobility events

## Usage Examples

### Basic Mobility Analysis
```bash
# Run analysis on last 24 hours of data
./run_mobility_analysis.py --time-window 24 --min-confidence 0.7

# Extended analysis with higher confidence threshold
./run_mobility_analysis.py --time-window 48 --min-confidence 0.8 --verbose
```

### MAC Randomization Detection
```bash
# Find devices potentially related to specific MAC
./run_mobility_analysis.py --analyze-mac 12:34:56:78:9a:bc

# Get movement history for device signature
./run_mobility_analysis.py --signature-hash abc123def456 --verbose
```

### Maintenance Operations
```bash
# Clean up old tracking data (30+ days)
./run_mobility_analysis.py --cleanup

# Log analysis results to specific file
./run_mobility_analysis.py --log-file logs/mobility_$(date +%Y%m%d).log
```

### Database Queries

#### Find High-Confidence Mobile Devices
```sql
SELECT client_mac, signature_hash, confidence_score, location_count, ssids_json
FROM reliable_device_signatures
WHERE location_count >= 5 AND confidence_score >= 0.8
ORDER BY confidence_score DESC;
```

#### Detect MAC Randomization
```sql
SELECT signature_hash, unique_macs, client_macs, avg_confidence
FROM signature_clusters
WHERE unique_macs >= 3 AND avg_confidence >= 0.7
ORDER BY unique_macs DESC;
```

#### Analyze Movement Patterns
```sql
SELECT
    client_mac,
    distance_meters,
    ROUND((distance_meters / NULLIF(time_delta_seconds, 0)) * 3.6, 2) as speed_kmh,
    CASE
        WHEN distance_meters < 100 THEN 'Local Movement'
        WHEN distance_meters < 1000 THEN 'Neighborhood Movement'
        WHEN distance_meters < 5000 THEN 'City Movement'
        WHEN distance_meters < 50000 THEN 'Regional Movement'
        ELSE 'Long Distance Movement'
    END as movement_category
FROM client_mobility_events
WHERE speed_kmh > 50  -- Likely vehicle movement
ORDER BY distance_meters DESC;
```

## Intelligence Applications

### Surveillance Use Cases

1. **Target Tracking**: Follow specific devices across multiple locations despite MAC changes
2. **Pattern Analysis**: Identify regular movement patterns (commuting, routine visits)
3. **Association Analysis**: Correlate devices that appear together frequently
4. **Anomaly Detection**: Flag unusual movement patterns (high speed, impossible distances)

### Reconnaissance Capabilities

1. **Area Monitoring**: Track all devices entering/leaving specific geographic zones
2. **Device Profiling**: Build comprehensive profiles combining network and movement data
3. **Temporal Analysis**: Understand activity patterns by time of day/week
4. **Cross-Reference**: Correlate with existing WiFi client and network intelligence
5. **Speed Analysis**: Calculate movement speeds to identify transportation methods (walking, driving, etc.)

### Advanced Analytics

1. **Commuter Detection**: Identify devices with regular home-to-work patterns
2. **Tourist Identification**: Devices with unusual movement patterns in area
3. **Persistent Surveillance**: Long-term tracking despite MAC address rotation
4. **Geofencing Alerts**: Notifications when tracked devices enter sensitive areas

## Performance Considerations

### Database Optimization

- **Partitioned Tables**: Monthly partitioning for time-series location data
- **Specialized Indexes**: B-tree for MAC lookups, GIN for JSONB, GiST for geospatial
- **Bulk Operations**: Batch inserts for performance during analysis
- **Data Retention**: Automatic cleanup of old signatures and events

### Analysis Tuning

- **Time Windows**: Configurable analysis periods (default 24 hours)
- **Confidence Thresholds**: Adjustable minimum confidence levels
- **Location Filtering**: Distance thresholds for movement detection
- **Caching**: In-memory caches for frequently accessed signatures

## Configuration Parameters

### ClientMobilityTracker Settings

```python
# Fingerprinting parameters
min_ssids_for_fingerprint = 3          # Minimum SSIDs for reliable signature
fingerprint_confidence_threshold = 0.7  # Minimum confidence for matching
location_change_threshold_meters = 50.0  # Minimum distance for movement
time_window_hours = 24                  # Analysis time window
max_signature_age_days = 30             # Maximum signature retention
```

### Database Connection

```python
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'isr_db'),
    'user': os.getenv('DB_USER', 'isr_user'),
    'password': os.getenv('DB_PASSWORD', 'isr_password')
}
```

## Integration Points

### Existing Kismet Pipeline

The mobility tracker integrates with existing data flow:

1. **Data Source**: Reads from `packets` table (probe requests with SSIDs and coordinates)
2. **Correlation**: Links with `wifi_clients` table for additional device metadata
3. **Enhancement**: Adds mobility intelligence to existing wardriving and network data

### Future Enhancements

1. **Real-time Processing**: Stream processing for immediate mobility detection
2. **Machine Learning**: Predictive models for movement patterns
3. **API Integration**: REST API for external surveillance systems
4. **Alerting System**: Automated notifications for significant events

## Recent Improvements

### SSID Processing Enhancements (September 2025)

The automation scripts have been improved to address SSID processing issues:

1. **Enhanced SSID Extraction**: Fixed automated processor to properly extract SSID data from probe requests
2. **Multi-source Data Integration**: Improved correlation between packet-level data and device metadata
3. **Synthetic Probe Generation**: Added capability to create probe request entries from device metadata when probe packets are missing
4. **Data Quality Improvements**: Enhanced validation and normalization of SSID data from multiple sources

### Speed and Movement Analysis

1. **Movement Categorization**: Added automatic categorization of movement types (Local, Neighborhood, City, Regional, Long Distance)
2. **Speed Calculation**: Improved speed calculation with proper NULL handling for time deltas
3. **Transportation Mode Detection**: Enhanced analysis to identify walking vs. vehicle movement patterns

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**: Increase time window or reduce confidence threshold
2. **Missing Location Data**: Ensure GPS coordinates are captured in packet data
3. **Performance Issues**: Reduce analysis time window or implement data archiving
4. **False Positives**: Adjust SSID minimum requirements or location thresholds
5. **Missing SSID Data**: If probe request processing fails, check that the enhanced SSID extractor is working properly

### Validation Queries

```sql
-- Check signature generation
SELECT COUNT(*) as total_signatures,
       AVG(confidence_score) as avg_confidence,
       COUNT(*) FILTER (WHERE confidence_score >= 0.7) as reliable_signatures
FROM device_signatures;

-- Verify mobility event detection
SELECT COUNT(*) as total_events,
       AVG(distance_meters) as avg_distance,
       MAX(distance_meters) as max_distance
FROM client_mobility_events
WHERE event_timestamp >= NOW() - INTERVAL '24 hours';
```

## Security Considerations

1. **Data Privacy**: Implement data retention policies and anonymization where required
2. **Access Control**: Restrict access to mobility tracking tables and analysis tools
3. **Audit Logging**: Log all mobility analysis operations for compliance
4. **Secure Storage**: Encrypt sensitive location and movement data

---

## Files Created/Modified

- `src/client_mobility_tracker.py` - Main mobility tracking engine
- `src/enhanced_ssid_extractor.py` - Enhanced SSID extraction from device metadata
- `database/migrations/013_client_mobility_tracking.sql` - Database schema
- `database/migrations/rollback_013.sql` - Schema rollback
- `database/MOBILITY_INTELLIGENCE_QUERIES.sql` - Analysis queries
- `run_mobility_analysis.py` - Standalone analysis runner
- `CLAUDE.md` - Updated project documentation

## Dependencies

- `psycopg2` - PostgreSQL database connectivity
- `hashlib` - SHA-256 signature generation
- `json` - JSONB data handling
- `datetime` - Temporal analysis
- `logging` - Enhanced logging and debugging

---

*Last Updated: September 14, 2025*
*Implementation Version: 1.1 (SSID Processing Enhancements)*