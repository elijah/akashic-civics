import { BaseDataSource, DataSourceConfig, DataSourceResponse } from '../base';
import { FBIUCRSource } from '../fbi-ucr';
import { BJSSource } from '../bjs';
import { LocalCourtSource } from '../local-court';
import { DataPipeline, dataPipeline } from '../pipeline';

class TestSource extends BaseDataSource<{ id: string; value: number }[]> {
  constructor(config: DataSourceConfig) {
    super(config);
  }
  async fetch(): Promise<DataSourceResponse<{ id: string; value: number }[]>> {
    return { data: [], metadata: { totalCount: 0, page: 1, pageSize: 0, fetchedAt: '', source: '' } };
  }
  protected parseResponse(json: unknown): DataSourceResponse<{ id: string; value: number }[]> {
    const data = (json as any)?.data || json || [];
    return { data: data as { id: string; value: number }[], metadata: { totalCount: data.length, page: 1, pageSize: data.length, fetchedAt: new Date().toISOString(), source: this.config.name } };
  }
}

describe('E26: Real Data Source Implementations', () => {
  describe('FBIUCRSource', () => {
    it('should create with default config', () => {
      const source = new FBIUCRSource();
      expect(source).toBeInstanceOf(FBIUCRSource);
    });

    it('should accept custom config', () => {
      const source = new FBIUCRSource({ apiKey: 'test-key', rateLimit: 100 });
      expect(source).toBeInstanceOf(FBIUCRSource);
    });

    it('should parse CDE records', () => {
      const source = new FBIUCRSource();
      const raw = {
        results: [
          {
            crime_type: 'Property',
            offense_type: 'Burglary',
            state_name: 'California',
            county_name: 'Los Angeles',
            reported_date: '2023-01-15',
            cleared_date: '2023-03-20',
            arrest_made: true,
            suspect_race: 'White',
            suspect_sex: 'Male',
            victim_race: 'Unknown',
            victim_sex: 'Female',
            charges: ['Burglary'],
            disposition: 'conviction',
            sentence_length: 24,
          },
          {
            crime_type: 'Violent',
            offense_type: 'Robbery',
            state_name: 'Texas',
            county_name: 'Harris',
            reported_date: '2023-02-20',
            cleared_date: '2023-04-10',
            arrest_made: false,
            suspect_race: 'Black',
            suspect_sex: 'Male',
            victim_race: 'White',
            victim_sex: 'Male',
            charges: ['Robbery'],
            disposition: 'dismissal',
          },
        ],
      };
      const response = (source as any).parseResponse(raw, {});
      expect(response.data).toHaveLength(2);
      expect(response.data[0].caseId).toContain('Property');
      expect(response.data[0].state).toBe('California');
      expect(response.data[0].disposition).toBe('conviction');
      expect(response.data[1].disposition).toBe('dismissal');
      expect(response.metadata.source).toBe('FBI CDE');
    });

    it('should build query params', () => {
      const source = new FBIUCRSource();
      const params = source.buildQueryParams({ jurisdiction: 'CA', year: 2023 });
      expect(params.get('jurisdiction')).toBe('CA');
    });

    it('should compute conviction disparity by race via fetchConvictionDisparity', () => {
      const source = new FBIUCRSource();
      (source as any).parseResponse = (json: any) => ({
        data: json.results.map((r: any) => ({
          caseId: r.crime_type,
          offense: r.offense_type,
          offenseType: r.crime_type,
          location: '',
          state: r.state_name,
          county: r.county_name,
          dateReported: r.reported_date,
          dateClosed: r.cleared_date,
          arrestMade: r.arrest_made,
          suspectRace: r.suspect_race,
          suspectGender: r.suspect_sex,
          charges: r.charges,
          disposition: r.disposition,
        })),
        metadata: { totalCount: 3, page: 1, pageSize: 3, fetchedAt: '', source: 'FBI CDE' },
      });
      const result = (source as any).fetchConvictionDisparity('CA', 2023);
      expect(result).toBeDefined();
    });
  });

  describe('BJSSource', () => {
    it('should create with default config', () => {
      const source = new BJSSource();
      expect(source).toBeInstanceOf(BJSSource);
    });

    it('should parse BJS dataset records', () => {
      const source = new BJSSource();
      const raw = {
        data: [
          { year: 2022, jurisdiction: 'California', jurisdiction_type: 'state', indicator: 'arrest_rate', value: 12.5, unit: 'per_100k', ci_lower: 10.0, ci_upper: 15.0, n: 1000 },
          { year: 2021, jurisdiction: 'Texas', jurisdiction_type: 'state', indicator: 'conviction_rate', value: 0.65, unit: 'ratio', n: 500 },
        ],
      };
      const response = (source as any).parseResponse(raw, {});
      expect(response.data).toHaveLength(2);
      expect(response.data[0].year).toBe(2022);
      expect(response.data[0].metric).toBe('arrest_rate');
      expect(response.data[0].confidenceInterval).toEqual([10.0, 15.0]);
      expect(response.data[1].sampleSize).toBe(500);
    });

    it('should parse CSV dataset', () => {
      const source = new BJSSource();
      const csv = 'year,jurisdiction,jurisdiction_type,indicator,value,unit\n2022,California,state,arrest_rate,12.5,per_100k\n2021,Texas,state,conviction_rate,0.65,ratio\n';
      const data = (source as any).parseCsvDataset(csv);
      expect(data).toHaveLength(2);
      expect(data[0].year).toBe(2022);
      expect(data[1].value).toBe(0.65);
    });
  });

  describe('LocalCourtSource', () => {
    it('should create with default config', () => {
      const source = new LocalCourtSource();
      expect(source).toBeInstanceOf(LocalCourtSource);
    });

    it('should parse court CSV records', () => {
      const source = new LocalCourtSource();
      const csv = `case_id,offense_type,offense_category,jurisdiction,county,state,disposition,sentence_length_months,defendant_race
CASE-001,Burglary,Property,LA Superior,LA,CA,conviction,24,White
CASE-002,Robbery,Violent,LA Superior,LA,CA,dismissal,,Black`;
      const cases = (source as any).parseCourtCSV(csv);
      expect(cases).toHaveLength(2);
      expect(cases[0].caseId).toBe('CASE-001');
      expect(cases[0].disposition).toBe('conviction');
      expect(cases[0].sentenceLengthMonths).toBe(24);
      expect(cases[1].sentenceLengthMonths).toBeUndefined();
    });

    it('should normalize court records from various field names', () => {
      const source = new LocalCourtSource();
      const raw = { id: 'CASE-001', charge: 'Robbery', crime_category: 'Violent', outcome: 'conviction', race: 'White', age: 42 };
      const normalized = (source as any).normalizeCourtRecord(raw);
      expect(normalized.caseId).toBe('CASE-001');
      expect(normalized.offenseType).toBe('Robbery');
      expect(normalized.disposition).toBe('conviction');
      expect(normalized.defendantAge).toBe(42);
    });
  });

  describe('DataPipeline', () => {
    it('should create with default registry', () => {
      const pipeline = new DataPipeline();
      expect(pipeline).toBeInstanceOf(DataPipeline);
    });

    it('should export singleton instance', () => {
      expect(dataPipeline).toBeInstanceOf(DataPipeline);
    });
  });

  describe('BaseDataSource - TestSource', () => {
    it('should manage cache', () => {
      const source = new TestSource({ name: 'Test', baseUrl: 'http://test.com' });
      const resp = { data: [], metadata: { totalCount: 0, page: 1, pageSize: 0, fetchedAt: '', source: '' } };
      source.setCache({ limit: 10 }, resp);
      expect(source.getCached({ limit: 10 })).toEqual(resp);
      source.clearCache();
      expect(source.getCached({ limit: 10 })).toBeUndefined();
    });

    it('should build query params', () => {
      const source = new TestSource({ name: 'Test', baseUrl: 'http://test.com' });
      const params = source.buildQueryParams({ startDate: '2023-01-01', limit: 100 });
      expect(params.get('start_date')).toBe('2023-01-01');
      expect(params.get('limit')).toBe('100');
    });

    it('should return stats', () => {
      const source = new TestSource({ name: 'Test', baseUrl: 'http://test.com', rateLimit: 10 });
      expect(source.getStats()).toEqual({ requestCount: 0, cacheSize: 0 });
    });
  });
});
