import { BaseDataSource, DataSourceConfig, DataFetchOptions, DataSourceResponse } from './base';

export interface FBICaseData {
  caseId: string;
  offense: string;
  offenseType: string;
  location: string;
  state: string;
  county: string;
  dateReported: string;
  dateClosed: string;
  arrestMade: boolean;
  victimRace?: string;
  victimGender?: string;
  suspectRace?: string;
  suspectGender?: string;
  charges: string[];
  disposition: string;
  sentence?: string;
}

export interface FBIFetchOptions extends DataFetchOptions {
  state?: string;
  county?: string;
  year?: number;
  offenseType?: string;
  arrestOnly?: boolean;
}

export interface FBICrimeDataExplorerRecord {
  crime_type: string;
  offense_type: string;
  state_name: string;
  county_name: string;
  reported_date: string;
  cleared_date: string;
  arrest_made: boolean;
  suspect_race?: string;
  suspect_sex?: string;
  victim_race?: string;
  victim_sex?: string;
  charges: string[];
  disposition: string;
  sentence_length?: number;
}

export class FBIUCRSource extends BaseDataSource<FBICaseData[]> {
  private static readonly DEFAULT_CONFIG: DataSourceConfig = {
    name: 'FBI CDE',
    baseUrl: 'https://api.usa.gov/crime/fbi/sde',
    rateLimit: 100,
    timeout: 30000,
  };

  constructor(config?: Partial<DataSourceConfig>) {
    super({ ...FBIUCRSource.DEFAULT_CONFIG, ...config });
  }

  async fetch(options: FBIFetchOptions = {}): Promise<DataSourceResponse<FBICaseData[]>> {
    const cached = this.getCached(options);
    if (cached) return cached;

    try {
      const response = await this.makeRequest('/cases', options);
      this.setCache(options, response);
      return response;
    } catch (error) {
      const sourceError = error as { code: string; message: string; retryable: boolean; details?: Record<string, unknown> };
      throw {
        ...sourceError,
        message: `FBI UCR fetch failed: ${sourceError.message}`,
      };
    }
  }

  protected parseResponse(json: unknown, _options: FBIFetchOptions): DataSourceResponse<FBICaseData[]> {
    const records = Array.isArray(json) ? json : ((json as any)?.results || (json as any)?.data || []);
    const cases: FBICaseData[] = records.map((r: any) => this.mapCDERecord(r));

    return {
      data: cases,
      metadata: {
        totalCount: cases.length,
        page: 1,
        pageSize: cases.length,
        fetchedAt: new Date().toISOString(),
        source: this.config.name,
      },
    };
  }

  private mapCDERecord(record: FBICrimeDataExplorerRecord): FBICaseData {
    return {
      caseId: `${record.crime_type}_${record.state_name}_${record.county_name}_${record.reported_date}`,
      offense: record.offense_type,
      offenseType: record.crime_type,
      location: `${record.county_name}, ${record.state_name}`,
      state: record.state_name,
      county: record.county_name,
      dateReported: record.reported_date,
      dateClosed: record.cleared_date,
      arrestMade: record.arrest_made,
      victimRace: record.victim_race,
      victimGender: record.victim_sex,
      suspectRace: record.suspect_race,
      suspectGender: record.suspect_sex,
      charges: record.charges,
      disposition: record.disposition,
      sentence: record.sentence_length ? `${record.sentence_length} months` : undefined,
    };
  }

  async fetchArrestsByState(state: string, year?: number): Promise<{
    state: string;
    year: number | undefined;
    totalArrests: number;
    arrestsByRace: Record<string, number>;
    arrestsByGender: Record<string, number>;
  }> {
    const response = await this.fetch({ state, year, arrestOnly: true });
    const arrests = response.data.filter(c => c.arrestMade);

    const arrestsByRace: Record<string, number> = {};
    const arrestsByGender: Record<string, number> = {};

    for (const a of arrests) {
      const r = a.suspectRace || 'Unknown';
      arrestsByRace[r] = (arrestsByRace[r] || 0) + 1;
      const g = a.suspectGender || 'Unknown';
      arrestsByGender[g] = (arrestsByGender[g] || 0) + 1;
    }

    return {
      state,
      year,
      totalArrests: arrests.length,
      arrestsByRace,
      arrestsByGender,
    };
  }

  async fetchConvictionDisparity(state: string, year?: number): Promise<{
    state: string;
    year: number | undefined;
    totalCases: number;
    convictionRateByRace: Record<string, number>;
    convictionRateByGender: Record<string, number>;
    disparityRatioByRace: Record<string, number>;
    disparityRatioByGender: Record<string, number>;
  }> {
    const response = await this.fetch({ state, year });
    const cases = response.data;

const casesByRace: Record<string, { total: number; convictions: number }> = {};
    const casesByGender: Record<string, { total: number; convictions: number }> = {};

    for (const c of cases) {
      const r = c.suspectRace || 'Unknown';
      if (!casesByRace[r]) casesByRace[r] = { total: 0, convictions: 0 };
      casesByRace[r].total++;
      if (c.disposition === 'conviction') casesByRace[r].convictions++;

      const g = c.suspectGender || 'Unknown';
      if (!casesByGender[g]) casesByGender[g] = { total: 0, convictions: 0 };
      casesByGender[g].total++;
      if (c.disposition === 'conviction') casesByGender[g].convictions++;
    }

    const raceRates: Record<string, number> = {};
    const genderRates: Record<string, number> = {};

    for (const [r, stats] of Object.entries(casesByRace)) {
      raceRates[r] = stats.total > 0 ? stats.convictions / stats.total : 0;
    }
    for (const [g, stats] of Object.entries(casesByGender)) {
      genderRates[g] = stats.total > 0 ? stats.convictions / stats.total : 0;
    }

    const maxRaceRate = Math.max(...Object.values(raceRates));
    const maxGenderRate = Math.max(...Object.values(genderRates));

    const disparityRatioByRace: Record<string, number> = {};
    const disparityRatioByGender: Record<string, number> = {};

    for (const [r, rate] of Object.entries(raceRates)) {
      disparityRatioByRace[r] = maxRaceRate > 0 ? rate / maxRaceRate : 0;
    }
    for (const [g, rate] of Object.entries(genderRates)) {
      disparityRatioByGender[g] = maxGenderRate > 0 ? rate / maxGenderRate : 0;
    }

    return {
      state,
      year,
      totalCases: cases.length,
      convictionRateByRace: raceRates,
      convictionRateByGender: genderRates,
      disparityRatioByRace,
      disparityRatioByGender,
    };
  }
}
