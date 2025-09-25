-- Client Mobility Tracking Tables
-- These tables support device fingerprinting and movement tracking despite MAC randomization

-- Check if tables already exist before creating
DO $$
BEGIN
    -- Create device_signatures table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_signatures') THEN
        CREATE TABLE device_signatures (
            id SERIAL PRIMARY KEY,
            client_mac MACADDR NOT NULL,
            signature_hash VARCHAR(16) NOT NULL,
            ssids_json JSONB,
            confidence_score NUMERIC(3,2) DEFAULT 0.0,
            location_count INTEGER DEFAULT 0,
            locations_json JSONB,
            first_seen TIMESTAMP,
            last_seen TIMESTAMP,
            total_probes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_device_signatures_mac ON device_signatures(client_mac);
        CREATE INDEX idx_device_signatures_hash ON device_signatures(signature_hash);
        CREATE INDEX idx_device_signatures_confidence ON device_signatures(confidence_score);
        CREATE INDEX idx_device_signatures_ssids ON device_signatures USING gin(ssids_json);
        CREATE INDEX idx_device_signatures_locations ON device_signatures USING gin(locations_json);

        RAISE NOTICE 'Created device_signatures table';
    END IF;

    -- Create client_mobility_events table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_mobility_events') THEN
        CREATE TABLE client_mobility_events (
            id SERIAL PRIMARY KEY,
            signature_hash VARCHAR(16) NOT NULL,
            from_latitude NUMERIC(10,8),
            from_longitude NUMERIC(11,8),
            to_latitude NUMERIC(10,8),
            to_longitude NUMERIC(11,8),
            distance_meters NUMERIC(10,2),
            time_delta_seconds INTEGER,
            speed_kmh NUMERIC(6,2),
            event_timestamp TIMESTAMP,
            client_macs MACADDR[],
            confidence_score NUMERIC(3,2) DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_mobility_events_signature ON client_mobility_events(signature_hash);
        CREATE INDEX idx_mobility_events_timestamp ON client_mobility_events(event_timestamp);
        CREATE INDEX idx_mobility_events_distance ON client_mobility_events(distance_meters);
        CREATE INDEX idx_mobility_events_speed ON client_mobility_events(speed_kmh);
        CREATE INDEX idx_mobility_events_from_coords ON client_mobility_events(from_latitude, from_longitude);
        CREATE INDEX idx_mobility_events_to_coords ON client_mobility_events(to_latitude, to_longitude);

        RAISE NOTICE 'Created client_mobility_events table';
    END IF;

    -- Create client_location_history table if it doesn't exist (partitioned by month)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_location_history') THEN
        CREATE TABLE client_location_history (
            id SERIAL,
            client_mac MACADDR NOT NULL,
            signature_hash VARCHAR(16),
            timestamp TIMESTAMP NOT NULL,
            latitude NUMERIC(10,8),
            longitude NUMERIC(11,8),
            ssids_probed_json JSONB,
            confidence_score NUMERIC(3,2) DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, timestamp)
        ) PARTITION BY RANGE (timestamp);

        -- Create partitions for the current and next 3 months
        CREATE TABLE IF NOT EXISTS client_location_history_2025_01 PARTITION OF client_location_history
            FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
        CREATE TABLE IF NOT EXISTS client_location_history_2025_02 PARTITION OF client_location_history
            FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
        CREATE TABLE IF NOT EXISTS client_location_history_2025_03 PARTITION OF client_location_history
            FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
        CREATE TABLE IF NOT EXISTS client_location_history_2025_04 PARTITION OF client_location_history
            FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

        CREATE INDEX idx_location_history_mac ON client_location_history(client_mac);
        CREATE INDEX idx_location_history_signature ON client_location_history(signature_hash);
        CREATE INDEX idx_location_history_timestamp ON client_location_history(timestamp);
        CREATE INDEX idx_location_history_coords ON client_location_history(latitude, longitude);

        RAISE NOTICE 'Created client_location_history table with partitions';
    END IF;

    -- Create views for intelligence analysis

    -- View for reliable device signatures
    CREATE OR REPLACE VIEW reliable_device_signatures AS
    SELECT
        client_mac,
        signature_hash,
        ssids_json,
        confidence_score,
        location_count,
        locations_json,
        first_seen,
        last_seen,
        total_probes
    FROM device_signatures
    WHERE confidence_score >= 0.7
        AND location_count >= 2
    ORDER BY confidence_score DESC, location_count DESC;

    -- View for recent mobility events
    CREATE OR REPLACE VIEW recent_mobility_events AS
    SELECT
        e.*,
        CASE
            WHEN distance_meters < 100 THEN 'Local Movement'
            WHEN distance_meters < 1000 THEN 'Neighborhood Movement'
            WHEN distance_meters < 5000 THEN 'City Movement'
            WHEN distance_meters < 50000 THEN 'Regional Movement'
            ELSE 'Long Distance Movement'
        END as movement_category,
        CASE
            WHEN speed_kmh < 7 THEN 'Walking'
            WHEN speed_kmh < 25 THEN 'Cycling'
            WHEN speed_kmh < 100 THEN 'Driving'
            ELSE 'High Speed Transit'
        END as transportation_mode
    FROM client_mobility_events e
    WHERE event_timestamp >= NOW() - INTERVAL '7 days'
    ORDER BY event_timestamp DESC;

    -- View for MAC randomization detection
    CREATE OR REPLACE VIEW signature_clusters AS
    SELECT
        signature_hash,
        COUNT(DISTINCT client_mac) as unique_macs,
        ARRAY_AGG(DISTINCT client_mac::text) as client_macs,
        AVG(confidence_score) as avg_confidence,
        SUM(location_count) as total_locations,
        MIN(first_seen) as first_seen,
        MAX(last_seen) as last_seen,
        (SELECT ssids_json FROM device_signatures ds
         WHERE ds.signature_hash = d.signature_hash
         ORDER BY confidence_score DESC LIMIT 1) as ssids_json
    FROM device_signatures d
    GROUP BY signature_hash
    HAVING COUNT(DISTINCT client_mac) >= 2
    ORDER BY unique_macs DESC, avg_confidence DESC;

    -- View for mobility hotspots
    CREATE OR REPLACE VIEW mobility_hotspots AS
    SELECT
        ROUND(latitude::numeric, 4) as lat_cluster,
        ROUND(longitude::numeric, 4) as lon_cluster,
        COUNT(*) as visit_count,
        COUNT(DISTINCT client_mac) as unique_devices,
        COUNT(DISTINCT signature_hash) as unique_signatures,
        AVG(latitude) as center_latitude,
        AVG(longitude) as center_longitude,
        MIN(timestamp) as first_visit,
        MAX(timestamp) as last_visit
    FROM client_location_history
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY lat_cluster, lon_cluster
    HAVING COUNT(*) >= 5
    ORDER BY visit_count DESC;

    RAISE NOTICE 'Created/updated all mobility tracking views';

END $$;