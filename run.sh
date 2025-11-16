#!/bin/bash

# Script to manage Docker containers
# Usage: ./run.sh [stop|start|restart]

# Always run from the directory of this script so docker-compose picks up the root .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.yaml"

# Function to stop all containers
stop_containers() {
    echo "🛑 Stopping all containers..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ All containers stopped"
}

# Function to start all containers
start_containers() {
    echo "🚀 Starting all containers..."
    # Recreate to ensure updated environment variables from .env are applied
    docker-compose -f $COMPOSE_FILE up -d --build --force-recreate
    echo "✅ All containers started"
}

# Function to restart all containers
restart_containers() {
    echo "🔄 Restarting all containers..."
    # Restart by re-running up to apply env changes
    docker-compose -f $COMPOSE_FILE up -d --build --force-recreate
    echo "✅ All containers restarted"
}

# Main script logic
case "$1" in
    stop)
        stop_containers
        ;;
    start)
        start_containers
        ;;
    restart)
        restart_containers
        ;;
    *)
        echo "Usage: $0 {stop|start|restart}"
        echo ""
        echo "Commands:"
        echo "  stop     - Stop all containers"
        echo "  start    - Start all containers"
        echo "  restart  - Restart all containers"
        exit 1
        ;;
esac

exit 0

