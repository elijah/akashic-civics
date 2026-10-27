/**
 * Dashboard Server Tests
 */

import request from 'supertest';
import express from 'express';
import { createDashboardServer, DashboardServer } from '../server/index';

describe('DashboardServer', () => {
  let app: express.Application;
  let server: DashboardServer;

  beforeEach(() => {
    server = createDashboardServer({
      port: 0,
      rootDir: process.cwd(),
      serveStatic: false,
    });
    app = server.getApp();
  });

  describe('health endpoint', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('viz-specs endpoint', () => {
    it('should return list of available visualization specs', async () => {
      const response = await request(app).get('/api/viz-specs');
      expect(response.status).toBe(200);
      expect(response.body.specs).toBeDefined();
      expect(Array.isArray(response.body.specs)).toBe(true);
      expect(response.body.specs.length).toBeGreaterThan(0);
    });

    it('should include barChartConvictionRates spec', async () => {
      const response = await request(app).get('/api/viz-specs');
      expect(response.body.specs).toContain('barChartConvictionRates');
      expect(response.body.specs).toContain('trendLineDisparity');
      expect(response.body.specs).toContain('heatmapDisparity');
    });
  });

  describe('analyze endpoint', () => {
    it('should accept analysis request', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({
          analysisType: 'disparity',
          data: [{ conviction: true, race_ethnicity: 'A' }],
        });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('queued');
      expect(response.body.analysisType).toBe('disparity');
    });
  });
});