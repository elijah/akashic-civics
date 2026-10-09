import {
  computeDescriptiveStatistics,
  runOLSRegression,
  calculateEffectSize,
  calculateOddsRatio,
  performTwoProportionZTest,
  getMissingFieldCount,
  getUniqueRaceEthnicities,
  getOffenseSeverityLevels
} from '../statistical_analysis';

describe('Statistical Analysis Module', () => {
  describe('computeDescriptiveStatistics', () => {
    it('should handle empty cases', () => {
      const stats = computeDescriptiveStatistics([]);
      expect(stats.conviction_rate).toBe(0);
      expect(stats.avg_sentence_months).toBe(0);
      expect(stats.missing_rate).toBe(1);
    });

    it('should compute basic statistics correctly', () => {
      const cases = [
        {
          case_id: '1',
          conviction: 1,
          sentence_months: 12,
          days_to_disposition: 60,
          race_ethnicity: 'Black',
          offense_severity: 'high',
          missing_fields: []
        },
        {
          case_id: '2',
          conviction: 0,
          sentence_months: null,
          days_to_disposition: null,
          race_ethnicity: 'White',
          offense_severity: 'low',
          missing_fields: []
        },
        {
          case_id: '3',
          conviction: 1,
          sentence_months: 24,
          days_to_disposition: 90,
          race_ethnicity: 'Black',
          offense_severity: 'high',
          missing_fields: ['sentence_months']
        }
      ];

      const stats = computeDescriptiveStatistics(cases);
      expect(stats.case_count).toBe(3);
      expect(stats.conviction_rate).toBeCloseTo(2/3);
      expect(stats.avg_sentence_months).toBeCloseTo((12 + 24) / 2);
      expect(stats.avg_days_to_disposition).toBeCloseTo((60 + 90) / 2);
      expect(stats.demographic_distribution.Black).toBe(2);
      expect(stats.demographic_distribution.White).toBe(1);
      expect(stats.offense_mix.high).toBe(2);
      expect(stats.offense_mix.low).toBe(1);
      expect(stats.missing_rate).toBeCloseTo(1/3);
    });
  });

  describe('calculateEffectSize', () => {
    it('should calculate effect size correctly', () => {
      expect(calculateEffectSize(0.3, 0.2)).toBeCloseTo(50); // (0.3-0.2)/0.2 * 100 = 50
      expect(calculateEffectSize(0.1, 0.2)).toBeCloseTo(-50); // (0.1-0.2)/0.2 * 100 = -50
      expect(calculateEffectSize(0.2, 0)).toBe(0); // baseline 0 returns 0
    });
  });

  describe('calculateOddsRatio', () => {
    it('should calculate odds ratio correctly', () => {
      // 20/80 vs 10/90 = 0.25 vs 0.111 = 2.25
      expect(calculateOddsRatio(20, 100, 10, 100)).toBeCloseTo(2.25);
      // When baseline is 0, return 0
      expect(calculateOddsRatio(10, 100, 0, 100)).toBe(0);
    });
  });

  describe('performTwoProportionZTest', () => {
    it('should detect significant difference', () => {
      const result = performTwoProportionZTest(0.5, 100, 0.3, 100);
      expect(result.significant).toBe(true);
      expect(result.p_value).toBeLessThan(0.05);
    });

    it('should not detect significant difference when proportions are similar', () => {
      const result = performTwoProportionZTest(0.4, 100, 0.35, 100);
      expect(result.significant).toBe(false);
      expect(result.p_value).toBeGreaterThan(0.05);
    });
  });

  describe('runOLSRegression', () => {
    it('should return a valid regression result', () => {
      const cases = [
        {
          case_id: '1',
          conviction: 1,
          sentence_months: 12,
          days_to_disposition: 60,
          race_ethnicity: 'Black',
          offense_severity: 'high',
          missing_fields: []
        },
        {
          case_id: '2',
          conviction: 0,
          sentence_months: 24,
          days_to_disposition: 90,
          race_ethnicity: 'White',
          offense_severity: 'low',
          missing_fields: []
        }
      ];

      const result = runOLSRegression(cases, []);
      expect(result).toHaveProperty('coefficients');
      expect(result).toHaveProperty('intercept');
      expect(result).toHaveProperty('r_squared');
    });
  });

  describe('Helper functions', () => {
    it('should count missing fields', () => {
      const cases = [
        { missing_fields: ['field1', 'field2'] } as any,
        { missing_fields: ['field1'] } as any,
        { missing_fields: [] } as any
      ];
      expect(getMissingFieldCount(cases)).toBe(3);
    });

    it('should get unique race ethnicities', () => {
      const cases = [
        { race_ethnicity: 'Black' } as any,
        { race_ethnicity: 'White' } as any,
        { race_ethnicity: 'Black' } as any,
        { race_ethnicity: null } as any
      ];
      const races = getUniqueRaceEthnicities(cases);
      expect(races).toContain('Black');
      expect(races).toContain('White');
      expect(races).toHaveLength(2);
    });

    it('should get offense severity levels', () => {
      const cases = [
        { offense_severity: 'high' } as any,
        { offense_severity: 'low' } as any,
        { offense_severity: 'high' } as any,
        { offense_severity: null } as any
      ];
      const levels = getOffenseSeverityLevels(cases);
      expect(levels).toContain('high');
      expect(levels).toContain('low');
      expect(levels).toHaveLength(2);
    });
  });
});