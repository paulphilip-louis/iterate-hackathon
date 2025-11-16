#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.yaml"

stop_containers() {
    echo "🛑 Stopping all containers..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ All containers stopped"
}

start_containers() {
    echo "🚀 Starting all containers..."
    docker-compose -f $COMPOSE_FILE up -d --build --force-recreate
    echo "✅ All containers started"
}

restart_containers() {
    echo "🔄 Restarting all containers..."
    docker-compose -f $COMPOSE_FILE restart
    echo "✅ All containers restarted"
}

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

