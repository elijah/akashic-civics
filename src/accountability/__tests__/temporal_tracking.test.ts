/* ============================================================================
 * Temporal Tracking Tests
 * ============================================================================ */

import {
  computeRollingStats,
  computeEMA,
  theilSenSlope,
  mannKendallTest,
  detectTrend,
  decomposeSeasonal,
  buildOfficerTemporalProfile,
  TimeSeriesPoint,
  RollingStats,
  TrendResult,
  SeasonalDecomposition,
  OfficerTemporalProfile,
} from '../temporal_tracking';

function series(values: number[], prefix = '2023-Q'): TimeSeriesPoint[] {
  return values.map((value, i) => ({ period: `${prefix}${i + 1}`, value }));
}

describe('TemporalTracking: computeRollingStats', () => {
  it('should return empty when series is shorter than window', () => {
    const result = computeRollingStats(series([1, 2]), 4);
    expect(result).toEqual([]);
  });

  it('should compute rolling mean and stddev', () => {
    const result = computeRollingStats(series([1, 2, 3, 4, 5]), 3);

    expect(result).toHaveLength(3);
    expect(result[0].period).toBe('2023-Q3');
    expect(result[0].mean).toBeCloseTo(2, 10);
    expect(result[0].count).toBe(3);
    expect(result[0].stdDev).toBeCloseTo(Math.sqrt(2 / 3), 10);
  });

  it('should produce confidence interval containing the mean', () => {
    const result = computeRollingStats(series([1, 2, 3, 4, 5]), 3);

    result.forEach(r => {
      expect(r.ciLower).toBeLessThan(r.mean);
      expect(r.ciUpper).toBeGreaterThan(r.mean);
    });
  });

  it('should support weighted series', () => {
    const weighted: TimeSeriesPoint[] = [
      { period: 1, value: 10, weight: 3 },
      { period: 2, value: 20, weight: 1 },
      { period: 3, value: 30, weight: 1 },
    ];

    const result = computeRollingStats(weighted, 3);
    // Weighted mean = (10*3 + 20*1 + 30*1) / 5 = 16
    expect(result[0].mean).toBeCloseTo(16, 10);
  });
});

describe('TemporalTracking: computeEMA', () => {
  it('should return empty for empty series', () => {
    expect(computeEMA([])).toEqual([]);
  });

  it('should smooth the series', () => {
    const result = computeEMA(series([10, 20, 30]), 0.5);

    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(10);
    expect(result[1].value).toBeCloseTo(15, 10);
    expect(result[2].value).toBeCloseTo(22.5, 10);
  });

  it('should reduce variance for a noisy series', () => {
    const noisy = series([10, 20, 10, 20, 10]);
    const smoothed = computeEMA(noisy, 0.3);

    const range = (arr: TimeSeriesPoint[]) => {
      const vals = arr.map(p => p.value);
      return Math.max(...vals) - Math.min(...vals);
    };

    expect(range(smoothed)).toBeLessThan(range(noisy));
  });
});

describe('TemporalTracking: theilSenSlope', () => {
  it('should return zero slope for single point', () => {
    const result = theilSenSlope(series([5]));
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(5);
  });

  it('should detect positive trend', () => {
    const result = theilSenSlope(series([1, 2, 3, 4, 5]));
    expect(result.slope).toBeCloseTo(1, 10);
  });

  it('should detect negative trend', () => {
    const result = theilSenSlope(series([5, 4, 3, 2, 1]));
    expect(result.slope).toBeCloseTo(-1, 10);
  });

  it('should be robust to outliers', () => {
    const withOutlier = series([1, 2, 3, 4, 100]);
    const result = theilSenSlope(withOutlier);
    // Median-of-slopes should not be dominated by the outlier
    expect(result.slope).toBeLessThan(20);
  });
});

