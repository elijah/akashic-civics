/**
 * Benchmark Framework Tests
 */

import {
  loadStateBenchmarks,
  computeJurisdictionBenchmark,
  generateBenchmarkAnalysis,
} from '../benchmark_framework';

describe('BenchmarkFramework: loadStateBenchmarks', () => {
  it('should return array of state benchmarks', () => {
    const benchmarks = loadStateBenchmarks();
    expect(Array.isArray(benchmarks)).toBe(true);
    expect(benchmarks.length).toBeGreaterThan(0);
    expect(benchmarks[0]).toHaveProperty('stateId');
    expect(benchmarks[0]).toHaveProperty('stateName');
    expect(benchmarks[0]).toHaveProperty('overallConvictionRate');
  });

  it('should have US national benchmark', () => {
    const benchmarks = loadStateBenchmarks();
    const us = benchmarks.find(b => b.stateId === 'US');
    expect(us).toBeDefined();
    expect(us!.stateName).toBe('United States');
  });
});

describe('BenchmarkFramework: computeJurisdictionBenchmark', () => {
  const stateBenchmarks = loadStateBenchmarks();

  it('should compute jurisdiction benchmark with state comparison', () => {
    const result = computeJurisdictionBenchmark(
      'TX-001',
      'Test County',
      0.70,
      { Black: 0.78, White: 0.62, Hispanic: 0.65 },
      { Black: 0.25, White: 0.60, Hispanic: 0.15 },
      1000,
      stateBenchmarks
    );

    expect(result.jurisdictionId).toBe('TX-001');
    expect(result.jurisdictionName).toBe('Test County');
    expect(result.convictionRate).toBe(0.70);
    expect(result.percentileRank).toBeGreaterThanOrEqual(0);
    expect(result.percentileRank).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.similarJurisdictions)).toBe(true);
    expect(result.similarJurisdictions.length).toBeGreaterThan(0);
  });

  it('should compute similar jurisdictions with similarity scores', () => {
    const result = computeJurisdictionBenchmark(
      'TX-002',
      'Another County',
      0.65,
      { Black: 0.70, White: 0.60 },
      { Black: 0.20, White: 0.80 },
      500,
      stateBenchmarks
    );

    result.similarJurisdictions.forEach(sj => {
      expect(sj.similarityScore).toBeGreaterThanOrEqual(0);
      expect(sj.similarityScore).toBeLessThanOrEqual(1);
      expect(sj.jurisdictionId).toBeDefined();
      expect(sj.jurisdictionName).toBeDefined();
    });
  });

  it('should handle single race group', () => {
    const result = computeJurisdictionBenchmark(
      'TX-003',
      'Single Race County',
      0.75,
      { Black: 0.80 },
      { Black: 1.0 },
      100,
      stateBenchmarks
    );

    expect(result.percentileRank).toBeGreaterThanOrEqual(0);
    expect(result.percentileRank).toBeLessThanOrEqual(100);
  });
});

describe('BenchmarkFramework: generateBenchmarkAnalysis', () => {
  it('should produce analysis with recommendations', () => {
    const result = generateBenchmarkAnalysis(
      'TX-004',
      'High Disparity County',
      0.80,
      { Black: 0.90, White: 0.65 },
      { Black: 0.30, White: 0.70 },
      800
    );

    expect(result.jurisdictionBenchmark).toBeDefined();
    expect(result.stateBenchmark).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should flag high percentile jurisdictions', () => {
    const result = generateBenchmarkAnalysis(
      'TX-005',
      'Very High Disparity County',
      0.95,
      { Black: 0.99, White: 0.60 },
      { Black: 0.50, White: 0.50 },
      500
    );

    const highPercentileRec = result.recommendations.find(r =>
      r.includes('percentile')
    );
    expect(highPercentileRec).toBeDefined();
  });
});