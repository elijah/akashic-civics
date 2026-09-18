# Akashic - Installation Guide

## Overview
Akashic is a self-hosted intelligence workspace that brings aircraft, satellites, earthquakes, weather, public radio, infrastructure, country intelligence, public cameras, and open-source reconnaissance onto a single interactive map.

This guide covers installation for the modular workspace setup.

## Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- Docker (optional, for containerized deployment)

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the workspace
git clone <workspace-url>
cd akashic-workspace

# Run setup script
./setup.sh

# Start development server
cd Akashic
npm run dev
```

### Option 2: Manual Setup

```bash
# 1. Clone all repositories
git clone <akashic-repo-url> Akashic
git clone <akashic-data-pipeline-url> akashic-data-pipeline
git clone <akashic-dashboard-url> akashic-dashboard
# ... etc

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Start
cd Akashic
npm run dev
```

## Workspace Structure

```
akashic-workspace/
├── Akashic/                    # Main application
├── akashic-data-pipeline/      # Core data processing
├── akashic-dashboard/          # UI components
├── akashic-llm/                # LLM integration
├── akashic-gov-data-connector/ # Government data sources
├── akashic-news-source-connector/ # News sources
├── akashic-facebook-cookeville-connector/
├── akashic-putnam-county-gov/
├── akashic-putnam-courts/
└── akashic-reddit-cookeville-connector/
```

## Environment Variables

Create a `.env.local` file in the `Akashic` directory:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/akashic"

# Optional: LLM API keys
OPENAI_API_KEY="your-key-here"
ANTHROPIC_API_KEY="your-key-here"

# Optional: External services
MAPTILER_API_KEY="your-key-here"
```

## Building for Production

```bash
# Build the main application
cd Akashic
npm run build

# Start production server
npm start
```

## Docker Deployment

```bash
# Build Docker image
cd Akashic
docker build -t akashic:latest .

# Run container
docker run -p 3000:3000 -e DATABASE_URL=... akashic:latest
```

## Troubleshooting

### Module not found
Ensure all workspace dependencies are installed:
```bash
npm install
```

### TypeScript errors
Run type checking:
```bash
cd Akashic
npx tsc --noEmit
```

### Build failures
Clean and rebuild:
```bash
cd Akashic
rm -rf .next
npm run build
```

## License
AGPL-3.0-or-later