describe('TemporalTracking: mannKendallTest', () => {
  it('should return no trend for short series', () => {
    const result = mannKendallTest(series([1, 2]));
    expect(result.tau).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.direction).toBe('no trend');
  });

  it('should detect increasing trend', () => {
    const result = mannKendallTest(series([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(result.direction).toBe('increasing');
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.S).toBeGreaterThan(0);
  });

  it('should detect decreasing trend', () => {
    const result = mannKendallTest(series([8, 7, 6, 5, 4, 3, 2, 1]));
    expect(result.direction).toBe('decreasing');
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('should return tau of 1 for perfectly monotonic series', () => {
    const result = mannKendallTest(series([1, 2, 3, 4, 5, 6]));
    expect(result.tau).toBeCloseTo(1, 10);
  });
});

describe('TemporalTracking: detectTrend', () => {
  it('should return stable for short series', () => {
    const result = detectTrend(series([1, 2]), { method: 'theil-sen' });
    expect(result.direction).toBe('stable');
    expect(result.pValue).toBe(1);
    expect(result.confidence).toBe(0);
  });

  it('should detect worsening trend with theil-sen', () => {
    const result = detectTrend(series([1, 2, 3, 4, 5, 6, 7, 8]), { method: 'theil-sen' });
    expect(result.slope).toBeGreaterThan(0);
    expect(result.direction).toBe('worsening');
    expect(result.method).toBe('theil-sen');
  });

  it('should support ols method', () => {
    const result = detectTrend(series([1, 2, 3, 4, 5, 6]), { method: 'ols' });
    expect(result.slope).toBeCloseTo(1, 6);
    expect(result.rSquared).toBeCloseTo(1, 6);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('should support mann-kendall method', () => {
    const result = detectTrend(series([1, 2, 3, 4, 5, 6, 7, 8]), { method: 'mann-kendall' });
    expect(result.method).toBe('mann-kendall');
    expect(result.direction).toBe('worsening');
  });

  it('should report stable for flat series', () => {
    const result = detectTrend(series([5, 5, 5, 5, 5, 5]), { method: 'ols' });
    expect(result.direction).toBe('stable');
  });
});

describe('TemporalTracking: decomposeSeasonal', () => {
  it('should return empty decomposition for short series', () => {
    const result = decomposeSeasonal(series([1, 2, 3]), 4);
    expect(result.trend).toEqual([]);
    expect(result.seasonal).toEqual([]);
    expect(result.residual).toEqual([]);
  });

  it('should decompose a seasonal series', () => {
    const values = [10, 20, 10, 20, 12, 22, 14, 24, 11, 21, 13, 23];
    const result = decomposeSeasonal(series(values), 4);

    expect(result.trend.length).toBe(values.length);
    expect(result.seasonal.length).toBe(values.length);
    expect(result.residual.length).toBe(values.length);
    expect(result.seasonalStrength).toBeGreaterThanOrEqual(0);
    expect(result.seasonalStrength).toBeLessThanOrEqual(1);
  });

  it('should detect seasonality in a strongly seasonal series', () => {
    const values = [10, 20, 10, 20, 10, 20, 10, 20, 10, 20, 10, 20];
    const result = decomposeSeasonal(series(values), 4);
    expect(result.seasonalStrength).toBeGreaterThan(0.5);
  });
});

describe('TemporalTracking: buildOfficerTemporalProfile', () => {
  it('should build a complete profile', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const profile: OfficerTemporalProfile = buildOfficerTemporalProfile(
      'officer-001',
      'Test Judge',
      'disparity_score',
      series(values),
      { rollingWindow: 4, trendMethod: 'theil-sen', seasonalPeriod: 4 }
    );

    expect(profile.officialId).toBe('officer-001');
    expect(profile.officialName).toBe('Test Judge');
    expect(profile.metric).toBe('disparity_score');
    expect(profile.timeSeries).toHaveLength(12);
    expect(profile.rolling.length).toBeGreaterThan(0);
    expect(profile.trend.direction).toBeDefined();
    expect(profile.seasonal).toBeDefined();
  });

  it('should expose typed rolling stats and trend result', () => {
    const profile = buildOfficerTemporalProfile(
      'officer-003',
      'Test Judge',
      'conviction_rate',
      series([1, 2, 3, 4, 5, 6]),
      { rollingWindow: 3, trendMethod: 'ols', seasonalPeriod: 4 }
    );

    const rolling: RollingStats[] = profile.rolling;
    const trend: TrendResult = profile.trend;
    const seasonal: SeasonalDecomposition | undefined = profile.seasonal;

    expect(rolling[0]).toHaveProperty('mean');
    expect(trend).toHaveProperty('pValue');
    expect(seasonal).toBeUndefined();
  });

  it('should omit seasonal decomposition when series is too short', () => {
    const profile = buildOfficerTemporalProfile(
      'officer-002',
      'Test Judge',
      'conviction_rate',
      series([1, 2, 3]),
      { rollingWindow: 2, seasonalPeriod: 4 }
    );

    expect(profile.seasonal).toBeUndefined();
  });
});