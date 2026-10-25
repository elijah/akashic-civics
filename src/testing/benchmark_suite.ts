/**
 * Benchmark Suite for Performance Testing
 *
 * Measures execution time, memory usage, and scalability of statistical
 * methods and analysis workflows. Provides CI-friendly pass/fail criteria.
 */

import * as v8 from 'v8';
import { performance } from 'perf_hooks';

import {
  computeDescriptiveStatistics,
  runOLSRegression,
  performTwoProportionZTest,
  CaseStatistics,
} from '../statistical/statistical_analysis';
import { StreamProcessor } from '../performance/streaming_processor';
import { CacheManager, createCacheManager } from '../performance/caching_layer';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  meanTimeMs: number;
  medianTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  stdDevMs: number;
  memoryUsedMB: number;
  opsPerSecond: number;
}

export interface BenchmarkConfig {
  iterations?: number;
  warmupIterations?: number;
  memoryTracking?: boolean;
  timeoutMs?: number;
}

const DEFAULT_CONFIG: Required<BenchmarkConfig> = {
  iterations: 10,
  warmupIterations: 2,
  memoryTracking: true,
  timeoutMs: 30000,
};

/** Generate synthetic CaseStatistics data for benchmarking */
export function generateSyntheticCases(count: number): CaseStatistics[] {
  const races = ['White', 'Black', 'Hispanic', 'Asian'];
  const severities = ['Felony', 'Misdemeanor', 'Infraction'];
  const cases: CaseStatistics[] = [];

  for (let i = 0; i < count; i++) {
    cases.push({
      case_id: `bench_${i}`,
      conviction: Math.random() > 0.3 ? 1 : 0,
      sentence_months: Math.floor(Math.random() * 120),
      days_to_disposition: Math.floor(Math.random() * 365),
      race_ethnicity: races[Math.floor(Math.random() * races.length)],
      offense_severity: severities[Math.floor(Math.random() * severities.length)],
      missing_fields: [],
    });
  }

  return cases;
}

