#!/bin/bash

# ============================================
# Hotel Booking System - Server Startup Script
# ============================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=5000
FRONTEND_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helper Functions ──────────────────────────────

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   ${BOLD}Hotel Booking System - Server Startup${NC}${CYAN}          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${YELLOW}── $1 ──${NC}"
}

cleanup() {
    echo ""
    echo -e "${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ── Network Detection ─────────────────────────────

get_network_info() {
    print_section "Network Configuration"

    # Local IP (WiFi / Ethernet)
    LOCAL_IPS=$(ip -4 addr show | grep -oP 'inet \K[0-9.]+' | grep -v '127.0.0.1')

    # ZeroTier IP
    ZT_INTERFACE=$(ip link show 2>/dev/null | grep -oP '(?<=: )zt[a-z0-9]+')
    if [ -n "$ZT_INTERFACE" ]; then
        ZT_IP=$(ip -4 addr show "$ZT_INTERFACE" 2>/dev/null | grep -oP 'inet \K[0-9.]+')
    fi

    echo -e "  ${BOLD}Hostname:${NC}    $(hostname)"
    echo ""

    echo -e "  ${BOLD}Local IPs:${NC}"
    while IFS= read -r ip; do
        IFACE=$(ip -4 addr show | grep -B2 "$ip" | head -1 | awk -F': ' '{print $2}')
        echo -e "    $ip  (${IFACE})"
    done <<< "$LOCAL_IPS"

    if [ -n "$ZT_IP" ]; then
        echo -e "    $ZT_IP  (${ZT_INTERFACE} - ZeroTier)"
    fi
    echo ""
}

# ── Print Access URLs ─────────────────────────────

print_access_report() {
    print_section "Access URLs"

    LOCAL_IPS=$(ip -4 addr show | grep -oP 'inet \K[0-9.]+' | grep -v '127.0.0.1')
    ZT_INTERFACE=$(ip link show 2>/dev/null | grep -oP '(?<=: )zt[a-z0-9]+')
    if [ -n "$ZT_INTERFACE" ]; then
        ZT_IP=$(ip -4 addr show "$ZT_INTERFACE" 2>/dev/null | grep -oP 'inet \K[0-9.]+')
    fi

    echo -e "  ${BOLD}Localhost:${NC}"
    echo -e "    Frontend:        ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "    Employee Portal: ${GREEN}http://localhost:${FRONTEND_PORT}/employee${NC}"
    echo -e "    Backend API:     ${GREEN}http://localhost:${BACKEND_PORT}/api${NC}"
    echo ""

    echo -e "  ${BOLD}LAN Access:${NC}"
    while IFS= read -r ip; do
        echo -e "    Frontend:        ${GREEN}http://${ip}:${FRONTEND_PORT}${NC}"
        echo -e "    Employee Portal: ${GREEN}http://${ip}:${FRONTEND_PORT}/employee${NC}"
        echo -e "    Backend API:     ${GREEN}http://${ip}:${BACKEND_PORT}/api${NC}"
        echo ""
    done <<< "$LOCAL_IPS"

    if [ -n "$ZT_IP" ]; then
        echo -e "  ${BOLD}ZeroTier Access:${NC}"
        echo -e "    Frontend:        ${GREEN}http://${ZT_IP}:${FRONTEND_PORT}${NC}"
        echo -e "    Employee Portal: ${GREEN}http://${ZT_IP}:${FRONTEND_PORT}/employee${NC}"
        echo -e "    Backend API:     ${GREEN}http://${ZT_IP}:${BACKEND_PORT}/api${NC}"
        echo ""
    fi

    echo -e "  ${BOLD}Frontend .env Config:${NC}"
    if [ -f "$PROJECT_DIR/frontend/.env" ]; then
        echo -e "    $(cat "$PROJECT_DIR/frontend/.env" | grep REACT_APP_API_URL)"
    else
        echo -e "    ${RED}No .env file found${NC}"
    fi
    echo ""
}

# ── Start Backend ─────────────────────────────────

start_backend() {
    print_section "Starting Backend"

    cd "$PROJECT_DIR/backend"

    if [ ! -d "venv" ]; then
        echo -e "  Creating virtual environment..."
        python3 -m venv venv
    fi

    echo -e "  Activating virtual environment..."
    source venv/bin/activate

    echo -e "  Installing dependencies..."
    pip install -r requirements.txt --quiet

    echo -e "  Starting Flask server on port ${BACKEND_PORT}..."
    python app.py &
    BACKEND_PID=$!

    # Wait for backend to be ready
    for i in $(seq 1 15); do
        if curl -s "http://localhost:${BACKEND_PORT}/api/rooms" > /dev/null 2>&1; then
            echo -e "  ${GREEN}Backend is running (PID: ${BACKEND_PID})${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "  ${YELLOW}Backend started (PID: ${BACKEND_PID}) - may still be initializing${NC}"
}

# ── Start Frontend ────────────────────────────────

start_frontend() {
    print_section "Starting Frontend"

    cd "$PROJECT_DIR/frontend"

    if [ ! -d "node_modules" ]; then
        echo -e "  Installing dependencies..."
        npm install
    fi

    echo -e "  Starting React dev server on port ${FRONTEND_PORT}..."
    HOST=0.0.0.0 npm start &
    FRONTEND_PID=$!

    echo -e "  ${GREEN}Frontend starting (PID: ${FRONTEND_PID})${NC}"
}

# ── Main ──────────────────────────────────────────

print_header
get_network_info
start_backend
echo ""
start_frontend
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
print_access_report
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Press Ctrl+C to stop all servers${NC}"
echo ""

# Keep script running and wait for both processes
wait
