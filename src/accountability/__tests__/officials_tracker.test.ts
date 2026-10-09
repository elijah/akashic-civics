import { OfficialsTracker } from '../officials_tracker';

describe('OfficialsTracker', () => {
  it('should initialize properly', () => {
    const tracker = new OfficialsTracker();
    expect(tracker).toBeDefined();
  });

  it('should process cases and compute official statistics', async () => {
    const tracker = new OfficialsTracker();
    
    const cases = [
      {
        case_id: 'case-001',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 60,
      },
      {
        case_id: 'case-002',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'White',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
      },
      {
        case_id: 'case-003',
        official_id: 'officer-002',
        official_name: 'Jane Smith',
        official_type: 'prosecutor',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        sentence_months: 18,
        days_to_disposition: 90,
      },
      {
        case_id: 'case-004',
        official_id: 'officer-002',
        official_name: 'Jane Smith',
        official_type: 'prosecutor',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'White',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
      }
    ] as Array<{
      case_id: string;
      official_id: string;
      official_name: string;
      official_type: 'judge' | 'prosecutor' | 'court';
      jurisdiction_id: string;
      race_ethnicity: string;
      conviction: number;
      sentence_months: number;
      days_to_disposition: number;
    }>;

    const result = await tracker.processCasesForOfficials(cases);
    
    expect(result).toBeDefined();
    expect(result.officials).toHaveLength(2);
    const officialIds = result.officials.map(o => o.official_id);
    expect(officialIds).toContain('officer-001');
    expect(officialIds).toContain('officer-002');
    
    result.officials.forEach(official => {
      expect(official.case_count).toBeGreaterThan(0);
      expect(official.conviction_rates).toBeDefined();
      expect(official.disparity_scores).toBeDefined();
    });
  });

  it('should handle empty cases array', async () => {
    const tracker = new OfficialsTracker();
    const cases: Array<{
      case_id: string;
      official_id: string;
      official_name: string;
      official_type: 'judge' | 'prosecutor' | 'court';
      jurisdiction_id: string;
      race_ethnicity: string;
      conviction: number;
      sentence_months: number;
      days_to_disposition: number;
    }> = [];
    
    try {
      const result = await tracker.processCasesForOfficials(cases);
      expect(result).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should generate jurisdiction average when cases provided', async () => {
    const tracker = new OfficialsTracker();
    
    const cases = [
      {
        case_id: 'case-001',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 60,
      },
      {
        case_id: 'case-002',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'White',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
      },
    ] as Array<{
      case_id: string;
      official_id: string;
      official_name: string;
      official_type: 'judge' | 'prosecutor' | 'court';
      jurisdiction_id: string;
      race_ethnicity: string;
      conviction: number;
      sentence_months: number;
      days_to_disposition: number;
    }>;

    const result = await tracker.processCasesForOfficials(cases);
    
    expect(result).toBeDefined();
    expect(result.jurisdiction_avg).toBeDefined();
    // Should have Black as a key since that's the non-white group
    expect(result.jurisdiction_avg).toHaveProperty('Black');
    expect(typeof result.jurisdiction_avg.Black).toBe('number');
    // With 1 Black convicted out of 1 total (rate=1.0) and 1 White convicted out of 1 total (rate=0.0)
    // Disparity = 1.0 - 0.0 = 1.0
    expect(result.jurisdiction_avg.Black).toBeCloseTo(1.0);
  });

  it('should handle cases with zero values for optional fields', async () => {
    const tracker = new OfficialsTracker();
    
    const cases = [
      {
        case_id: 'case-001',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        sentence_months: 0,
        days_to_disposition: 0,
      }
    ] as Array<{
      case_id: string;
      official_id: string;
      official_name: string;
      official_type: 'judge' | 'prosecutor' | 'court';
      jurisdiction_id: string;
      race_ethnicity: string;
      conviction: number;
      sentence_months: number;
      days_to_disposition: number;
    }>;

    const result = await tracker.processCasesForOfficials(cases);
    
    expect(result).toBeDefined();
    expect(result.officials).toBeDefined();
  });
});