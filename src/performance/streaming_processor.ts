/**
 * Streaming Processor
 *
 * Memory-efficient analysis pipeline for large datasets (1M+ cases).
 * Reads input in bounded chunks, normalizes each chunk, computes
 * incremental statistics, and writes results to disk without loading
 * the full dataset into memory.
 *
 * Enhanced with real-time disparity monitoring and alerting.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface StreamConfig {
  alpha?: number;
  batchSize?: number;
  chunkSize?: number;
  alertThresholds?: AlertThresholds;
  enableDisparityTracking?: boolean;
}

export interface AlertThresholds {
  convictionRateDisparity?: number;   // e.g., 1.5 = 50% higher
  minimumCasesPerGroup?: number;      // minimum cases before alerting
  windowSize?: number;                // rolling window for trend detection
}

export interface DisparityAlert {
  type: 'disparity' | 'trend' | 'volume';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  jurisdictionId: string;
  group?: string;
}

export interface GroupStats {
  group: string;
  cases: number;
  convictions: number;
  convictionRate: number;
  avgSentence?: number;
}

export interface StreamBatchResult {
  batchId: string;
  casesInBatch: number;
  cumulativeCases: number;
  convictionRate: number;
  sampleRate?: number;
  alerts?: DisparityAlert[];
  groupStats?: GroupStats[];
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
    alerts?: number;
  }>;
  groupStats: Record<string, GroupStats>;
}

export interface StreamProcessorOptions {
  rootDir: string;
  config?: StreamConfig;
  alertCallback?: (alert: DisparityAlert) => void;
}

export class StreamProcessor {
  private rootDir: string;
  private config: Required<StreamConfig>;
  private incDir: string;
  private manifest: StreamManifest;
  private alertCallback?: (alert: DisparityAlert) => void;
  private batchGroupStats: Map<string, GroupStats>;

  constructor(options: StreamProcessorOptions) {
    this.rootDir = path.resolve(options.rootDir);
    this.incDir = path.join(this.rootDir, '.akashic', 'streaming');
    this.config = {
      alpha: options.config?.alpha ?? 0.05,
      batchSize: options.config?.batchSize ?? 10000,
      chunkSize: options.config?.chunkSize ?? 5000,
      alertThresholds: options.config?.alertThresholds ?? {},
      enableDisparityTracking: options.config?.enableDisparityTracking ?? true,
    };
    this.alertCallback = options.alertCallback;
    this.batchGroupStats = new Map();

    this.manifest = this.loadManifest();
  }

  /** Process an input file line-by-line in bounded chunks. */
  async processFile(
    inputPath: string,
    jurisdictionId: string = 'UNKNOWN',
    jurisdictionName: string = 'Unknown'
  ): Promise<StreamBatchResult[]> {
    fs.mkdirSync(this.incDir, { recursive: true });
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
    this.batchGroupStats = new Map();

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

      if (this.config.enableDisparityTracking && record.race_ethnicity) {
        this.updateGroupStats(record);
      }

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
    this.batchGroupStats = new Map();

    for (let i = 0; i < records.length; i += this.config.chunkSize) {
      const chunk = records.slice(i, i + this.config.chunkSize);
      const normalized: Record<string, unknown>[] = [];

      for (const rec of chunk) {
        const normalizedRec: Record<string, unknown> = { ...rec };
        normalizedRec.jurisdictionId = jurisdictionId;
        normalizedRec.jurisdictionName = jurisdictionName;
        if (normalizedRec.conviction === true) convictionSum++;
        normalized.push(normalizedRec);

        if (this.config.enableDisparityTracking && rec.race_ethnicity) {
          this.updateGroupStats(rec);
        }
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

  /** Get current group-level statistics. */
  getGroupStats(): GroupStats[] {
    return Array.from(this.batchGroupStats.values());
  }

  /** Get cumulative group statistics from manifest. */
  getCumulativeGroupStats(): GroupStats[] {
    return Array.from(Object.values(this.manifest.groupStats));
  }

  private loadManifest(): StreamManifest {
    fs.mkdirSync(this.incDir, { recursive: true });
    const manifestPath = path.join(this.incDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Partial<StreamManifest>;
        return {
          jurisdictionId: loaded.jurisdictionId ?? 'UNKNOWN',
          jurisdictionName: loaded.jurisdictionName ?? 'Unknown',
          createdAt: loaded.createdAt ?? new Date().toISOString(),
          lastUpdated: loaded.lastUpdated ?? new Date().toISOString(),
          totalBatches: loaded.totalBatches ?? 0,
          totalCases: loaded.totalCases ?? 0,
          batches: loaded.batches ?? [],
          groupStats: loaded.groupStats ?? {},
        };
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
      groupStats: {},
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

  private updateGroupStats(record: Record<string, unknown>): void {
    const group = String(record.race_ethnicity || 'Unknown');
    let stats = this.batchGroupStats.get(group);

    if (!stats) {
      stats = { group, cases: 0, convictions: 0, convictionRate: 0 };
      this.batchGroupStats.set(group, stats);
    }

    stats.cases++;
    if (record.conviction === true) stats.convictions++;
    stats.convictionRate = stats.convictions / stats.cases;
  }

  private checkAlerts(
    batchStats: GroupStats[],
    _cumulativeStats: GroupStats[],
    jurisdictionId: string
  ): DisparityAlert[] {
    const alerts: DisparityAlert[] = [];
    const thresholds = this.config.alertThresholds;
    const now = new Date().toISOString();

    // Conviction rate disparity between groups
    if (thresholds.convictionRateDisparity &&
        batchStats.length >= 2) {
      const rates = new Map<string, number>();
      for (const s of batchStats) {
        rates.set(s.group, s.convictionRate);
      }

      const sorted = Array.from(rates.entries()).sort((a, b) => b[1] - a[1]);
      const maxRate = sorted[0][1];
      const minRate = sorted[sorted.length - 1][1];

      if (minRate > 0 && maxRate / minRate >= thresholds.convictionRateDisparity) {
        const alert: DisparityAlert = {
          type: 'disparity',
          severity: maxRate / minRate >= (thresholds.convictionRateDisparity * 1.5) ? 'critical' : 'warning',
          message: `Conviction rate disparity detected: ${sorted[0][0]} (${maxRate.toFixed(3)}) vs ${sorted[sorted.length - 1][0]} (${minRate.toFixed(3)})`,
          metric: 'conviction_rate_ratio',
          value: maxRate / minRate,
          threshold: thresholds.convictionRateDisparity,
          timestamp: now,
          jurisdictionId,
          group: sorted[0][0],
        };
        alerts.push(alert);
        if (this.alertCallback) this.alertCallback(alert);
      }
    }

    // Minimum cases per group check
    if (thresholds.minimumCasesPerGroup) {
      for (const s of batchStats) {
        if (s.cases < thresholds.minimumCasesPerGroup && s.cases > 0) {
          const alert: DisparityAlert = {
            type: 'volume',
            severity: 'info',
            message: `Low case volume for group ${s.group}: ${s.cases} cases (minimum ${thresholds.minimumCasesPerGroup})`,
            metric: 'case_count',
            value: s.cases,
            threshold: thresholds.minimumCasesPerGroup,
            timestamp: now,
            jurisdictionId,
            group: s.group,
          };
          alerts.push(alert);
          if (this.alertCallback) this.alertCallback(alert);
        }
      }
    }

    return alerts;
  }

  private createBatchRecord(
    casesInBatch: number,
    convictionSum: number,
    jurisdictionId: string,
    _jurisdictionName: string
  ): StreamBatchResult {
    const batchId = `batch_${Date.now()}`;
    const convictionRate = casesInBatch > 0 ? convictionSum / casesInBatch : 0;

    const entry = {
      batchId,
      timestamp: new Date().toISOString(),
      casesInBatch,
      cumulativeCases: this.manifest.totalCases + casesInBatch,
      alerts: 0,
    };

    // Capture current batch stats for alerts and return BEFORE clearing
    const batchGroupStats = Array.from(this.batchGroupStats.values());

    // Merge cumulative group stats into manifest
    if (this.config.enableDisparityTracking) {
      for (const s of this.batchGroupStats.values()) {
        const existing = this.manifest.groupStats[s.group];
        if (existing) {
          existing.cases += s.cases;
          existing.convictions += s.convictions;
          existing.convictionRate = existing.convictions / existing.cases;
          if (s.avgSentence !== undefined) {
            existing.avgSentence = s.avgSentence;
          }
        } else {
          this.manifest.groupStats[s.group] = { ...s };
        }
      }
      this.batchGroupStats.clear();
    }

    // Check for disparity alerts using cumulative stats
    const alerts = this.checkAlerts(
      batchGroupStats,
      Array.from(Object.values(this.manifest.groupStats)),
      jurisdictionId
    );
    entry.alerts = alerts.length;

    this.manifest.batches.push(entry);
    this.manifest.totalBatches++;

    return {
      batchId,
      casesInBatch,
      cumulativeCases: entry.cumulativeCases,
      convictionRate,
      sampleRate: 1,
      alerts,
      groupStats: batchGroupStats,
    };
  }
}

/** Convenience factory. */
export function createStreamProcessor(options: StreamProcessorOptions): StreamProcessor {
  return new StreamProcessor(options);
}