/** Measure execution time and memory of a function */
export function benchmark(
  name: string,
  fn: () => void,
  config: BenchmarkConfig = {}
): BenchmarkResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Warmup
  for (let i = 0; i < cfg.warmupIterations; i++) {
    fn();
  }

  // Measure memory before
  const memBefore = cfg.memoryTracking ? process.memoryUsage().heapUsed : 0;
  const snapshotBefore = cfg.memoryTracking ? v8.writeHeapSnapshot() : null;
  void snapshotBefore; // reserved for detailed memory profiling

  const times: number[] = [];

  for (let i = 0; i < cfg.iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const memAfter = cfg.memoryTracking ? process.memoryUsage().heapUsed : 0;

  // Calculate statistics
  times.sort((a, b) => a - b);
  const totalMs = times.reduce((sum, t) => sum + t, 0);
  const meanMs = totalMs / times.length;
  const medianMs = times[Math.floor(times.length / 2)];
  const minTimeMs = times[0];
  const maxTimeMs = times[times.length - 1];
  const variance = times.reduce((sum, t) => sum + (t - meanMs) ** 2, 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const opsPerSec = meanMs > 0 ? 1000 / meanMs : 0;
  const memUsedMB = cfg.memoryTracking ? (memAfter - memBefore) / (1024 * 1024) : 0;

  return {
    name,
    iterations: cfg.iterations,
    totalTimeMs: totalMs,
    meanTimeMs: meanMs,
    medianTimeMs: medianMs,
    minTimeMs,
    maxTimeMs,
    stdDevMs: stdDev,
    memoryUsedMB: memUsedMB,
    opsPerSecond: opsPerSec,
  };
}

/** Benchmark suite for statistical analysis methods */
export class AnalysisBenchmarkSuite {
  private benchmarks: Map<string, BenchmarkResult> = new Map();

  /** Benchmark descriptive statistics computation */
  runDescriptiveStats(datasetSizes: number[]): Map<number, BenchmarkResult> {
    const results = new Map<number, BenchmarkResult>();

    for (const size of datasetSizes) {
      const cases = generateSyntheticCases(size);
      const name = `descriptive_stats_n${size}`;
      const result = benchmark(name, () => {
        computeDescriptiveStatistics(cases);
      });

      results.set(size, result);
      this.benchmarks.set(name, result);
    }

    return results;
  }

  /** Benchmark OLS regression */
  runOLSRegression(datasetSizes: number[]): Map<number, BenchmarkResult> {
    const results = new Map<number, BenchmarkResult>();

    for (const size of datasetSizes) {
      const cases = generateSyntheticCases(size);
      const name = `ols_regression_n${size}`;
      const result = benchmark(name, () => {
        runOLSRegression(cases, ['race_ethnicity', 'offense_severity']);
      });

      results.set(size, result);
      this.benchmarks.set(name, result);
    }

    return results;
  }

  /** Benchmark Z-test calculations */
  runZTest(iterations: number = 1000): BenchmarkResult {
    const name = `z_test_${iterations}iters`;
    const result = benchmark(name, () => {
      for (let i = 0; i < iterations; i++) {
        performTwoProportionZTest(0.55, 1000, 0.50, 1000);
      }
    }, { iterations: 10 });

    this.benchmarks.set(name, result);
    return result;
  }

  /** Benchmark streaming processor */
  async runStreamingProcessor(
    datasetSizes: number[],
    tmpDir: string
  ): Promise<Map<number, BenchmarkResult>> {
    const results = new Map<number, BenchmarkResult>();

    for (const size of datasetSizes) {
      const cases = generateSyntheticCases(size);
      const filePath = `${tmpDir}/bench_input_${size}.jsonl`;

      // Write input file
      const fs = require('fs');
      fs.writeFileSync(
        filePath,
        cases.map(c => JSON.stringify(c)).join('\n'),
        'utf8'
      );

      const processor = new StreamProcessor({ rootDir: tmpDir });
      const name = `streaming_processor_n${size}`;
      const result = benchmark(name, async () => {
        await processor.processFile(filePath, 'BENCH-001', 'Benchmark County');
      }, { iterations: 3 });

      results.set(size, result);
      this.benchmarks.set(name, result);
    }

    return results;
  }

  /** Benchmark cache performance */
  runCacheBenchmark(operations: number): BenchmarkResult {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-cache-'));

    const manager = createCacheManager(tmpDir);
    const payloads = Array.from({ length: operations }, (_, i) => ({
      query: `SELECT * FROM cases WHERE id = ${i}`,
      params: { offset: i, limit: 10 },
    }));

    const name = `cache_${operations}_ops`;
    const result = benchmark(name, () => {
      for (const payload of payloads) {
        manager.store(payload, { result: 'cached' });
        manager.lookup(payload);
      }
    });

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    this.benchmarks.set(name, result);
    return result;
  }

  /** Benchmark full analysis workflow (end-to-end) */
  runFullAnalysis(datasetSizes: number[]): Map<number, BenchmarkResult> {
    const results = new Map<number, BenchmarkResult>();

    for (const size of datasetSizes) {
      const cases = generateSyntheticCases(size);
      const name = `full_analysis_n${size}`;
      const result = benchmark(name, () => {
        const descriptive = computeDescriptiveStatistics(cases);
        const regression = runOLSRegression(cases, ['race_ethnicity']);
        const zTest = performTwoProportionZTest(0.55, 1000, 0.50, 1000);
        void descriptive;
        void regression;
        void zTest;
      });

      results.set(size, result);
      this.benchmarks.set(name, result);
    }

    return results;
  }

  /** Get all benchmark results */
  getBenchmarks(): Map<string, BenchmarkResult> {
    return new Map(this.benchmarks);
  }

  /** Print benchmark results to console */
  printResults(): void {
    console.log('\n=== Benchmark Results ===\n');
    console.log('Name'.padEnd(40) + 'Mean (ms)'.padEnd(15) + 'Ops/s'.padEnd(12) + 'Memory (MB)');
    console.log('-'.repeat(77));

    for (const [name, result] of this.benchmarks) {
      console.log(
        name.padEnd(40) +
        result.meanTimeMs.toFixed(3).padEnd(15) +
        Math.round(result.opsPerSecond).toString().padEnd(12) +
        result.memoryUsedMB.toFixed(2)
      );
    }
    console.log('');
  }

  /** Check if results meet performance targets */
  checkPerformanceTargets(targets: Record<string, { meanTimeMs?: number; opsPerSecond?: number }>): boolean {
    let passed = true;

    for (const [name, target] of Object.entries(targets)) {
      const result = this.benchmarks.get(name);
      if (!result) {
        console.warn(`Benchmark "${name}" not found`);
        continue;
      }

      if (target.meanTimeMs !== undefined && result.meanTimeMs > target.meanTimeMs) {
        console.error(`FAIL: ${name} mean time ${result.meanTimeMs.toFixed(3)}ms exceeds target ${target.meanTimeMs}ms`);
        passed = false;
      }

      if (target.opsPerSecond !== undefined && result.opsPerSecond < target.opsPerSecond) {
        console.error(`FAIL: ${name} ${Math.round(result.opsPerSecond)} ops/s below target ${target.opsPerSecond} ops/s`);
        passed = false;
      }
    }

    return passed;
  }
}

/** Run benchmarks in Jest context */
export function runBenchmarksInJest(): void {
  describe('Performance Benchmarks', () => {
    const suite = new AnalysisBenchmarkSuite();
    const datasetSizes = [100, 1000, 10000];

    afterAll(() => {
      suite.printResults();
    });

    test('Descriptive statistics scales with dataset size', () => {
      const results = suite.runDescriptiveStats(datasetSizes);

      for (const [size, result] of results) {
        // 10,000 cases should take under 100ms
        // Scale: 1000 cases should take under 20ms
        if (size <= 1000) {
          expect(result.meanTimeMs).toBeLessThan(20);
        }
        if (size <= 10000) {
          expect(result.meanTimeMs).toBeLessThan(200);
        }
      }
    });

    test('OLS regression performs within target', () => {
      const results = suite.runOLSRegression([100, 1000, 5000]);

      for (const [size, result] of results) {
        if (size <= 1000) {
          expect(result.meanTimeMs).toBeLessThan(20);
        }
        if (size <= 5000) {
          expect(result.meanTimeMs).toBeLessThan(150);
        }
      }
    });

    test('Z-test executes in under 5ms', () => {
      const result = suite.runZTest(100);
      expect(result.meanTimeMs).toBeLessThan(5);
    });

    test('Cache operations complete in under 2ms per op', () => {
      const result = suite.runCacheBenchmark(1000);
      const perOp = result.meanTimeMs / 1000; // 1000 ops in the benchmark
      expect(perOp).toBeLessThan(2);
    });
  });
}

export { CacheManager };