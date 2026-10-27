/**
 * Dashboard Express Server
 * Serves the Akashic Civics web dashboard for interactive disparity analysis.
 * Provides REST API endpoints for visualization specs and analysis results.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

export interface DashboardConfig {
  port: number;
  rootDir: string;
  enableCors?: boolean;
  serveStatic?: boolean;
}

export class DashboardServer {
  private app: express.Application;
  private port: number;
  private rootDir: string;

  constructor(config: DashboardConfig) {
    this.port = config.port;
    this.rootDir = config.rootDir;

    this.app = express();
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({ origin: this.app.get('corsOptions') || '*' }));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Serve static dashboard UI
    if (config.serveStatic) {
      this.app.use(express.static(path.join(this.rootDir, 'src/dashboard/public')));
    }

    // API routes
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.get('/api/viz-specs', (_req, res) => {
      // Return available visualization specs
      const specs = [
        'barChartConvictionRates',
        'trendLineDisparity',
        'heatmapDisparity',
        'judgeComparison',
        'sentenceDistribution',
        'dispositionFlow',
      ];
      res.json({ specs });
    });

    this.app.post('/api/analyze', (req, res) => {
      const { analysisType } = req.body;
      // Route to appropriate analysis module
      // For now, return a placeholder
      res.json({ status: 'queued', analysisType });
    });

    // Catch-all: serve index.html for SPA routing
    this.app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
      } else {
        res.sendFile(path.join(this.rootDir, 'src/dashboard/public/index.html'));
      }
    });
  }

  /** Start the server. */
  async listen(): Promise<express.Application> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Dashboard server listening on port ${this.port}`);
        resolve(this.app);
      });
    });
  }

  /** Get the Express app instance for testing. */
  getApp(): express.Application {
    return this.app;
  }
}

/** Create a DashboardServer instance with default configuration. */
export function createDashboardServer(config: Partial<DashboardConfig>): DashboardServer {
  const defaults: DashboardConfig = {
    port: 3000,
    rootDir: process.cwd(),
    enableCors: true,
    serveStatic: true,
  };

  const merged = { ...defaults, ...config };
  return new DashboardServer(merged);
}