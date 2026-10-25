/**
 * Benchmark Tests
 */

import { runBenchmarksInJest, AnalysisBenchmarkSuite } from '../benchmark_suite';

describe('Performance Benchmarks', () => {
  runBenchmarksInJest();
});

describe('Benchmark Result Verification', () => {
  test('Benchmark results are recorded correctly', () => {
    const suite = new AnalysisBenchmarkSuite();
    const result = suite.runZTest(50);

    expect(result.name).toContain('z_test');
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.meanTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  test('Descriptive statistics benchmark scales with size', () => {
    const suite = new AnalysisBenchmarkSuite();
    const results = suite.runDescriptiveStats([100, 500, 1000]);

    expect(results.size).toBe(3);
    for (const [size, result] of results) {
      expect(result.meanTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.name).toContain(`descriptive_stats_n${size}`);
    }
  });

  test('OLS regression benchmark completes within bounds', () => {
    const suite = new AnalysisBenchmarkSuite();
    const results = suite.runOLSRegression([100, 500]);

    expect(results.size).toBe(2);
    for (const [, result] of results) {
      expect(result.meanTimeMs).toBeLessThan(50); // Should be fast for small datasets
    }
  });
});