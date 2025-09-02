# Kiz-Log-Buster Database Schema Documentation

## Overview

This document describes the database schema for the Kiz-Log-Buster wireless monitoring system. The database stores normalized wireless intelligence data from Kismet captures, optimized for geospatial analysis, device tracking, and wardriving operations.

## Database Information

- **Database Name**: `isr_db`
- **Database Type**: PostgreSQL 13+
- **Schema**: Enhanced for wireless intelligence and geospatial analysis
- **Partitioning**: Monthly partitions for time-series data
- **Indexes**: Optimized for geospatial queries and device lookups

---

## Core Tables (Base Kismet Data)

### 1. `datasources` - Data Source Configuration

Stores information about Kismet data sources (WiFi adapters, Bluetooth scanners).

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

**Key Columns:**
- `uuid`: Unique identifier from Kismet
- `name`: Human-readable datasource name (e.g., "kalipi_wifi", "kalipi_bt")
- `interface`: Physical interface (e.g., "wlan1mon", "hci0")
- `type`: Datasource type (e.g., "linuxwifi", "linuxbluetooth")
- `hardware`: Hardware description (e.g., "mt76x2u", "linuxhci")

### 2. `devices` - Base Device Information

Stores core device data extracted from Kismet.

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    macaddr MACADDR,
    phyname VARCHAR(100),        -- "IEEE802.11", "Bluetooth"
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
    server_uuid UUID,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    min_latitude NUMERIC(10,8),
    max_latitude NUMERIC(10,8),
    min_longitude NUMERIC(11,8),
    max_longitude NUMERIC(11,8),
    location JSONB,
    signal_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. `packets` - Raw Packet Data (Partitioned)

Stores individual packet captures with monthly partitioning.

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
    dot11_info JSONB,
    location JSONB,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (ts);
```

---

## Enhanced Intelligence Tables

### 4. `wifi_networks` - WiFi Access Points & Networks

Normalized WiFi network data for network intelligence.

```sql
CREATE TABLE wifi_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bssid MACADDR NOT NULL UNIQUE,
    ssid VARCHAR(32),                    -- Network name
    ssid_hash VARCHAR(64),               -- Hash for hidden networks
    security_type VARCHAR(50),           -- WPA2, WPA3, WEP, Open
    encryption VARCHAR(50),              -- AES, TKIP, etc.
    channel INTEGER,
    frequency INTEGER,
    signal_strength INTEGER,             -- Strongest observed signal (dBm)
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    times_seen INTEGER DEFAULT 1,
    vendor VARCHAR(255),                 -- OUI vendor lookup
    location JSONB,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    capabilities TEXT,                   -- Raw 802.11 capabilities
    beacon_interval INTEGER,
    dtim_period INTEGER,
    network_type VARCHAR(20),           -- Infrastructure, IBSS, Mesh
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Intelligence Use Cases:**
- Network discovery and mapping
- Rogue access point detection
- Security posture analysis
- Coverage area analysis

### 5. `wifi_clients` - WiFi Client Devices

Client devices and their network associations.

```sql
CREATE TABLE wifi_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_mac MACADDR NOT NULL UNIQUE,
    network_bssid MACADDR,              -- Associated network
    client_type VARCHAR(50),            -- Associated, Probing, Disconnected
    association_type VARCHAR(50),       -- Data, Management, Control
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    packets_total INTEGER DEFAULT 0,
    data_bytes BIGINT DEFAULT 0,
    vendor VARCHAR(255),                -- Device manufacturer
    signal_strength INTEGER,            -- Latest signal strength
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    dhcp_hostname VARCHAR(255),
    dhcp_vendor VARCHAR(255),
    user_agent TEXT,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Intelligence Use Cases:**
- Device tracking and identification
- Client behavior analysis  
- Network usage patterns
- Device fingerprinting

### 6. `bluetooth_devices` - Bluetooth & BLE Devices

Bluetooth device intelligence data.

```sql
CREATE TABLE bluetooth_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bd_address MACADDR NOT NULL UNIQUE,
    device_name VARCHAR(248),           -- Bluetooth device name
    device_type VARCHAR(50),            -- BLE, Classic, Dual
    device_class INTEGER,               -- Class of Device
    manufacturer_id INTEGER,
    manufacturer_data BYTEA,
    tx_power INTEGER,
    rssi INTEGER,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    times_seen INTEGER DEFAULT 1,
    vendor VARCHAR(255),                -- OUI vendor lookup
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    is_random_address BOOLEAN DEFAULT FALSE,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Intelligence Use Cases:**
- Bluetooth device discovery
- Personal device tracking
- IoT device identification
- Proximity analysis

