-- Migration 011: Enhance WiGLE Cache for Perpetual Storage
-- Description: Remove expiration logic and add columns for key API response fields
-- Created: 2025-09-07

BEGIN;

-- Remove the expires_at column to keep cache data in perpetuity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'wigle_cache' AND column_name = 'expires_at') THEN
        ALTER TABLE wigle_cache DROP COLUMN expires_at;
        RAISE NOTICE 'Removed expires_at column from wigle_cache table';
    END IF;
END $$;

-- Drop the expires_at index since column is being removed
DROP INDEX IF EXISTS idx_wigle_cache_expires_at;

-- Add columns for commonly accessed Wigle API response fields
-- These will improve query performance by avoiding JSON extraction
DO $$
BEGIN
    -- Network identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'ssid') THEN
        ALTER TABLE wigle_cache ADD COLUMN ssid VARCHAR(255);
        RAISE NOTICE 'Added ssid column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'netid') THEN
        ALTER TABLE wigle_cache ADD COLUMN netid MACADDR;
        RAISE NOTICE 'Added netid column to wigle_cache table';
    END IF;

    -- Location data (triangulated coordinates)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'trilat') THEN
        ALTER TABLE wigle_cache ADD COLUMN trilat NUMERIC(10,8);
        RAISE NOTICE 'Added trilat column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'trilong') THEN
        ALTER TABLE wigle_cache ADD COLUMN trilong NUMERIC(11,8);
        RAISE NOTICE 'Added trilong column to wigle_cache table';
    END IF;

    -- Address information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'country') THEN
        ALTER TABLE wigle_cache ADD COLUMN country VARCHAR(10);
        RAISE NOTICE 'Added country column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'region') THEN
        ALTER TABLE wigle_cache ADD COLUMN region VARCHAR(100);
        RAISE NOTICE 'Added region column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'city') THEN
        ALTER TABLE wigle_cache ADD COLUMN city VARCHAR(255);
        RAISE NOTICE 'Added city column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'road') THEN
        ALTER TABLE wigle_cache ADD COLUMN road VARCHAR(255);
        RAISE NOTICE 'Added road column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'housenumber') THEN
        ALTER TABLE wigle_cache ADD COLUMN housenumber VARCHAR(20);
        RAISE NOTICE 'Added housenumber column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'postalcode') THEN
        ALTER TABLE wigle_cache ADD COLUMN postalcode VARCHAR(20);
        RAISE NOTICE 'Added postalcode column to wigle_cache table';
    END IF;

    -- Network properties
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'encryption') THEN
        ALTER TABLE wigle_cache ADD COLUMN encryption VARCHAR(50);
        RAISE NOTICE 'Added encryption column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'channel') THEN
        ALTER TABLE wigle_cache ADD COLUMN channel INTEGER;
        RAISE NOTICE 'Added channel column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'network_type') THEN
        ALTER TABLE wigle_cache ADD COLUMN network_type VARCHAR(20);
        RAISE NOTICE 'Added network_type column to wigle_cache table';
    END IF;

    -- Temporal data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'firsttime') THEN
        ALTER TABLE wigle_cache ADD COLUMN firsttime TIMESTAMPTZ;
        RAISE NOTICE 'Added firsttime column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'lasttime') THEN
        ALTER TABLE wigle_cache ADD COLUMN lasttime TIMESTAMPTZ;
        RAISE NOTICE 'Added lasttime column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'lastupdt') THEN
        ALTER TABLE wigle_cache ADD COLUMN lastupdt TIMESTAMPTZ;
        RAISE NOTICE 'Added lastupdt column to wigle_cache table';
    END IF;

    -- Network features
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'qos') THEN
        ALTER TABLE wigle_cache ADD COLUMN qos INTEGER;
        RAISE NOTICE 'Added qos column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'wep') THEN
        ALTER TABLE wigle_cache ADD COLUMN wep VARCHAR(10);
        RAISE NOTICE 'Added wep column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'freenet') THEN
        ALTER TABLE wigle_cache ADD COLUMN freenet VARCHAR(10);
        RAISE NOTICE 'Added freenet column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'paynet') THEN
        ALTER TABLE wigle_cache ADD COLUMN paynet VARCHAR(10);
        RAISE NOTICE 'Added paynet column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'dhcp') THEN
        ALTER TABLE wigle_cache ADD COLUMN dhcp VARCHAR(10);
        RAISE NOTICE 'Added dhcp column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'bcninterval') THEN
        ALTER TABLE wigle_cache ADD COLUMN bcninterval INTEGER;
        RAISE NOTICE 'Added bcninterval column to wigle_cache table';
    END IF;

    -- Additional metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'userfound') THEN
        ALTER TABLE wigle_cache ADD COLUMN userfound BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added userfound column to wigle_cache table';
    END IF;

    -- Result metadata from API response
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'total_results') THEN
        ALTER TABLE wigle_cache ADD COLUMN total_results INTEGER;
        RAISE NOTICE 'Added total_results column to wigle_cache table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'wigle_cache' AND column_name = 'result_count') THEN
        ALTER TABLE wigle_cache ADD COLUMN result_count INTEGER;
        RAISE NOTICE 'Added result_count column to wigle_cache table';
    END IF;
