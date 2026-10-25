/**
 * Caching Layer Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CacheManager,
  createCacheManager,
  memoize,
} from '../caching_layer';

describe('CacheManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-cache-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeManager(): CacheManager {
    return createCacheManager(tmpDir);
  }

  describe('store / lookup', () => {
    it('should store and retrieve a value', () => {
      const m = makeManager();
      const payload = { query: 'SELECT * FROM cases' };
      const value = { convictionRate: 0.65, caseCount: 1000 };

      m.store(payload, value);
      const retrieved = m.lookup(payload);

      expect(retrieved).toEqual(value);
      expect(m.size()).toBe(1);
    });

    it('should return null for a missing key', () => {
      const m = makeManager();
      const result = m.lookup({ nonexistent: true });
      expect(result).toBeNull();
    });

    it('should return null for an expired entry', async () => {
      const m = makeManager();
      const payload = { key: 'expire' };
      const value = { data: 'old' };

      m.store(payload, value, 0.01); // 1 second TTL
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      const retrieved = m.lookup(payload);
      expect(retrieved).toBeNull();
    });

    it('should persist values to disk', () => {
      const m = makeManager();
      const payload = { persisted: true };
      const value = { result: 'on disk' };

      m.store(payload, value);

      const cacheDir = path.join(tmpDir, 'cache');
      const files = fs.readdirSync(cacheDir);
      const dataFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      expect(dataFiles.length).toBe(1);

      const diskValue = JSON.parse(
        fs.readFileSync(path.join(cacheDir, dataFiles[0]), 'utf8')
      );
      expect(diskValue).toEqual(value);
    });

    it('should persist index to disk', () => {
      const m = makeManager();
      m.store({ a: 1 }, { b: 2 });

      const indexPath = path.join(tmpDir, 'cache', 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(Object.keys(index).length).toBe(1);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific entry', () => {
      const m = makeManager();
      const payload = { toRemove: true };
      const value = { data: 'gone' };

      m.store(payload, value);
      expect(m.size()).toBe(1);

      m.invalidate(payload);
      expect(m.size()).toBe(0);
      expect(m.lookup(payload)).toBeNull();
    });

    it('should not crash on missing entry', () => {
      const m = makeManager();
      expect(() => m.invalidate({ nonexistent: true })).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const m = makeManager();
      m.store({ a: 1 }, { b: 2 });
      m.store({ c: 3 }, { d: 4 });

      m.clear();
      expect(m.size()).toBe(0);
    });

    it('should recreate the cache directory', () => {
      const m = makeManager();
      m.store({ a: 1 }, { b: 2 });

      m.clear();
      const cacheDir = path.join(tmpDir, 'cache');
      expect(fs.existsSync(cacheDir)).toBe(true);
      expect(fs.existsSync(path.join(cacheDir, 'index.json'))).toBe(true);
    });
  });

  describe('resume from existing cache', () => {
    it('should load an existing index on construction', () => {
      const m1 = makeManager();
      m1.store({ key: 'resume' }, { value: 42 });

      // Create a new manager with the same root dir
      const m2 = createCacheManager(tmpDir);
      const retrieved = m2.lookup({ key: 'resume' });
      expect(retrieved).toEqual({ value: 42 });
    });
  });

  describe('memoize', () => {
    it('should cache results of a pure function', async () => {
      let calls = 0;
      const fn = async (x: number) => {
        calls++;
        return x * 2;
      };
      const cached = memoize(fn, { defaultTtl: 60 });

      const r1 = await cached(5);
      const r2 = await cached(5);
      const r3 = await cached(7);

      expect(r1).toBe(10);
      expect(r2).toBe(10);
      expect(r3).toBe(14);
      expect(calls).toBe(2); // only called once per unique input
    });

    it('should not cache errors', async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new Error('test error');
      };
      const cached = memoize(fn);

      await expect(cached()).rejects.toThrow('test error');
      await expect(cached()).rejects.toThrow('test error');
      expect(calls).toBe(2);
    });
  });
});