### 7. `bluetooth_services` - GATT Services & Characteristics

Bluetooth service advertisements and capabilities.

```sql
CREATE TABLE bluetooth_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    service_uuid UUID NOT NULL,
    service_name VARCHAR(255),
    service_type VARCHAR(50),           -- Primary, Secondary
    characteristic_count INTEGER DEFAULT 0,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    service_data BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (device_id) REFERENCES bluetooth_devices(id) ON DELETE CASCADE,
    UNIQUE (device_id, service_uuid)
);
```

---

## Time-Series Analytics Tables (Partitioned)

### 8. `device_locations` - Device Movement Tracking

Time-series location data for device movement analysis (monthly partitioned).

```sql
CREATE TABLE device_locations (
    id UUID DEFAULT uuid_generate_v4(),
    device_key VARCHAR(255) NOT NULL,
    device_mac MACADDR,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    altitude NUMERIC(8,2),
    accuracy NUMERIC(6,2),              -- GPS accuracy in meters
    speed NUMERIC(6,2),                 -- Speed in km/h
    heading NUMERIC(5,1),               -- Heading in degrees
    location_source VARCHAR(50),        -- GPS, WiFi, Bluetooth, Manual
    signal_strength INTEGER,
    datasource_uuid UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);
```

**Intelligence Use Cases:**
- Device movement patterns
- Geofencing and location analysis
- Speed and direction tracking
- Historical location queries

### 9. `signal_measurements` - Signal Strength Analysis

RSSI and signal measurements over time (monthly partitioned).

```sql
CREATE TABLE signal_measurements (
    id UUID DEFAULT uuid_generate_v4(),
    device_key VARCHAR(255),
    device_mac MACADDR,
    target_mac MACADDR,                 -- Device being measured
    measurement_type VARCHAR(50),       -- RSSI, SNR, Signal, Noise
    signal_dbm INTEGER,
    noise_dbm INTEGER,
    snr NUMERIC(5,2),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    altitude NUMERIC(8,2),
    frequency INTEGER,
    channel VARCHAR(20),
    datasource_uuid UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);
```

**Intelligence Use Cases:**
- Coverage heatmaps
- Signal strength analysis
- Range estimation
- RF environment assessment

---

## Relationship Tables

### 10. `network_associations` - Device-Network Relationships

Tracks client-to-network associations over time.

```sql
CREATE TABLE network_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_mac MACADDR NOT NULL,
    network_bssid MACADDR,
    association_type VARCHAR(50),       -- Connected, Probing, Disconnected
    association_time TIMESTAMPTZ,
    disassociation_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    reason_code INTEGER,                -- 802.11 reason codes
    signal_strength INTEGER,
    data_transferred BIGINT DEFAULT 0,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11. `wardriving_sessions` - Collection Session Metadata

Tracks wardriving collection sessions.

```sql
CREATE TABLE wardriving_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    total_distance NUMERIC(10,2),       -- Distance in km
    area_covered NUMERIC(12,2),         -- Area in sq km
    devices_discovered INTEGER DEFAULT 0,
    networks_discovered INTEGER DEFAULT 0,
    datasource_uuids UUID[],            -- Array of datasources used
    route_geojson JSONB,                -- GeoJSON route data
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Intelligence Query Examples

