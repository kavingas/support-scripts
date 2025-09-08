#!/bin/bash

# Xdebug Tunnel Manager
# Automates SSH operations for managing Xdebug sockets across multiple nodes

set -e

# Default values
PROJECT_ID=""
ENVIRONMENT=""
LOCAL_PORT=9003

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 -p PROJECT_ID -e ENVIRONMENT [OPTIONS]"
    echo ""
    echo "Required arguments:"
    echo "  -p PROJECT_ID    Magento Cloud project ID (e.g., bhrplivdrfi6s)"
    echo "  -e ENVIRONMENT   Environment name (e.g., staging)"
    echo ""
    echo "Optional arguments:"
    echo "  -l LOCAL_PORT    Local port for Xdebug tunnel (default: 9003)"
    echo "  -h               Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -p bhrplivdrfi6s -e staging"
    exit 1
}

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Parse command line arguments
while getopts "p:e:l:h" opt; do
    case $opt in
        p)
            PROJECT_ID="$OPTARG"
            ;;
        e)
            ENVIRONMENT="$OPTARG"
            ;;
        l)
            LOCAL_PORT="$OPTARG"
            ;;
        h)
            usage
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            ;;
    esac
done

# Validate required arguments
if [[ -z "$PROJECT_ID" || -z "$ENVIRONMENT" ]]; then
    log_error "Missing required arguments!"
    usage
fi

# Determine the socket directory name based on environment
SOCKET_DIR="$PROJECT_ID"
if [[ "$ENVIRONMENT" == "staging" ]]; then
    SOCKET_DIR="${PROJECT_ID}_stg"
fi

SOCKET_DIR="/run/platform/$SOCKET_DIR"
XDEBUG_SOCKET_PATH="$SOCKET_DIR/xdebug.sock"

log "Starting Xdebug tunnel management for project: $PROJECT_ID, environment: $ENVIRONMENT"
log "Socket directory: $SOCKET_DIR"

# Step 1: Get all SSH hosts
log "Getting SSH hosts using magento-cloud command..."
SSH_HOSTS_OUTPUT=$(magento-cloud ssh -p "$PROJECT_ID" -e "$ENVIRONMENT" --all 2>/dev/null || {
    log_error "Failed to get SSH hosts. Make sure magento-cloud CLI is installed and you're authenticated."
    exit 1
})

# Parse SSH hosts from the output
# The mgc command output format may vary, so we'll extract hostnames
SSH_HOSTS=($(echo "$SSH_HOSTS_OUTPUT" | grep -oE '[0-9]+\.[^@]*@ssh\.[^\.]*\.magento\.cloud' | sort -u))

if [[ ${#SSH_HOSTS[@]} -eq 0 ]]; then
    log_error "No SSH hosts found. Please check your project ID and environment."
    exit 1
fi

log_success "Found ${#SSH_HOSTS[@]} SSH hosts:"
for host in "${SSH_HOSTS[@]}"; do
    echo "  - $host"
done

# Step 2: Finding xdebug key on first node
log "Finding xdebug key on first node..."
FIRST_HOST="${SSH_HOSTS[0]}"
XDEBUG_KEY=$(ssh "$FIRST_HOST" 'cat /etc/platform/*/nginx.conf | grep xdebug.sock | head -n1' 2>/dev/null)

log "Xdebug key: $XDEBUG_KEY"

# Step 3: Remove existing xdebug sockets on all nodes
log "Removing existing xdebug sockets on all nodes..."
for host in "${SSH_HOSTS[@]}"; do
    log "Cleaning socket on $host..."
    ssh "$host" "rm -f $XDEBUG_SOCKET_PATH" 2>/dev/null && {
        log_success "Successfully removed socket on $host"
    } || {
        log_warning "Failed to remove socket $XDEBUG_SOCKET_PATH on $host (may not exist)"
    }
done

# Step 4: Create SSH tunnels for each node
log "Creating SSH tunnels for each node..."
TUNNEL_PIDS=()

# Function to cleanup tunnels on script exit
cleanup_tunnels() {
    log "Cleaning up SSH tunnels..."
    for pid in "${TUNNEL_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            log "Terminated tunnel process $pid"
        fi
    done
}

# Set up cleanup trap
trap cleanup_tunnels EXIT INT TERM

# Create tunnels
CURRENT_PORT=$LOCAL_PORT
for host in "${SSH_HOSTS[@]}"; do
    log "Creating SSH tunnel for $host on port $CURRENT_PORT..."
    
    # Start SSH tunnel in background
    echo "ssh -R \"$XDEBUG_SOCKET_PATH:localhost:$CURRENT_PORT\" -N \"$host\""
    ssh -R "$XDEBUG_SOCKET_PATH:localhost:$CURRENT_PORT" -N "$host" &
    TUNNEL_PID=$!
    TUNNEL_PIDS+=("$TUNNEL_PID")
    
    log_success "SSH tunnel created for $host (PID: $TUNNEL_PID, Port: $CURRENT_PORT)"
    
    # Increment port for next tunnel to avoid conflicts
    # ((CURRENT_PORT++))
done

log_success "All SSH tunnels created successfully!"
log "Tunnels are running in the background. Press Ctrl+C to stop all tunnels."

echo ""
echo "=== Tunnel Summary ==="
CURRENT_PORT=$LOCAL_PORT
for i in "${!SSH_HOSTS[@]}"; do
    echo "Host: ${SSH_HOSTS[$i]}"
    echo "  Local port: $CURRENT_PORT"
    echo "  Remote socket: $XDEBUG_SOCKET_PATH"
    echo "  PID: ${TUNNEL_PIDS[$i]}"
    echo ""
    # ((CURRENT_PORT++))
done

# Keep script running to maintain tunnels
log "Tunnels are active. Waiting for termination signal..."
while true; do
    # Check if any tunnel process has died
    for i in "${!TUNNEL_PIDS[@]}"; do
        pid="${TUNNEL_PIDS[$i]}"
        if ! kill -0 "$pid" 2>/dev/null; then
            log_error "Tunnel process $pid for ${SSH_HOSTS[$i]} has died"
            unset TUNNEL_PIDS[$i]
        fi
    done
    
    # If all tunnels are dead, exit
    if [[ ${#TUNNEL_PIDS[@]} -eq 0 ]]; then
        log_error "All tunnels have died. Exiting."
        exit 1
    fi
    
    sleep 10
done
