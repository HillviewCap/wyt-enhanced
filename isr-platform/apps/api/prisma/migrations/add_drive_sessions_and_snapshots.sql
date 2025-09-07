-- Migration: Add drive sessions and snapshots tables
-- Generated: 2025-09-05

-- Create drive_sessions table
CREATE TABLE IF NOT EXISTS "drive_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_name" VARCHAR(255),
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "total_distance_m" DECIMAL(10,2),
    "avg_speed_kmh" DECIMAL(5,2),
    "max_speed_kmh" DECIMAL(5,2),
    "networks_discovered" INTEGER NOT NULL DEFAULT 0,
    "clients_discovered" INTEGER NOT NULL DEFAULT 0,
    "route_geojson" JSONB,
    "start_latitude" DECIMAL(10,8),
    "start_longitude" DECIMAL(11,8),
    "end_latitude" DECIMAL(10,8),
    "end_longitude" DECIMAL(11,8),
    "detection_method" VARCHAR(50) NOT NULL DEFAULT 'gps_clustering',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "drive_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for drive_sessions
CREATE INDEX IF NOT EXISTS "drive_sessions_start_time_idx" ON "drive_sessions"("start_time");
CREATE INDEX IF NOT EXISTS "drive_sessions_end_time_idx" ON "drive_sessions"("end_time");

-- Create snapshots table
CREATE TABLE IF NOT EXISTS "snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "altitude" DECIMAL(8,2),
    "accuracy" DECIMAL(6,2),
    "speed" DECIMAL(6,2),
    "heading" DECIMAL(5,1),
    "datasource_uuid" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- Create indexes for snapshots
CREATE INDEX IF NOT EXISTS "snapshots_timestamp_idx" ON "snapshots"("timestamp");
CREATE INDEX IF NOT EXISTS "snapshots_datasource_uuid_idx" ON "snapshots"("datasource_uuid");

-- Update schema version or add comment
COMMENT ON TABLE "drive_sessions" IS 'GPS-based drive session detection and tracking';
COMMENT ON TABLE "snapshots" IS 'GPS coordinate snapshots from data collectors';

-- Insert initial data if needed (optional)
-- This could be used to detect drives from existing data

SELECT 'Drive sessions and snapshots tables created successfully' as result;