### Network Discovery Queries

```sql
-- Find all WiFi networks by security type
SELECT ssid, bssid, security_type, channel, signal_strength, vendor
FROM wifi_networks 
WHERE security_type = 'Open' 
ORDER BY signal_strength DESC;

-- Networks discovered in the last 24 hours
SELECT ssid, bssid, security_type, first_seen, last_seen
FROM wifi_networks 
WHERE first_seen > NOW() - INTERVAL '24 hours'
ORDER BY first_seen DESC;

-- Hidden networks (no SSID broadcast)
SELECT bssid, ssid_hash, security_type, channel, first_seen
FROM wifi_networks 
WHERE ssid IS NULL OR ssid = ''
ORDER BY first_seen DESC;
```

### Device Tracking Queries

```sql
-- Active WiFi clients in the last hour
SELECT client_mac, vendor, client_type, last_seen, signal_strength
FROM wifi_clients 
WHERE last_seen > NOW() - INTERVAL '1 hour'
ORDER BY last_seen DESC;

-- Bluetooth devices by manufacturer
SELECT bd_address, device_name, vendor, device_type, rssi
FROM bluetooth_devices 
WHERE vendor LIKE '%Apple%' 
ORDER BY last_seen DESC;

-- Devices seen multiple times (persistent presence)
SELECT bd_address, device_name, times_seen, first_seen, last_seen
FROM bluetooth_devices 
WHERE times_seen > 5 
ORDER BY times_seen DESC;
```

### Geospatial Intelligence Queries

```sql
-- WiFi networks within a geographic area
SELECT ssid, bssid, latitude, longitude, signal_strength
FROM wifi_networks 
WHERE latitude BETWEEN 40.7580 AND 40.7614 
  AND longitude BETWEEN -73.9857 AND -73.9733;

-- Bluetooth devices near a specific location (100m radius)
SELECT bd_address, device_name, vendor,
       ST_Distance(
         ST_GeogFromText('POINT(' || longitude || ' ' || latitude || ')'),
         ST_GeogFromText('POINT(-73.9857 40.7589)')
       ) as distance_meters
FROM bluetooth_devices 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
HAVING distance_meters < 100
ORDER BY distance_meters;

-- Network coverage analysis by channel
SELECT channel, COUNT(*) as network_count, 
       AVG(signal_strength) as avg_signal,
       MIN(signal_strength) as min_signal,
       MAX(signal_strength) as max_signal
FROM wifi_networks 
GROUP BY channel 
ORDER BY channel;
```

### Temporal Analysis Queries

```sql
-- Device activity patterns over time
SELECT DATE_TRUNC('hour', last_seen) as hour,
       COUNT(DISTINCT client_mac) as unique_devices
FROM wifi_clients 
WHERE last_seen > NOW() - INTERVAL '7 days'
GROUP BY hour 
ORDER BY hour;

-- Signal strength over time for specific device
SELECT timestamp, signal_dbm, latitude, longitude
FROM signal_measurements 
WHERE device_mac = '12:34:56:78:9a:bc'
  AND timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp;
```

### Network Security Analysis

```sql
-- Security posture overview
SELECT security_type, 
       COUNT(*) as network_count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM wifi_networks 
GROUP BY security_type 
ORDER BY network_count DESC;

-- WEP networks (vulnerable)
SELECT ssid, bssid, channel, signal_strength, first_seen
FROM wifi_networks 
WHERE security_type = 'WEP'
ORDER BY signal_strength DESC;

-- Default/common network names
SELECT ssid, COUNT(*) as occurrences, 
       ARRAY_AGG(bssid) as bssids
FROM wifi_networks 
WHERE ssid IN ('linksys', 'netgear', 'dlink', 'default', 'xfinitywifi')
GROUP BY ssid;
```

