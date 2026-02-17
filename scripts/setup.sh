#!/bin/bash
set -e

echo "=== NIST AI RMF 1.0 Course — Setup ==="
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3 is required. Install it from https://python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install it from https://nodejs.org"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Installing Python dependencies..."
cd "$PROJECT_DIR"
pip install -r requirements.txt

echo ""
echo "Installing Node.js dependencies..."
cd "$PROJECT_DIR/client"
npm install

echo ""
echo "=== Setup complete! ==="
echo "Run ./scripts/start.sh to start the course."
