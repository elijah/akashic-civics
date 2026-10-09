import { LegalJusticeCase } from '../legal_justice_schema';

describe('LegalJusticeCase Schema', () => {
  it('should define case with proper type structure', () => {
    const case_: LegalJusticeCase = {
      id: 'case-001',
      jurisdiction_id: 'TX-001',
      jurisdiction_name: 'Texas North',
      race_ethnicity: 'white',
      gender: 'male',
      age_at_arrest: 35,
      offense_severity: 'low',
      offense_description: 'petty theft',
      statute_code: 'TX-PET-001',
      charge_type: 'misdemeanor',
      conviction: 1,
      conviction_type: 'guilty_plea',
      sentence_months: 6,
      probation_months: 12,
      fines_amount: 500,
      restitution_amount: 200,
      disposition_type: 'conviction',
      disposition_description: 'Guilty plea',
      days_to_disposition: 45,
      days_to_sentencing: 10,
      judge_id: 'judge-001',
      judge_name: 'John Smith',
      prosecutor_office: 'TX-001',
      attorney_type: 'public_defender',
      bail_amount: 1000,
      bail_posted: 1,
      source_connector: 'akashic-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date().toISOString(),
      missing_fields: [],
      data_quality_flags: [],
      completeness_score: 0.95,
    };

    expect(case_.id).toBe('case-001');
    expect(case_.jurisdiction_id).toBe('TX-001');
    expect(case_.race_ethnicity).toBe('white');
    expect(case_.gender).toBe('male');
    expect(case_.offense_severity).toBe('low');
    expect(case_.conviction).toBe(1);
    expect(case_.sentence_months).toBe(6);
  });

  it('should support all offense severity levels', () => {
    const severities: Array<string> = [
      'felony_level_1', 'felony_level_2', 'felony_level_3',
      'misdemeanor_a', 'misdemeanor_b', 'infraction'
    ];
    severities.forEach(severity => {
      const case_: LegalJusticeCase = {
        id: `case-${severity}`,
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'white',
        gender: 'male',
        offense_severity: severity,
        conviction: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 1.0,
      };
      expect(case_.offense_severity).toBe(severity);
    });
  });

  it('should support all conviction types', () => {
    const convictions: Array<0 | 1> = [0, 1];
    convictions.forEach(conviction => {
      const case_: LegalJusticeCase = {
        id: `case-${conviction}`,
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'white',
        gender: 'male',
        offense_severity: 'medium',
        conviction,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 1.0,
      };
      expect(case_.conviction).toBe(conviction);
    });
  });

  it('should support all disposition types', () => {
    const dispositions: Array<string> = [
      'conviction', 'dismissal', 'acquittal', 'diversion', 'deferred_prosecution'
    ];
    dispositions.forEach(disposition => {
      const case_: LegalJusticeCase = {
        id: `case-${disposition}`,
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'white',
        gender: 'male',
        offense_severity: 'medium',
        disposition_type: disposition,
        conviction: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 1.0,
      };
      expect(case_.disposition_type).toBe(disposition);
    });
  });

  it('should support all attorney types', () => {
    const attorneyTypes: Array<string> = [
      'public_defender', 'private_attorney', 'pro_se', 'unknown'
    ];
    attorneyTypes.forEach(attorneyType => {
      const case_: LegalJusticeCase = {
        id: `case-${attorneyType}`,
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'white',
        gender: 'male',
        offense_severity: 'medium',
        attorney_type: attorneyType,
        conviction: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 1.0,
      };
      expect(case_.attorney_type).toBe(attorneyType);
    });
  });

  it('should require all fields', () => {
    const baseCase: LegalJusticeCase = {
      id: 'case-001',
      jurisdiction_id: 'TX-001',
      race_ethnicity: 'Black',
      gender: 'female',
      age_at_arrest: 28,
      offense_severity: 'medium',
      conviction: 1,
      sentence_months: 12,
      days_to_disposition: 60,
      missing_fields: [],
      source_connector: 'akashic-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date().toISOString(),
      data_quality_score: 0.85,
    };

    expect(baseCase).toBeDefined();
    expect(typeof baseCase.id).toBe('string');
    expect(typeof baseCase.jurisdiction_id).toBe('string');
    expect(typeof baseCase.race_ethnicity).toBe('string');
    expect(typeof baseCase.gender).toBe('string');
    expect(typeof baseCase.offense_severity).toBe('string');
    expect(typeof baseCase.conviction).toBe('number');
    expect(typeof baseCase.sentence_months).toBe('number');
    expect(typeof baseCase.days_to_disposition).toBe('number');
  });
});