#!/bin/bash

# -----------------------------
# LOAD ENV VARIABLES
# -----------------------------
if [ ! -f ".env" ]; then
    echo ".env not found!"
    exit 1
fi

# Load variables from .env
export $(grep -v '^#' .env | xargs)

# -----------------------------
# CONFIGURATION
# -----------------------------
# Docker container names
POSTGRES_CONTAINER="sr24_timescaledb"
REDIS_CONTAINER="sr24_redis"

# PostgreSQL credentials are now from .env
# PG_USER and PG_DB are automatically set

# -----------------------------
# FUNCTION: Clear PostgreSQL
# -----------------------------
echo "Clearing PostgreSQL database '$POSTGRES_DB' in container '$POSTGRES_CONTAINER'..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 

if [ $? -eq 0 ]; then
    echo "PostgreSQL database cleared successfully."
else
    echo "Failed to clear PostgreSQL database."
fi

# -----------------------------
# FUNCTION: Clear Redis
# -----------------------------
echo "Clearing all data in Redis container '$REDIS_CONTAINER'..."
docker exec -i "$REDIS_CONTAINER" redis-cli FLUSHALL

if [ $? -eq 0 ]; then
    echo "Redis cleared successfully."
else
    echo "Failed to clear Redis."
fi

echo "All done!"
