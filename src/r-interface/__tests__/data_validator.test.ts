/**
 * Test suite for Data Validator
 */

import { DataValidator } from '../data_validator';
import { LegalJusticeCase } from '../../normalization/legal_justice_schema';

const mockCases: LegalJusticeCase[] = [
  {
    id: 'case_1',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-01-01',
    disposition_date: '2023-06-01',
    days_to_disposition: 150,
    race_ethnicity: 'Black',
    gender: 'Male',
    age_at_arrest: 30,
    offense_severity: 'felony_2',
    charge_type: 'felony',
    prior_record: 2,
    attorney_type: 'public_defender',
    conviction: 1,
    outcome_category: 'conviction',
    sentence_months: 24
  },
  {
    id: 'case_2',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-02-01',
    disposition_date: '2023-07-01',
    days_to_disposition: 150,
    race_ethnicity: 'White',
    gender: 'Female',
    age_at_arrest: 25,
    offense_severity: 'felony_1',
    charge_type: 'felony',
    prior_record: 0,
    attorney_type: 'private',
    conviction: 0,
    outcome_category: 'dismissal',
    sentence_months: 0
  }
];

describe('DataValidator', () => {
  const validator = new DataValidator({
    minCases: 10,
    maxMissingRate: 0.5,
    requiredFields: ['id', 'jurisdiction_id'],
    warnOnSmallSample: true,
    warnOnHighMissing: true
  });

  // Helper: create 15 cases with some fields set to undefined
  const createCasesWithMissing = (overrides: Partial<LegalJusticeCase> = {}): LegalJusticeCase[] => {
    const base = Array(15).fill(mockCases[0]).map((c, i) => ({ ...c, id: `case_${i}` } as LegalJusticeCase));
    return base.map(c => ({ ...c, ...overrides } as LegalJusticeCase));
  };

  describe('validate - empty cases', () => {
    test('returns invalid with abort action', () => {
      const result = validator.validate([], []);
      
      expect(result.valid).toBe(false);
      expect(result.recommendedAction).toBe('abort');
      expect(result.issues.some(i => i.severity === 'error')).toBe(true);
    });
  });

  describe('validate - minimum case count', () => {
    test('aborts with 1 case (below minCases default 10)', () => {
      const result = validator.validate([mockCases[0]], []);
      
      expect(result.valid).toBe(false);
      expect(result.recommendedAction).toBe('abort');
      expect(result.issues.some(i => i.severity === 'error' && i.field === 'sample_size')).toBe(true);
    });

    test('allows with 15 cases (above minCases default 10)', () => {
      const manyCases = Array(15).fill(mockCases[0]);
      const result = validator.validate(manyCases, []);
      
      expect(result.valid).toBe(true);
      expect(result.recommendedAction).toBe('proceed');
    });
  });

  describe('validate - required fields', () => {
    test('detects missing ID', () => {
      const casesWithoutId = [
        { ...mockCases[0], id: undefined as any },
        mockCases[1]
      ];
      const result = validator.validate(casesWithoutId, []);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field === 'id' && i.severity === 'error')).toBe(true);
    });

    test('detects missing required fields', () => {
      const casesMissingField = [
        { ...mockCases[0], jurisdiction_id: undefined as any },
        mockCases[1]
      ];
      const result = validator.validate(casesMissingField, []);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field === 'jurisdiction_id')).toBe(true);
    });
  });

  describe('validate - missing rate', () => {
    test('warns on high missing rate (>50%) triggers impute', () => {
      // 15 cases, set race_ethnicity missing in 11 cases, gender in 5, age in 5
      // The validator counts total missing cells across all required vars
      // totalCells = 15 cases * 3 required vars = 45
      // missing: race_ethnicity(11) + gender(5 added cases beyond race) + age(5 added cases) = 21 unique
      // But the code counts each field separately, so it's 11+5+5=21 missing cells / 45 = 46.7%
      // Hmm, let me use the actual mechanism: the code iterates over requiredVarsList and counts
      // fieldMissingCounts[field] for each field, then sums them.
      //
      // Actually looking at the code more carefully: totalMissingCells = sum of all fieldMissingCounts values
      // fieldMissingCounts is built per-field. So if race_ethnicity missing in 11 cases, gender in 5 cases, age in 5 cases,
      // totalMissingCells = 11 + 5 + 5 = 21. missingRate = 21/45 = 46.7%
      // To get >50%: need >23 missing cells total
      
      // Simple approach: make ALL 3 vars missing in ALL 15 cases = 45/45 = 100%
      // But then we'd abort, not impute. Let me do 14/15 cases with 2 vars missing = 30/45 = 66.7%
      const fourteenMissing = createCasesWithMissing({
        race_ethnicity: undefined as any,
        gender: undefined as any
      });
      // Set gender/age missing in 14 of 15 cases
      fourteenMissing[0].gender = mockCases[0].gender;
      fourteenMissing[0].age_at_arrest = mockCases[0].age_at_arrest;
      for (let i = 1; i < 15; i++) {
        fourteenMissing[i].race_ethnicity = undefined as any;
        fourteenMissing[i].gender = undefined as any;
      }
      const result = validator.validate(fourteenMissing, ['race_ethnicity', 'gender', 'age_at_arrest']);
      
      // 14 cases * 3 vars = 42 missing / 45 total = 66.7% > 50% → impute
      expect(result.recommendedAction).toBe('impute');
      expect(result.issues.some(i => i.field === 'data_completeness' && i.severity === 'warning')).toBe(true);
    });

    test('aborts on very high missing rate (>80%)', () => {
      // 13 cases with all 3 vars missing = 39/45 = 86.7% > 80% → abort
      const thirteenMissing = createCasesWithMissing({
        race_ethnicity: undefined as any,
        gender: undefined as any,
        age_at_arrest: undefined as any
      });
      // Set only first 13 cases to have missing vars, last 2 have all fields
      for (let i = 13; i < 15; i++) {
        thirteenMissing[i].race_ethnicity = mockCases[0].race_ethnicity;
        thirteenMissing[i].gender = mockCases[0].gender;
        thirteenMissing[i].age_at_arrest = mockCases[0].age_at_arrest;
      }
      const result = validator.validate(thirteenMissing, ['race_ethnicity', 'gender', 'age_at_arrest']);
      
      // 13 cases * 3 vars = 39 missing / 45 total = 86.7% > 80% → abort
      expect(result.recommendedAction).toBe('abort');
    });

    test('warns on small sample (1 case, severity error since < 5)', () => {
      const result = validator.validate([mockCases[0]], []);
      
      expect(result.issues.some(i => i.field === 'sample_size' && i.severity === 'error')).toBe(true);
      expect(result.recommendedAction).toBe('abort');
    });

    test('does not warn with 100+ cases', () => {
      const manyCases = Array(101).fill(mockCases[0]);
      const result = validator.validate(manyCases, []);
      
      expect(result.issues.some(i => i.field === 'sample_size' && i.severity === 'warning')).toBe(false);
    });

    test('warns on per-field missing rate >20% when sample >= minCases', () => {
      // 15 cases, 5 missing on offense_severity = 5/15 = 33.3% per-field missing
      const fifteenCases = Array(15).fill(mockCases[0]).map((c, i) => ({ ...c, id: `case_${i}` } as LegalJusticeCase));
      for (let i = 0; i < 5; i++) {
        fifteenCases[i].offense_severity = undefined as any;
      }
      const result = validator.validateVariables(fifteenCases, ['offense_severity']);
      
      expect(result.issues.some(i => i.field === 'offense_severity' && i.severity === 'warning')).toBe(true);
    });
  });

  describe('validateVariables', () => {
    test('validates variables and returns missing data', () => {
      const result = validator.validateVariables([mockCases[0], mockCases[1]], ['days_to_disposition', 'conviction']);
      
      expect(result.valid).toBe(true);
      expect(result.summary.fieldsMissingData).toBeDefined();
      expect(result.recommendedAction).toBe('proceed');
    });

    test('aborts when variable completely missing', () => {
      const result = validator.validateVariables([mockCases[0]], ['nonexistent_var']);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field === 'nonexistent_var' && i.severity === 'error')).toBe(true);
    });
  });

  describe('validateForAnalysis', () => {
    test('validates for survival analysis', () => {
      const result = validator.validateForAnalysis(
        [mockCases[0], mockCases[1]],
        'survival',
        { timeVariable: ['days_to_disposition'], eventVariable: ['conviction'], groupVariable: ['race_ethnicity'] }
      );
      
      expect(result.valid).toBe(true);
      expect(result.summary.validCases).toBe(2);
    });

    test('validates for mediation analysis', () => {
      const result = validator.validateForAnalysis(
        [mockCases[0], mockCases[1]],
        'mediation',
        { treatmentVariable: ['race_ethnicity'], mediatorVariable: ['offense_severity'], outcomeVariable: ['conviction'], covariates: ['age_at_arrest'] }
      );
      
      expect(result.valid).toBe(true);
    });

    test('validates for machine learning analysis', () => {
      const result = validator.validateForAnalysis(
        [mockCases[0], mockCases[1]],
        'machineLearning',
        { outcomeVariable: ['conviction'] }
      );
      
      expect(result.valid).toBe(true);
    });
  });

  describe('config', () => {
    test('uses default config values', () => {
      expect(validator.getConfig().minCases).toBe(10);
      expect(validator.getConfig().maxMissingRate).toBe(0.5);
    });

    test('updates config', () => {
      validator.updateConfig({ minCases: 5, maxMissingRate: 0.8 });
      expect(validator.getConfig().minCases).toBe(5);
      expect(validator.getConfig().maxMissingRate).toBe(0.8);
    });
  });
});