### Advanced Analytics Queries

```sql
-- Client roaming behavior
SELECT w.client_mac, w.vendor,
       COUNT(DISTINCT w.network_bssid) as networks_seen,
       ARRAY_AGG(DISTINCT n.ssid) as network_names
FROM wifi_clients w
LEFT JOIN wifi_networks n ON w.network_bssid = n.bssid
WHERE w.last_seen > NOW() - INTERVAL '24 hours'
GROUP BY w.client_mac, w.vendor
HAVING COUNT(DISTINCT w.network_bssid) > 1
ORDER BY networks_seen DESC;

-- Bluetooth service discovery
SELECT s.service_name, COUNT(*) as device_count,
       ARRAY_AGG(DISTINCT d.vendor) as vendors
FROM bluetooth_services s
JOIN bluetooth_devices d ON s.device_id = d.id
GROUP BY s.service_name
ORDER BY device_count DESC;

-- Vendor analysis by device type
SELECT vendor, 
       COUNT(CASE WHEN phyname = 'IEEE802.11' THEN 1 END) as wifi_devices,
       COUNT(CASE WHEN phyname = 'Bluetooth' THEN 1 END) as bluetooth_devices
FROM devices 
WHERE vendor IS NOT NULL AND vendor != ''
GROUP BY vendor
HAVING COUNT(*) > 5
ORDER BY (wifi_devices + bluetooth_devices) DESC;
```

---

## Table Relationships

```
datasources (1) ←→ (N) packets
devices (1) ←→ (N) wifi_clients
devices (1) ←→ (N) bluetooth_devices  
bluetooth_devices (1) ←→ (N) bluetooth_services
wifi_networks (1) ←→ (N) wifi_clients
wifi_networks (1) ←→ (N) network_associations
wifi_clients (1) ←→ (N) network_associations
```

---

## Performance Considerations

### Indexes for Intelligence Queries

```sql
-- Geospatial indexes
CREATE INDEX idx_wifi_networks_location_coords 
ON wifi_networks (latitude, longitude);

CREATE INDEX idx_bluetooth_devices_location_coords 
ON bluetooth_devices (latitude, longitude);

-- Temporal indexes
CREATE INDEX idx_wifi_networks_last_seen 
ON wifi_networks (last_seen);

CREATE INDEX idx_bluetooth_devices_last_seen 
ON bluetooth_devices (last_seen);

-- Security analysis indexes
CREATE INDEX idx_wifi_networks_security_type 
ON wifi_networks (security_type);

-- Device lookup indexes
CREATE INDEX idx_wifi_clients_mac 
ON wifi_clients (client_mac);

CREATE INDEX idx_bluetooth_devices_address 
ON bluetooth_devices (bd_address);
```

### Partitioned Tables

Monthly partitions are automatically created for:
- `device_locations_YYYY_MM`
- `signal_measurements_YYYY_MM`
- `packets_YYYY_MM`

---

## Connection Information

```bash
# Database Connection
Host: 10.0.10.9
Port: 5433
Database: isr_db
Username: isr_user
Password: isr_password

# psql Connection String
psql -h 10.0.10.9 -p 5433 -U isr_user -d isr_db
```

---

## Data Types Reference

| Type | Description | Example |
|------|-------------|---------|
| `MACADDR` | MAC address | `12:34:56:78:9a:bc` |
| `TIMESTAMPTZ` | Timestamp with timezone | `2025-09-02 02:06:49+00` |
| `NUMERIC(10,8)` | Latitude/longitude | `40.75890123` |
| `JSONB` | Binary JSON | `{"key": "value"}` |
| `UUID` | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |

---

**Document Version**: 1.0  
**Last Updated**: September 2, 2025  
**Database Schema Version**: Enhanced v2.0 (Migrations 005-006)

For technical support or schema questions, contact the development team.