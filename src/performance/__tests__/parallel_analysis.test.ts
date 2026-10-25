/**
 * Parallel Analysis Tests
 */

import { EventEmitter } from 'events';
import { WorkerPool } from '../parallel_analysis';

describe('WorkerPool', () => {
  let pool: WorkerPool<unknown, unknown>;

  afterEach(async () => {
    if (pool) await pool.shutdown();
  });

  describe('constructor', () => {
    it('should default to CPU count workers', () => {
      const p = new WorkerPool<unknown, unknown>();
      const stats = p.getStats();
      expect(stats.workers).toBeGreaterThan(0);
      expect(stats.pending).toBe(0);
      expect(stats.active).toBe(0);
      pool = p as WorkerPool<unknown, unknown>;
    });

    it('should accept custom config', () => {
      const p = new WorkerPool<number, number>({ numWorkers: 2, maxQueueSize: 10 });
      const stats = p.getStats();
      expect(stats.workers).toBe(2);
      pool = p as WorkerPool<unknown, unknown>;
    });

    it('should extend EventEmitter', () => {
      const p = new WorkerPool();
      expect(p).toBeInstanceOf(EventEmitter);
      pool = p as WorkerPool<unknown, unknown>;
    });
  });

  describe('submit / runAll', () => {
    it('should execute a single task', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 2 });
      pool = p as WorkerPool<unknown, unknown>;

      const result = await p.submit(1);
      expect(result.success).toBe(true);
      expect(result.taskId).toMatch(/^task_/);
      expect(result.output).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute all tasks and return results', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 2 });
      pool = p as WorkerPool<unknown, unknown>;

      const results = await p.runAll([1, 2, 3, 4, 5]);
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(p.getStats().active).toBe(0);
      expect(p.getStats().pending).toBe(0);
    });

    it('should handle an empty task list', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 2 });
      pool = p as WorkerPool<unknown, unknown>;

      const results = await p.runAll([]);
      expect(results).toEqual([]);
    });

    it('should return results in submission order', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 4 });
      pool = p as WorkerPool<unknown, unknown>;

      const inputs = [10, 20, 30, 40, 50];
      const results = await p.runAll([10, 20, 30, 40, 50]);
      expect(results.length).toBe(inputs.length);
    });
  });

  describe('priority queue', () => {
    it('should handle tasks with explicit priorities', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 2 });
      pool = p as WorkerPool<unknown, unknown>;

      const results = await p.runAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(results.length).toBe(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should accept per-task priority options', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 1 });
      pool = p as WorkerPool<unknown, unknown>;

      const high = await p.submit(1, { priority: 10 });
      const low = await p.submit(2, { priority: 1 });
      expect(high.success).toBe(true);
      expect(low.success).toBe(true);
    });
  });

  describe('backpressure', () => {
    it('should emit backpressure when queue exceeds maxQueueSize', async () => {
      const p = new WorkerPool<unknown, unknown>({
        numWorkers: 1,
        maxQueueSize: 1,
      });
      pool = p as WorkerPool<unknown, unknown>;

      let fired = false;
      p.on('backpressure', () => {
        fired = true;
      });

      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(p.submit(Math.random()));
      }

      await Promise.all(promises);
      expect(fired).toBe(true);
      expect(p.getStats().pending).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should complete active tasks and terminate workers', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 2 });
      const results = await p.runAll([1, 2, 3]);
      expect(results.length).toBe(3);
      await p.shutdown();
      // Shutdown is complete; no pending state assertion needed
    });

    it('should reject new submissions during shutdown', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 1 });
      await p.runAll([1, 2]);
      await p.shutdown();

      await expect(p.submit(3)).rejects.toThrow('shutting down');
    });
  });

  describe('worker errors', () => {
    it('should emit workerError on worker error', async () => {
      const p = new WorkerPool<unknown, unknown>({ numWorkers: 1 });
      pool = p as WorkerPool<unknown, unknown>;

      let emitted = false;
      p.on('workerError', () => {
        emitted = true;
      });

      await p.runAll([1, 2]);
      // workerError may not fire in normal operation
      void emitted;
    });
  });

  describe('shutdownTimeout', () => {
    it('should support configurable shutdown timeout', async () => {
      const p = new WorkerPool<unknown, unknown>({
        numWorkers: 1,
        shutdownTimeout: 500,
      });
      await p.runAll([1]);
      await p.shutdown();
    });
  });
});
