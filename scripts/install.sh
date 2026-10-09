#!/bin/bash
#
# akashic-civics install script
# 
# This script sets up the Akashic Civics analysis system with all
# dependencies. It is designed to work both standalone and alongside
# the main akashic monorepo (see docs/WORKSPACE_SETUP.md).
#
# Usage:
#   ./install.sh [--local | --workspace]
#
# Options:
#   --local      Install in local node_modules (default)
#   --workspace  Use npm workspaces (requires node >= 16)
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "Installing Akashic Civics analysis system..."
echo "Working directory: $ROOT_DIR"
echo ""

# Detect npm availability
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed" >&2
    echo "Please install Node.js 14+ from https://nodejs.org/" >&2
    exit 1
fi

# Detect node version
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 14 ]; then
    echo "ERROR: Node.js 14+ is required (found v$NODE_VERSION)" >&2
    exit 1
fi

# Create node_modules if needed
mkdir -p "$ROOT_DIR/node_modules"

# Install Node.js dependencies
echo "Installing npm dependencies..."
npm install

# Build TypeScript
echo ""
echo "Building TypeScript source..."
npm run build

# Create dist directory if it didn't get created
mkdir -p "$ROOT_DIR/dist"
if [ ! -f "$ROOT_DIR/dist/index.js" ]; then
    echo "Warning: dist/index.js not created. Check build output." >&2
else
    echo "Build complete: $ROOT_DIR/dist/index.js"
fi

# Check if R is available (for full analysis capability)
echo ""
if command -v Rscript &> /dev/null; then
    R_VERSION=$(Rscript --version 2>&1 | head -1)
    echo "R found: $R_VERSION"
    echo "Full R/Python analysis features are available."
else
    echo "WARNING: Rscript not found. Analysis will fall back to JS-implemented methods." >&2
    echo "To enable full statistical analysis, install R from https://cran.r-project.org/"
fi

# Check if Python is available (for feather/parquet exports)
echo ""
if command -v python3 &> /dev/null; then
    echo "Python found: $(python3 --version)"
    echo "Feather/Parquet export features are available."
else
    echo "WARNING: Python not found. CSV/JSON exports only." >&2
fi

echo ""
echo "Installation complete!"
echo ""
echo "To use in your application:"
echo "  npm install akashic-civics@1.0.0"
echo "  # or for local development:"
echo "  npm install file:akashic-civics"
echo ""
echo "Documentation: https://github.com/elijah/akashic-civics"