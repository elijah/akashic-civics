/**
 * Test suite for RExecutionManager
 */

import { RExecutionManager } from '../r_execution_manager';

describe('RExecutionManager', () => {
  let manager: RExecutionManager;

  beforeEach(() => {
    manager = new RExecutionManager('/usr/bin/Rscript', { maxWorkers: 2, defaultTimeout: 5000 });
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      const m = new RExecutionManager();
      expect(m.getStats().maxWorkers).toBeGreaterThan(0);
      expect(m.getStats().defaultTimeout).toBe(300000);
      m.cleanup();
    });

    test('initializes with custom config', () => {
      const m = new RExecutionManager('/custom/R', { maxWorkers: 4, defaultTimeout: 60000 });
      expect(m.getStats().maxWorkers).toBe(4);
      expect(m.getStats().defaultTimeout).toBe(60000);
      m.cleanup();
    });
  });

  describe('checkRAvailability', () => {
    test('returns availability status', async () => {
      const result = await manager.checkRAvailability();
      expect(result).toHaveProperty('available');
      if (result.available) {
        expect(result).toHaveProperty('version');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });

  describe('getWorkerStatus', () => {
    test('returns worker pool status', () => {
      const workers = manager.getWorkerStatus();
      
      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBe(manager.getStats().maxWorkers);
      expect(workers.every(w => typeof w.id === 'number' && typeof w.busy === 'boolean')).toBe(true);
    });
  });

  describe('getStats', () => {
    test('returns manager statistics', () => {
      const stats = manager.getStats();
      
      expect(stats).toHaveProperty('maxWorkers');
      expect(stats).toHaveProperty('busyWorkers');
      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('defaultTimeout');
    });
  });

  describe('cleanup', () => {
    test('cleans up resources', () => {
      manager.cleanup();
      
      expect(manager.getStats().activeExecutions).toBe(0);
      expect(manager.getStats().busyWorkers).toBe(0);
    });
  });

  describe('getActiveExecutions', () => {
    test('returns empty array when no active executions', () => {
      const active = manager.getActiveExecutions();
      expect(active).toEqual([]);
    });
  });
});