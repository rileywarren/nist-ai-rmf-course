#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting NIST AI RMF 1.0 Course ==="

# Start backend
echo "Starting backend server..."
cd "$PROJECT_DIR/server"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "Backend ready!"
    break
  fi
  sleep 1
done

# Start frontend
echo "Starting frontend..."
cd "$PROJECT_DIR/client"
npm run dev &
FRONTEND_PID=$!

# Wait and open browser
sleep 3
echo ""
echo "=== Course is running! ==="
echo "Open http://localhost:5173 in your browser"
echo "Press Ctrl+C to stop"
echo ""

# Open browser (cross-platform)
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:5173
elif command -v open > /dev/null; then
  open http://localhost:5173
fi

# Trap Ctrl+C to kill both processes
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Wait for either process to exit
wait
