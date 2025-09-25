# Mobility Tracking Deployment Guide

## Overview

This guide covers the deployment of the Client Mobility Tracking features in the ISR Platform using Docker containers.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database with mobility tracking tables (created automatically via init scripts)
- Kismet log processing pipeline running (populates mobility data)

## Quick Start

### 1. Standard Deployment (with Mobility Features)

```bash
# Navigate to ISR platform directory
cd isr-platform

# Build and start all containers with mobility features
docker-compose -f docker-compose.yml -f docker-compose.mobility.yml up --build
```

### 2. Production Deployment

```bash
# Build images
docker-compose build

# Start services in detached mode
docker-compose up -d

# Verify mobility tracking is working
curl http://localhost:3001/api/mobility/health
```

## Container Configuration

### Database Container

The PostgreSQL container automatically initializes with:
- Mobility tracking tables (`device_signatures`, `client_mobility_events`, `client_location_history`)
- Intelligence analysis views
- Proper indexes for performance

Initialization script: `/database/init/02-mobility-tracking.sql`

### API Container

The API container includes:
- `/api/mobility/*` endpoints for mobility data access
- Health check endpoint: `/api/mobility/health`
- Automatic connection to mobility database tables

Environment variables:
```env
ENABLE_MOBILITY_TRACKING=true
MOBILITY_CONFIDENCE_THRESHOLD=0.7
MOBILITY_MIN_SSIDS=3
MOBILITY_LOCATION_THRESHOLD_METERS=50
```

### Frontend Container

The frontend container includes:
- MobilityMapView component for visualization
- DeviceTrackingPanel for device analysis
- Integration with GeospatialIntelligencePanel

Environment variables:
```env
REACT_APP_ENABLE_MOBILITY=true
REACT_APP_MOBILITY_DEFAULT_HOURS=168
```

## Verification Steps

### 1. Check Database Tables

```bash
# Connect to database
docker exec -it isr-postgres psql -U isr_user -d isr_db

# Verify tables exist
\dt device_signatures
\dt client_mobility_events
\dt client_location_history

# Check for data
SELECT COUNT(*) FROM device_signatures;
SELECT COUNT(*) FROM client_mobility_events;
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:3001/api/mobility/health

# Get mobility statistics
curl http://localhost:3001/api/mobility/analysis?type=summary

# List device signatures
curl http://localhost:3001/api/mobility/signatures?min_confidence=0.7

# Get mobility events
curl http://localhost:3001/api/mobility/events?hours_back=24
```

### 3. Verify Frontend Features

1. Open browser to `http://localhost:3000`
2. Click "📍 Mobility" button on map
3. Open Geospatial Intelligence Panel
4. Navigate to Mobility tab
5. Enter a MAC address to track a device

## Troubleshooting

### Issue: Mobility tables don't exist

**Solution:**
```bash
# Run initialization script manually
docker exec -it isr-postgres psql -U isr_user -d isr_db -f /docker-entrypoint-initdb.d/02-mobility-tracking.sql
```

### Issue: No mobility data showing

**Solution:**
1. Verify Kismet log processing is running
2. Check that probe requests are being processed
3. Ensure location data (GPS coordinates) is available

```bash
# Check for probe request data
docker exec -it isr-postgres psql -U isr_user -d isr_db -c "SELECT COUNT(*) FROM packets WHERE packet_type='management' AND sub_type='probe_req';"
```

### Issue: API endpoints return 500 errors

**Solution:**
```bash
# Check API logs
docker logs isr-api

# Restart API container
docker-compose restart api
```

### Issue: Frontend not showing mobility layer

**Solution:**
1. Clear browser cache
2. Check browser console for errors
3. Verify API is accessible from frontend

```bash
# Test API connectivity from frontend container
docker exec -it isr-frontend wget -O- http://api:3001/api/mobility/health
```

## Performance Optimization

### Database Tuning

For large datasets, optimize PostgreSQL:

```sql
-- Add to postgresql.conf or set via ALTER SYSTEM
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Data Retention

Implement automatic cleanup for old mobility data:

```bash
# Add to crontab for weekly cleanup
0 2 * * 0 docker exec isr-postgres psql -U isr_user -d isr_db -c "DELETE FROM client_mobility_events WHERE event_timestamp < NOW() - INTERVAL '90 days';"
```

### Index Maintenance

```sql
-- Rebuild indexes monthly
REINDEX TABLE device_signatures;
REINDEX TABLE client_mobility_events;
REINDEX TABLE client_location_history;

-- Update statistics
ANALYZE device_signatures;
ANALYZE client_mobility_events;
ANALYZE client_location_history;
```

## Monitoring

### Health Checks

Monitor container health:

```bash
# Check all container statuses
docker-compose ps

# Monitor resource usage
docker stats isr-postgres isr-api isr-frontend
```

### Metrics to Track

- Total device signatures tracked
- Mobility events per hour
- MAC randomization detection rate
- API response times

### Logging

```bash
# View logs for all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f postgres

# Save logs to file
docker-compose logs > mobility_logs_$(date +%Y%m%d).log
```

## Security Considerations

1. **Network Isolation**: Containers communicate via internal network
2. **Database Access**: Limited to API container only
3. **API Authentication**: Implement JWT tokens for production
4. **Data Privacy**: Consider GDPR compliance for location tracking

## Backup and Recovery

### Backup Database

```bash
# Backup mobility data
docker exec isr-postgres pg_dump -U isr_user -d isr_db \
  -t device_signatures \
  -t client_mobility_events \
  -t client_location_history \
  > mobility_backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore from backup
docker exec -i isr-postgres psql -U isr_user -d isr_db < mobility_backup_20250914.sql
```

## Updates and Maintenance

### Update Containers

```bash
# Pull latest changes
git pull

# Rebuild containers
docker-compose build --no-cache

# Restart with new version
docker-compose down
docker-compose up -d
```

### Rolling Updates

```bash
# Update one service at a time
docker-compose build api
docker-compose up -d --no-deps api

# Verify before continuing
curl http://localhost:3001/api/mobility/health

# Update frontend
docker-compose build frontend
docker-compose up -d --no-deps frontend
```

## Support

For issues or questions:
1. Check API health: `http://localhost:3001/api/mobility/health`
2. Review logs: `docker-compose logs`
3. Verify database tables exist and contain data
4. Ensure Kismet log processing pipeline is operational

---

*Last Updated: September 14, 2025*
*Version: 1.0*