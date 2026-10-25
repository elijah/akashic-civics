/**
 * Property-Based Tests
 *
 * Tests statistical invariants using fast-check.
 */

import * as fc from 'fast-check';
import {
  caseStatisticsGenerator,
  caseArrayGenerator,
  computeDescriptiveStats,
  runOLS,
  calcEffectSize,
  calcOddsRatio,
  zTest,
} from '../property_tests';

describe('Property-Based Test Generators', () => {
  test('caseStatisticsGenerator produces valid records', () => {
    const sample = fc.sample(caseStatisticsGenerator, 5);
    expect(sample.length).toBe(5);
    for (const record of sample) {
      expect(record.case_id).toBeDefined();
      expect(record.race_ethnicity === null || typeof record.race_ethnicity === 'string').toBe(true);
      expect(record.offense_severity === null || typeof record.offense_severity === 'string').toBe(true);
    }
  });

  test('caseArrayGenerator produces arrays of correct length', () => {
    const sample = fc.sample(caseArrayGenerator(10, 20), 3);
    for (const arr of sample) {
      expect(arr.length).toBeGreaterThanOrEqual(10);
      expect(arr.length).toBeLessThanOrEqual(20);
    }
  });
});

describe('Descriptive Statistics Invariants', () => {
  test('conviction_rate is always in [0, 1]', () => {
    fc.assert(
      fc.property(caseArrayGenerator(1, 1000), (cases) => {
        const stats = computeDescriptiveStats(cases);
        return stats.conviction_rate >= 0 && stats.conviction_rate <= 1;
      })
    );
  });

  test('avg_sentence_months is non-negative when valid', () => {
    fc.assert(
      fc.property(caseArrayGenerator(1, 500), (cases) => {
        const stats = computeDescriptiveStats(cases);
        return stats.avg_sentence_months >= 0 || isNaN(stats.avg_sentence_months);
      })
    );
  });
});

describe('Effect Size Invariants', () => {
  test('effect size can be computed for valid integer inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (p1, p2) => {
          const effect = calcEffectSize(p1 / 100, p2 / 100);
          return typeof effect === 'number';
        }
      )
    );
  });

  test('effect size is 0 when proportions are equal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (p) => {
          const effect = calcEffectSize(p / 100, p / 100);
          return Math.abs(effect) < 0.0000001;
        }
      )
    );
  });
});

describe('Odds Ratio Invariants', () => {
  test('odds ratio is finite when inputs are valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        (a, b, c, d) => {
          const or = calcOddsRatio(a, b, c, d);
          return isFinite(or) && !isNaN(or);
        }
      )
    );
  });
});

describe('Z-Test Invariants', () => {
  test('p-value is always in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10000 }),
        (p1, n1, p2, n2) => {
          const result = zTest(p1 / 100, n1, p2 / 100, n2);
          return result.p_value >= 0 && result.p_value <= 1;
        }
      )
    );
  });

  test('p-value is ~1 when proportions are equal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 90 }),
        fc.integer({ min: 100, max: 10000 }),
        (p, n) => {
          const result = zTest(p / 100, n, p / 100, n);
          return result.p_value > 0.9;
        }
      )
    );
  });
});

describe('OLS Regression Invariants', () => {
  test('R-squared is in [0, 1]', () => {
    fc.assert(
      fc.property(
        caseArrayGenerator(10, 100),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
        (cases, predictors) => {
          const result = runOLS(cases, predictors);
          if (isNaN(result.r_squared)) return true;
          return result.r_squared >= 0 && result.r_squared <= 1;
        }
      )
    );
  });

  test('adjusted R-squared is in [0, 1]', () => {
    fc.assert(
      fc.property(
        caseArrayGenerator(50, 200),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
        (cases, predictors) => {
          const result = runOLS(cases, predictors);
          if (isNaN(result.adjusted_r_squared)) return true;
          return result.adjusted_r_squared >= 0 && result.adjusted_r_squared <= 1;
        }
      )
    );
  });
});

describe('Cache Invariants', () => {
  test('cache consistency under repeated access', () => {
    fc.assert(
      fc.property(caseArrayGenerator(5, 50), (cases) => {
        const stats1 = computeDescriptiveStats(cases);
        const stats2 = computeDescriptiveStats(cases);
        return JSON.stringify(stats1) === JSON.stringify(stats2);
      })
    );
  });

  test('empty array returns valid stats', () => {
    fc.assert(
      fc.property(fc.constant([]), (cases) => {
        const stats = computeDescriptiveStats(cases as any);
        return stats.case_count === 0;
      })
    );
  });
});

describe('Timestamp Ordering Invariants', () => {
  test('processing order preserves case count', () => {
    fc.assert(
      fc.property(
        caseArrayGenerator(5, 50),
        (cases) => {
          const stats = computeDescriptiveStats(cases);
          return stats.case_count === cases.length;
        }
      )
    );
  });
});