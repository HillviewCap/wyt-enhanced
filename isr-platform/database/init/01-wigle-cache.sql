-- Initialize Wigle cache table for production deployments
-- This will run after the main database initialization

-- Create wigle_cache table for API response caching
CREATE TABLE IF NOT EXISTS "wigle_cache" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "query_hash" VARCHAR(255) NOT NULL UNIQUE,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wigle_cache_pkey" PRIMARY KEY ("id")
);

-- Create indexes for wigle_cache
CREATE INDEX IF NOT EXISTS "idx_wigle_cache_query_hash" ON "wigle_cache"("query_hash");
CREATE INDEX IF NOT EXISTS "idx_wigle_cache_expires_at" ON "wigle_cache"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_wigle_cache_created_at" ON "wigle_cache"("created_at");
CREATE INDEX IF NOT EXISTS "idx_wigle_cache_response_gin" ON "wigle_cache" USING GIN ("response");

-- Add comment
COMMENT ON TABLE "wigle_cache" IS 'Cache for Wigle API responses to avoid rate limiting';

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_wigle_cache()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM wigle_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_wigle_cache() IS 'Function to clean up expired Wigle cache entries';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON wigle_cache TO isr_user;