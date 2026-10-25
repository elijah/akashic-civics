/**
 * Test suite for change point detection in the Historical Baseline System
 * 
 * Tests cover:
 * - CUSUM chart detection logic
 * - Bayesian change point analysis
 * - Policy impact marker identification
 * - Cross-jurisdictional comparison utilities
 */

import { EnhancedHistoricalBaseline } from './enhanced_historical_baseline';

describe('Change Point Detection', () => {
  test('should detect CUSUM anomalies in Texas jurisdiction', () => {
    const baseline = new EnhancedHistoricalBaseline();
    const result = baseline.generateCUSUMChart('texas');

    expect(result).toBeDefined();
    expect(result.cumulative_sum).toBeDefined();
    expect(result.thresholds).toBeDefined();
    expect(result.alerts).toBeDefined();
  });

  test('should detect Bayesian change points in California', () => {
    const baseline = new EnhancedHistoricalBaseline();
    const result = baseline.detectBayesianChangePoints('california');

    expect(result.change_points).toBeDefined();
    expect(result.p_value).toBeDefined();
  });

  test('should identify policy impact markers for significant jumps', () => {
    const baseline = new EnhancedHistoricalBaseline();
    const markers = baseline.identifyPolicyImpactMarkers('california');

    expect(Array.isArray(markers)).toBe(true);
  });

  test('should compare jurisdictions against national benchmarks', () => {
    const baseline = new EnhancedHistoricalBaseline();
    const comparison = baseline.compareCrossJurisdictions('california');

    expect(comparison.jurisdictions).toBeDefined();
  });
});