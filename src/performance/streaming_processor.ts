/**
 * Streaming Processor
 *
 * Memory-efficient analysis pipeline for large datasets (1M+ cases).
 * Reads input in bounded chunks, normalizes each chunk, computes
 * incremental statistics, and writes results to disk without loading
 * the full dataset into memory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface StreamConfig {
  alpha?: number;
  batchSize?: number;
  chunkSize?: number;
}

export interface StreamBatchResult {
  batchId: string;
  casesInBatch: number;
  cumulativeCases: number;
  convictionRate: number;
  sampleRate?: number;
}

export interface StreamManifest {
  jurisdictionId: string;
  jurisdictionName: string;
  createdAt: string;
  lastUpdated: string;
  totalBatches: number;
  totalCases: number;
  batches: Array<{
    batchId: string;
    timestamp: string;
    casesInBatch: number;
    cumulativeCases: number;
  }>;
}

export interface StreamProcessorOptions {
  rootDir: string;
  config?: StreamConfig;
}

export class StreamProcessor {
  private rootDir: string;
  private config: Required<StreamConfig>;
  private incDir: string;
  private manifest: StreamManifest;

  constructor(options: StreamProcessorOptions) {
    this.rootDir = path.resolve(options.rootDir);
    this.incDir = path.join(this.rootDir, '.akashic', 'streaming');
    this.config = {
      alpha: options.config?.alpha ?? 0.05,
      batchSize: options.config?.batchSize ?? 10000,
      chunkSize: options.config?.chunkSize ?? 5000,
    };

    this.manifest = this.loadManifest();
  }

  /** Process an input file line-by-line in bounded chunks. */
  async processFile(
    inputPath: string,
    jurisdictionId: string = 'UNKNOWN',
    jurisdictionName: string = 'Unknown'
  ): Promise<StreamBatchResult[]> {
    fs.mkdirSync(this.incDir, { recursive: true });
    // Ensure directory is accessible before opening write stream
    if (!fs.existsSync(this.incDir)) {
      throw new Error(`StreamProcessor: cache directory not accessible: ${this.incDir}`);
    }
    const results: StreamBatchResult[] = [];
    const outStream = fs.createWriteStream(path.join(this.incDir, 'cases.jsonl'), { flags: 'a' });
    outStream.on('error', (err) => {
      console.error('StreamProcessor write error:', err);
    });
    const lineStream = readline.createInterface({
      input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let chunkCases: Array<Record<string, unknown>> = [];
    let totalCases = this.manifest.totalCases;
    let convictionSum = 0;

    for await (const line of lineStream) {
      if (!line.trim()) continue;

      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line);
      } catch {
        record = { _raw: line.trim(), _parse_error: true };
      }

      record.jurisdictionId = jurisdictionId;
      record.jurisdictionName = jurisdictionName;

      if (record.conviction === true) convictionSum++;

      chunkCases.push(record);
      totalCases++;

      if (chunkCases.length >= this.config.chunkSize) {
        outStream.write(chunkCases.map(c => JSON.stringify(c)).join('\n') + '\n');
        chunkCases = [];
      }

      if (totalCases - this.manifest.totalCases >= this.config.batchSize) {
        const batch = this.createBatchRecord(
          totalCases - this.manifest.totalCases,
          convictionSum,
          jurisdictionId,
          jurisdictionName
        );
        results.push(batch);
      }
    }

    // Flush remaining chunk
    if (chunkCases.length > 0) {
      outStream.write(chunkCases.map(c => JSON.stringify(c)).join('\n') + '\n');
    }

    outStream.end();

    // Final batch for any remainder
    const newCases = totalCases - this.manifest.totalCases;
    if (newCases > 0) {
      const batch = this.createBatchRecord(newCases, convictionSum, jurisdictionId, jurisdictionName);
      results.push(batch);
    }

    this.manifest.totalCases = totalCases;
    this.manifest.lastUpdated = new Date().toISOString();
    this.saveManifest();

    return results;
  }

  /** Process an array of records in bounded chunks (in-memory bounded). */
  async processRecords(
    records: Record<string, unknown>[],
    jurisdictionId: string = 'UNKNOWN',
    jurisdictionName: string = 'Unknown'
  ): Promise<StreamBatchResult[]> {
    fs.mkdirSync(this.incDir, { recursive: true });
    const results: StreamBatchResult[] = [];
    const outStream = fs.createWriteStream(path.join(this.incDir, 'cases.jsonl'), { flags: 'a' });
    outStream.on('error', (err) => {
      console.error('StreamProcessor write error:', err);
    });

    let convictionSum = 0;
    let totalCases = this.manifest.totalCases;

    for (let i = 0; i < records.length; i += this.config.chunkSize) {
      const chunk = records.slice(i, i + this.config.chunkSize);
      const normalized: Record<string, unknown>[] = [];

      for (const rec of chunk) {
        const normalizedRec: Record<string, unknown> = { ...rec };
        normalizedRec.jurisdictionId = jurisdictionId;
        normalizedRec.jurisdictionName = jurisdictionName;
        if (normalizedRec.conviction === true) convictionSum++;
        normalized.push(normalizedRec);
      }

      outStream.write(normalized.map(c => JSON.stringify(c)).join('\n') + '\n');
      totalCases += normalized.length;

      if (totalCases - this.manifest.totalCases >= this.config.batchSize) {
        const batch = this.createBatchRecord(
          totalCases - this.manifest.totalCases,
          convictionSum,
          jurisdictionId,
          jurisdictionName
        );
        results.push(batch);
        convictionSum = 0;
      }
    }

    outStream.end();

    const newCases = totalCases - this.manifest.totalCases;
    if (newCases > 0) {
      const batch = this.createBatchRecord(newCases, convictionSum, jurisdictionId, jurisdictionName);
      results.push(batch);
    }

    this.manifest.totalCases = totalCases;
    this.manifest.lastUpdated = new Date().toISOString();
    this.saveManifest();

    return results;
  }

  /** Current manifest. */
  getManifest(): StreamManifest {
    return { ...this.manifest };
  }

  /** Current total cases processed. */
  totalCases(): number {
    return this.manifest.totalCases;
  }

  private loadManifest(): StreamManifest {
    fs.mkdirSync(this.incDir, { recursive: true });
    const manifestPath = path.join(this.incDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as StreamManifest;
      } catch {
        // fall through to default
      }
    }
    return {
      jurisdictionId: 'UNKNOWN',
      jurisdictionName: 'Unknown',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalBatches: 0,
      totalCases: 0,
      batches: [],
    };
  }

  private saveManifest(): void {
    fs.mkdirSync(this.incDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.incDir, 'manifest.json'),
      JSON.stringify(this.manifest, null, 2),
      'utf8'
    );
  }

  private createBatchRecord(
    casesInBatch: number,
    convictionSum: number,
    _jurisdictionId: string,
    _jurisdictionName: string
  ): StreamBatchResult {
    const batchId = `batch_${Date.now()}`;
    const convictionRate = casesInBatch > 0 ? convictionSum / casesInBatch : 0;

    const entry = {
      batchId,
      timestamp: new Date().toISOString(),
      casesInBatch,
      cumulativeCases: this.manifest.totalCases + casesInBatch,
    };

    this.manifest.batches.push(entry);
    this.manifest.totalBatches++;

    return {
      batchId,
      casesInBatch,
      cumulativeCases: entry.cumulativeCases,
      convictionRate,
      sampleRate: 1,
    };
  }
}

/** Convenience factory. */
export function createStreamProcessor(options: StreamProcessorOptions): StreamProcessor {
  return new StreamProcessor(options);
}
