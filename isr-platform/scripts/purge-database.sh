#!/bin/bash

# Database Purge Script - Removes incorrectly processed data
# This script will:
# 1. Create a backup of current data
# 2. Purge all analysis results and sightings
# 3. Reset the database to a clean state for re-ingestion

set -e

echo "=== ISR Platform Database Purge Script ==="
echo "This will remove ALL processed data from the database."
echo ""

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '#' | xargs)
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Parse DATABASE_URL to extract components
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not found in environment"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to purge all data? (yes/no): " confirmation
if [ "$confirmation" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="./db-backups"
mkdir -p $BACKUP_DIR

# Generate timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo ""
echo "Step 1: Creating backup at $BACKUP_FILE..."
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully"
    echo "  File size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "✗ Backup failed. Aborting purge."
    exit 1
fi

echo ""
echo "Step 2: Checking current data counts..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT 
    'Devices: ' || COUNT(*) FROM \"Device\"
UNION ALL
SELECT 
    'Sightings: ' || COUNT(*) FROM \"Sighting\"
UNION ALL
SELECT 
    'Analysis Results: ' || COUNT(*) FROM \"AnalysisResult\";
"

echo ""
echo "Step 3: Purging data..."
echo "  - Deleting analysis results..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM \"AnalysisResult\";"

echo "  - Deleting sightings..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM \"Sighting\";"

echo "  - Deleting devices..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM \"Device\";"

echo ""
echo "Step 4: Verifying cleanup..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT 
    'Devices: ' || COUNT(*) FROM \"Device\"
UNION ALL
SELECT 
    'Sightings: ' || COUNT(*) FROM \"Sighting\"
UNION ALL
SELECT 
    'Analysis Results: ' || COUNT(*) FROM \"AnalysisResult\";
"

echo ""
echo "=== Purge Complete ==="
echo "✓ All data has been removed from the database"
echo "✓ Backup saved at: $BACKUP_FILE"
echo ""
echo "To restore from backup if needed:"
echo "  PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo ""
echo "You can now re-run the ingestion service with the corrected processing logic."