END $$;

-- Add constraints for data quality
ALTER TABLE wigle_cache
ADD CONSTRAINT wigle_cache_trilat_range CHECK (trilat BETWEEN -90 AND 90),
ADD CONSTRAINT wigle_cache_trilong_range CHECK (trilong BETWEEN -180 AND 180),
ADD CONSTRAINT wigle_cache_channel_range CHECK (channel BETWEEN 1 AND 200),
ADD CONSTRAINT wigle_cache_qos_range CHECK (qos BETWEEN 0 AND 100),
ADD CONSTRAINT wigle_cache_bcninterval_positive CHECK (bcninterval > 0);

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_wigle_cache_ssid ON wigle_cache (ssid);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_netid ON wigle_cache (netid);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_location ON wigle_cache (trilat, trilong);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_country_region ON wigle_cache (country, region);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_city ON wigle_cache (city);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_encryption ON wigle_cache (encryption);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_channel ON wigle_cache (channel);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_lasttime ON wigle_cache (lasttime);
CREATE INDEX IF NOT EXISTS idx_wigle_cache_updated_at ON wigle_cache (updated_at);

-- Create a composite index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_wigle_cache_geo_time
    ON wigle_cache (trilat, trilong, lasttime)
    WHERE trilat IS NOT NULL AND trilong IS NOT NULL;

-- Create GIN indexes for text search
CREATE INDEX IF NOT EXISTS idx_wigle_cache_ssid_gin ON wigle_cache
    USING GIN (to_tsvector('english', COALESCE(ssid, '')));

-- Create a view for enhanced wigle data access
CREATE OR REPLACE VIEW wigle_network_info AS
SELECT
    id,
    query_hash,
    ssid,
    netid,
    trilat,
    trilong,
    country,
    region,
    city,
    road,
    housenumber,
    postalcode,
    encryption,
    channel,
    network_type,
    firsttime,
    lasttime,
    lastupdt,
    qos,
    wep,
    freenet,
    paynet,
    dhcp,
    bcninterval,
    userfound,
    total_results,
    result_count,
    created_at,
    updated_at,
    -- Full JSON response is still available if needed
    response
FROM wigle_cache
ORDER BY updated_at DESC;

-- Update the existing query_hash index to be more efficient
DROP INDEX IF EXISTS idx_wigle_cache_query_hash;
CREATE UNIQUE INDEX idx_wigle_cache_query_hash ON wigle_cache (query_hash);

-- Insert migration record
INSERT INTO schema_migrations (version, description)
VALUES ('011', 'Enhance WiGLE Cache for Perpetual Storage')
ON CONFLICT (version) DO NOTHING;

COMMIT;
