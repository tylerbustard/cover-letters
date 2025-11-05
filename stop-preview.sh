#!/bin/bash

# Stop preview script for cover_letters

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

SERVER_PID_FILE="dev_server_cover_letters.pid"
TUNNEL_PID_FILE="cf_tunnel_cover_letters.pid"

echo "Stopping cover_letters preview..."

if [ -f "$TUNNEL_PID_FILE" ]; then
    TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
    if ps -p $TUNNEL_PID > /dev/null 2>&1; then
        echo "Stopping tunnel (PID: $TUNNEL_PID)..."
        kill $TUNNEL_PID 2>/dev/null
    fi
    rm -f "$TUNNEL_PID_FILE"
fi

if [ -f "$SERVER_PID_FILE" ]; then
    SERVER_PID=$(cat "$SERVER_PID_FILE")
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
    fi
    rm -f "$SERVER_PID_FILE"
fi

echo "✓ Preview stopped"

