#!/bin/bash

# Preview script for cover_letters
# Uses Vite dev server with Cloudflare tunnel

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

HOST="127.0.0.1"
PORT=5005
SERVER_PID_FILE="dev_server_cover_letters.pid"
TUNNEL_PID_FILE="cf_tunnel_cover_letters.pid"
TUNNEL_LOG="cf_tunnel_cover_letters.log"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed"
    echo "Install it with: brew install cloudflared"
    exit 1
fi

# Function to find an available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
        if [ $port -gt 65535 ]; then
            echo "Error: No available ports found" >&2
            exit 1
        fi
    done
    echo $port
}

# Check if server is already running
if [ -f "$SERVER_PID_FILE" ]; then
    OLD_PID=$(cat "$SERVER_PID_FILE")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        PORT=$(lsof -Pan -p $OLD_PID -iTCP -sTCP:LISTEN 2>/dev/null | grep -o ':[0-9]*' | head -1 | cut -d: -f2)
        echo "✓ Server already running on port $PORT"
    else
        rm -f "$SERVER_PID_FILE"
        PORT=$(find_available_port $PORT)
    fi
else
    PORT=$(find_available_port $PORT)
fi

# Start server if not running
if [ ! -f "$SERVER_PID_FILE" ] || ! ps -p $(cat "$SERVER_PID_FILE") > /dev/null 2>&1; then
    echo "Starting Vite dev server on port $PORT..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    PORT=$PORT npm run dev > "dev_server_cover_letters.log" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$SERVER_PID_FILE"
    
    echo "Waiting for server to start..."
    sleep 3
    echo "✓ Server is running on port $PORT"
fi

# Stop existing tunnel if any
if [ -f "$TUNNEL_PID_FILE" ]; then
    OLD_TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
    if ps -p $OLD_TUNNEL_PID > /dev/null 2>&1; then
        echo "Stopping existing tunnel..."
        kill $OLD_TUNNEL_PID 2>/dev/null
        sleep 1
    fi
    rm -f "$TUNNEL_PID_FILE"
fi

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --url http://$HOST:$PORT > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > "$TUNNEL_PID_FILE"

# Wait for tunnel URL
echo "Waiting for tunnel to establish..."
sleep 3

PREVIEW_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1)

if [ -z "$PREVIEW_URL" ]; then
    sleep 2
    PREVIEW_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1)
fi

if [ -z "$PREVIEW_URL" ]; then
    echo "❌ Failed to get preview URL"
    echo "Check $TUNNEL_LOG for details"
    exit 1
fi

# Save preview URL
echo "$PREVIEW_URL" > ".preview_url_cover_letters"

# Display results
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 Preview Link for Cover Letters"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🔗 Preview URL: $PREVIEW_URL"
echo ""
echo "  📝 Server running on port $PORT (PID: $(cat $SERVER_PID_FILE))"
echo "  📝 Tunnel running (PID: $TUNNEL_PID)"
echo "  🔄 Changes will be reflected automatically (hot-reload enabled)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 To stop the preview, run: ./stop-preview.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

