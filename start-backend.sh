#!/usr/bin/env bash
set -e

# Resolve repository root and API directory (handles spaces in paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/apps/api"

if [ ! -d "$API_DIR" ]; then
    echo "[ERROR] API directory not found at: $API_DIR"
    exit 1
fi

# Detect python/uvicorn command
UVICORN_CMD=()
if [ -x "$API_DIR/.venv/bin/uvicorn" ]; then
    UVICORN_CMD=("$API_DIR/.venv/bin/uvicorn")
elif [ -x "$API_DIR/venv/bin/uvicorn" ]; then
    UVICORN_CMD=("$API_DIR/venv/bin/uvicorn")
elif [ -x "$SCRIPT_DIR/.venv/bin/uvicorn" ]; then
    UVICORN_CMD=("$SCRIPT_DIR/.venv/bin/uvicorn")
elif command -v uvicorn >/dev/null 2>&1; then
    UVICORN_CMD=("uvicorn")
elif [ -x "$API_DIR/.venv/bin/python" ]; then
    UVICORN_CMD=("$API_DIR/.venv/bin/python" "-m" "uvicorn")
elif [ -x "$API_DIR/venv/bin/python" ]; then
    UVICORN_CMD=("$API_DIR/venv/bin/python" "-m" "uvicorn")
elif command -v python3 >/dev/null 2>&1; then
    UVICORN_CMD=("python3" "-m" "uvicorn")
elif command -v python >/dev/null 2>&1; then
    UVICORN_CMD=("python" "-m" "uvicorn")
else
    echo "[ERROR] Could not locate uvicorn or python virtual environment."
    echo "Please ensure the virtual environment is set up in apps/api/.venv"
    exit 1
fi

PORT=8000
HOST="0.0.0.0"

# Check if port is already in use
OCCUPIED_PID=""
if command -v lsof >/dev/null 2>&1; then
    OCCUPIED_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
elif command -v ss >/dev/null 2>&1; then
    OCCUPIED_PID=$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | head -n 1 || true)
fi

if [ -n "$OCCUPIED_PID" ]; then
    echo "[!] Port $PORT is currently in use by process PID $OCCUPIED_PID."
    echo "    Terminating previous process to free port $PORT..."
    kill -9 $OCCUPIED_PID 2>/dev/null || true
    sleep 1
fi

cd "$API_DIR"

echo "============================================================"
echo "  🌱 Carbon Loop API Server (FastAPI + Uvicorn)"
echo "============================================================"
echo "  Local URL:    http://localhost:$PORT"
echo "  Network URL:  http://0.0.0.0:$PORT"
echo "  Swagger Docs: http://localhost:$PORT/docs"
echo "  API Health:   http://localhost:$PORT/api/v1/auth/demo-users"
echo "============================================================"
echo "  👉 Focus this terminal and press ANY KEY to STOP the server"
echo "============================================================"
echo ""

# Start uvicorn in the background
"${UVICORN_CMD[@]}" app.main:app --reload --host "$HOST" --port "$PORT" &
SERVER_PID=$!

# Function to clean up and shut down uvicorn cleanly
cleanup() {
    trap - EXIT INT TERM HUP
    echo ""
    echo "============================================================"
    echo "  Stopping Carbon Loop API Server (PID: $SERVER_PID)..."
    echo "============================================================"
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        # Send SIGINT to allow graceful shutdown of reload workers
        kill -INT "$SERVER_PID" 2>/dev/null || true
        # Wait up to 3 seconds for graceful exit
        for _ in {1..30}; do
            if ! kill -0 "$SERVER_PID" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done
        # Force kill if still hanging
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            kill -9 "$SERVER_PID" 2>/dev/null || true
        fi
    fi
    # Also ensure port 8000 is cleared
    if command -v lsof >/dev/null 2>&1; then
        REMAINING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
        if [ -n "$REMAINING_PID" ]; then
            kill -9 $REMAINING_PID 2>/dev/null || true
        fi
    fi
    echo "  ✅ Server stopped successfully."
    echo "============================================================"
}

trap cleanup EXIT INT TERM HUP

# Wait for any keypress while checking that the server process is still alive
while kill -0 "$SERVER_PID" 2>/dev/null; do
    if read -t 0.5 -n 1 -s -r; then
        echo ""
        echo "[INFO] Key press detected!"
        break
    fi
done

exit 0
