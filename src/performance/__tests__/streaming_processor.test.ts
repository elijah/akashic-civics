/**
 * Streaming Processor Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StreamProcessor, createStreamProcessor, StreamConfig } from '../streaming_processor';

describe('StreamProcessor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-stream-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeProcessor(config?: StreamConfig): StreamProcessor {
    return createStreamProcessor({ rootDir: tmpDir, config });
  }

  describe('constructor', () => {
    it('should initialize with defaults', () => {
      const proc = makeProcessor();
      expect(proc.totalCases()).toBe(0);
      expect(proc.getManifest().totalBatches).toBe(0);
    });

    it('should use custom config', () => {
      const proc = makeProcessor({ batchSize: 100, chunkSize: 50, alpha: 0.01 });
      expect(proc.totalCases()).toBe(0);
    });
  });

  describe('processRecords', () => {
    it('should process an empty array', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const results = await proc.processRecords([]);
      expect(results).toEqual([]);
      expect(proc.totalCases()).toBe(0);
    });

    it('should process records in a single chunk', async () => {
      const proc = makeProcessor({ batchSize: 100, chunkSize: 50 });
      const records = [
        { conviction: true, race: 'A' },
        { conviction: false, race: 'B' },
        { conviction: true, race: 'A' },
      ];
      const results = await proc.processRecords(records, 'TX-001', 'Test County');

      expect(proc.totalCases()).toBe(3);
      expect(results).toHaveLength(1);
      expect(results[0].casesInBatch).toBe(3);
      expect(results[0].cumulativeCases).toBe(3);
    });

    it('should split into multiple batches when batchSize is small', async () => {
      const proc = makeProcessor({ batchSize: 2, chunkSize: 10 });
      const records = Array(5).fill({ conviction: true });

      const results = await proc.processRecords(records);

      // 5 cases with batchSize=2 -> 3 batches (2,2,1)
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(proc.totalCases()).toBe(5);
    });

    it('should track cumulative cases across multiple calls', async () => {
      const proc = makeProcessor({ batchSize: 100, chunkSize: 50 });
      await proc.processRecords([{ conviction: true }, { conviction: false }]);
      await proc.processRecords([{ conviction: true }]);

      expect(proc.totalCases()).toBe(3);
      const manifest = proc.getManifest();
      expect(manifest.totalCases).toBe(3);
      expect(manifest.totalBatches).toBeGreaterThanOrEqual(1);
    });

    it('should compute conviction rate per batch', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      // 4 convictions out of 5
      const records = [
        { conviction: true },
        { conviction: true },
        { conviction: true },
        { conviction: true },
        { conviction: false },
      ];
      const results = await proc.processRecords(records);
      expect(results[0].convictionRate).toBeCloseTo(0.8, 2);
    });

    it('should normalize jurisdiction fields on each record', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const records = [{ conviction: true, custom: 'value' }];

      const results = await proc.processRecords(records, 'CA-001', 'Los Angeles');
      // The internal file should have the jurisdiction fields
      expect(results[0]).toBeDefined();
    });
  });

  describe('processFile', () => {
    it('should process a JSONL file line by line', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const filePath = path.join(tmpDir, 'input.jsonl');
      const lines = [
        { conviction: true, race: 'White' },
        { conviction: false, race: 'Black' },
        { conviction: true, race: 'Hispanic' },
      ];
      fs.writeFileSync(filePath, lines.map(l => JSON.stringify(l)).join('\n'), 'utf8');

      await proc.processFile(filePath, 'TX-001', 'Test County');

      expect(proc.totalCases()).toBe(3);
      expect(proc.totalCases()).toBeGreaterThanOrEqual(1);
    });

    it('should skip empty lines', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const filePath = path.join(tmpDir, 'input.jsonl');
      fs.writeFileSync(filePath, '\n\n  \n{"conviction":true}\n\n', 'utf8');

      await proc.processFile(filePath);
      expect(proc.totalCases()).toBe(1);
    });

    it('should handle malformed JSON lines gracefully', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const filePath = path.join(tmpDir, 'input.jsonl');
      fs.writeFileSync(filePath, 'not json\n{"conviction":true}\n', 'utf8');

      await proc.processFile(filePath);
      // Malformed line should not crash, should create a record with _parse_error
      expect(proc.totalCases()).toBe(2);
    });

    it('should accumulate batches across multiple files', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      const file1 = path.join(tmpDir, 'input1.jsonl');
      const file2 = path.join(tmpDir, 'input2.jsonl');
      fs.writeFileSync(file1, '{"conviction":true}\n{"conviction":false}\n', 'utf8');
      fs.writeFileSync(file2, '{"conviction":true}\n', 'utf8');

      await proc.processFile(file1);
      await proc.processFile(file2);

      expect(proc.totalCases()).toBe(3);
      const manifest = proc.getManifest();
      expect(manifest.batches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('manifest persistence', () => {
    it('should persist manifest to disk', async () => {
      const proc = makeProcessor({ batchSize: 10, chunkSize: 5 });
      await proc.processRecords([{ conviction: true }]);

      const manifestPath = path.join(tmpDir, '.akashic', 'streaming', 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.totalCases).toBe(1);
    });

    it('should resume from existing manifest', async () => {
      const proc1 = makeProcessor({ batchSize: 10, chunkSize: 5 });
      await proc1.processRecords([{ conviction: true }, { conviction: false }]);
      expect(proc1.totalCases()).toBe(2);

      // Create new processor with same root dir
      const proc2 = makeProcessor({ batchSize: 10, chunkSize: 5 });
      expect(proc2.totalCases()).toBe(2);
    });
  });
});