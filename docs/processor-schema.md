# Kiz-log-buster Processor Schema Documentation

## Overview

This document provides a comprehensive schema overview of the Kiz-log-buster wireless monitoring data pipeline, including database structure, data flow architecture, and processing components.

## Database Schema

### Core Tables

#### datasources
Stores information about Kismet data sources (wireless interfaces/sensors).

```sql
CREATE TABLE datasources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uuid UUID NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    definition TEXT,
    interface VARCHAR(100),
    type VARCHAR(50),
    hardware VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `uuid`: Unique identifier from Kismet datasource
- `name`: Human-readable datasource name
- `definition`: Kismet datasource definition string
- `interface`: Network interface name (e.g., wlan0)
- `type`: Datasource type (Wi-Fi, Bluetooth, RF)
- `hardware`: Hardware description

#### devices
Stores wireless device information with location and signal data.

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    macaddr MACADDR,
    phyname VARCHAR(100),
    devname VARCHAR(100),
    type VARCHAR(50),
    basic_type VARCHAR(50),
    crypt_set TEXT,
    basic_crypt_set VARCHAR(100),
    first_time TIMESTAMPTZ,
    last_time TIMESTAMPTZ,
    packets_total BIGINT DEFAULT 0,
    packets_rx BIGINT DEFAULT 0,
    packets_tx BIGINT DEFAULT 0,
    data_size BIGINT DEFAULT 0,
    channel VARCHAR(20),
    frequency INTEGER,
    manuf VARCHAR(255),
    model VARCHAR(255),
    mod_time TIMESTAMPTZ,
    server_uuid UUID,
    location JSONB,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    min_latitude NUMERIC(10,8),
    max_latitude NUMERIC(10,8),
    min_longitude NUMERIC(11,8),
    max_longitude NUMERIC(11,8),
    signal_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `key`: Unique device key from Kismet
- `macaddr`: Normalized MAC address (PostgreSQL MACADDR type)
- `phyname`: Physical layer name (Wi-Fi, Bluetooth)
- `type`: Device type classification
- `location`: Raw location JSON blob
- `latitude/longitude`: Extracted coordinates for indexing
- `signal_data`: Signal strength and quality metrics

#### packets (Partitioned)
Main fact table storing individual wireless packets. Partitioned by timestamp for performance.

```sql
CREATE TABLE packets (
    id UUID DEFAULT uuid_generate_v4(),
    ts TIMESTAMPTZ NOT NULL,
    device_key VARCHAR(255),
    datasource_uuid UUID,
    packet_type VARCHAR(50),
    sub_type VARCHAR(50),
    source_mac MACADDR,
    dest_mac MACADDR,
    bssid MACADDR,
    size INTEGER,
    frequency INTEGER,
    channel VARCHAR(20),
    signal_dbm INTEGER,
    noise_dbm INTEGER,
    snr NUMERIC(5,2),
    retry BOOLEAN DEFAULT FALSE,
    wep BOOLEAN DEFAULT FALSE,
    fragmented BOOLEAN DEFAULT FALSE,
    data_payload BYTEA,
    dot11_info JSONB,
    location JSONB,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (ts);
```

**Partitioning Strategy:**
- Monthly partitions: `packets_YYYY_MM`
- Automatic partition creation function
- BRIN indexes on timestamp columns

#### processing_state
Tracks file processing status and prevents duplicate processing.

```sql
CREATE TABLE processing_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_path TEXT NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_hash VARCHAR(64),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status Values:**
- `pending`: File queued for processing
- `processing`: Currently being processed
- `completed`: Successfully processed
- `failed`: Processing failed
- `skipped`: File skipped (already processed)

## Data Processing Architecture

### Component Flow

```
Kismet SQLite Files
        ↓
AutomatedKismetProcessor (Entry Point)
        ↓
File Discovery & State Check
        ↓
KismetProcessor (Main Engine)
        ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   DataExtractor │  DataNormalizer │ PacketDeduplicator │
└─────────────────┴─────────────────┴─────────────────┘
        ↓
DatabaseManager (PostgreSQL)
        ↓
Partitioned Storage
```

### Processing Components

#### DataExtractor (`src/data_extractor.py`)
**Purpose:** Extracts data from Kismet SQLite files with corruption handling.

**Key Methods:**
- `validate_kismet_file()`: SQLite integrity check with recovery
- `extract_datasources()`: Extract sensor information
- `extract_devices()`: Extract wireless device data  
- `extract_packets()`: Extract packet data with schema adaptation

**Error Handling:**
- SQLite corruption detection and recovery
- Schema validation for Kismet tables
- Graceful handling of malformed JSON data

#### DataNormalizer (`src/data_normalizer.py`)
**Purpose:** Normalizes and validates extracted data for consistent storage.

**Normalization Functions:**
- `normalize_mac_address()`: Standardizes MAC address format
- `normalize_coordinates()`: Validates GPS coordinates
- `extract_device_location()`: Structures location data with bounds
- `extract_protocol_data()`: Extracts protocol-specific information

**Data Transformations:**
- MAC addresses: Various formats → `xx:xx:xx:xx:xx:xx`
- Coordinates: JSON blobs → Structured lat/lon with validation
- Protocol data: Nested JSON → Organized by protocol type

#### PacketDeduplicator (`src/packet_deduplicator.py`)
**Purpose:** Hash-based deduplication with configurable time windows.

**Deduplication Strategy:**
- SHA-256 hashing of packet core fields
- 30-second time window tolerance
- Memory-efficient with automatic cleanup
- ~90% deduplication rate in overlapping sensor coverage

**Hash Components:**
```python
key_components = [
    source_mac, dest_mac, bssid,
    packet_type, sub_type, size, frequency
]
```

#### DatabaseManager (`src/database_manager.py`)
**Purpose:** Handles PostgreSQL operations with bulk insert optimization.

**Key Features:**
- Bulk insert operations for performance
- Partition-aware queries
- Data integrity verification
- Connection pooling and transaction management

### Data Flow Schema

#### Input Data (Kismet SQLite)
```
Tables: devices, datasources, packets, snapshots
Formats: JSON blobs, binary data, timestamps
Issues: Corruption, schema variations, overlapping sensors
```

#### Normalization Pipeline
```
1. File Validation → SQLite integrity check
2. Data Extraction → Table-specific queries
3. Normalization → Format standardization
4. Deduplication → Hash-based filtering
5. Storage → Bulk PostgreSQL insert
```

#### Output Data (PostgreSQL)
```
Structured relational tables
Normalized data types (MACADDR, TIMESTAMPTZ)
Partitioned for time-series performance
Indexed for spatial and temporal queries
```

## Processing States and Recovery

### State Machine
```
pending → processing → completed
    ↓         ↓
  failed ←────┘
```

### Recovery System
- Automatic detection of failed/stalled processes
- Configurable retry attempts with exponential backoff
- Corruption recovery using SQLite dump/restore
- Processing state persistence for crash recovery

### Metadata Tracking
Each processed file includes comprehensive metadata:
```json
{
  "datasources_processed": 2,
  "devices_processed": 145,
  "packets_processed": 8932,
  "processing_duration_seconds": 12.456,
  "processing_rate_mb_per_sec": 2.34,
  "deduplication_stats": {
    "total_processed": 8932,
    "duplicates_found": 8023,
    "deduplication_rate": 89.8
  }
}
```

## Performance Optimizations

### Database Level
- Monthly partitioning on timestamp columns
- BRIN indexes for time-series data
- GIN indexes on JSONB columns
- Bulk insert operations (5000 records/batch)

### Processing Level
- Stream processing with configurable batch sizes
- Memory-efficient deduplication with cleanup
- WAL mode for SQLite concurrent access
- Parallel processing capability

### Storage Efficiency
- Deduplication reduces storage by ~90%
- Compressed JSONB for protocol data
- Optimized data types (MACADDR vs TEXT)
- Automatic partition pruning

## Integration Points

### Systemd Service
```
Service: kiz-log-buster.service
Timer: kiz-log-buster.timer (15-minute intervals)
Working Directory: /tmp/kismet_processing
```

### Environment Configuration
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isr_db
DB_USER=isr_user
DB_PASSWORD=isr_password
```

### File Locations
```
Input: ~/kismet_logs/*.kismet
Working: /tmp/kismet_processing/
Logs: /tmp/kismet_processing/logs/
```

This schema documentation provides a complete technical overview of the Kiz-log-buster processor architecture, enabling developers to understand the data pipeline, extend functionality, and troubleshoot issues effectively.