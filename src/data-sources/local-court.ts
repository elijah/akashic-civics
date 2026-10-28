import { BaseDataSource, DataSourceConfig, DataFetchOptions, DataSourceResponse } from './base';

export interface CourtCaseRecord {
  caseId: string;
  offenseType: string;
  offenseCategory: string;
  chargeDegree: string;
  jurisdiction: string;
  county: string;
  state: string;
  arrestDate?: string;
  bookingDate?: string;
  firstAppearanceDate?: string;
  dispositionDate?: string;
  disposition: string;
  sentenceLengthMonths?: number;
  sentenceType?: string;
  fineAmount?: number;
  probationLengthMonths?: number;
  bailAmount?: number;
  bailPosted?: boolean;
  pretrialDetained?: boolean;
  defendantRace?: string;
  defendantEthnicity?: string;
  defendantGender?: string;
  defendantAge?: number;
  defendantZipCode?: string;
  defenseAttorneyType?: string;
  prosecutorName?: string;
  judgeName?: string;
  offenseLocation?: string;
  weaponInvolved?: boolean;
  priorConvictions?: number;
  notes?: string;
}

export interface CourtFetchOptions extends DataFetchOptions {
  jurisdiction?: string;
  county?: string;
  state?: string;
  year?: number;
  disposition?: string;
  offenseType?: string;
  format?: 'csv' | 'json';
}

export interface CourtDatasetStats {
  totalCases: number;
  dateRange: { start?: string; end?: string };
  jurisdictions: string[];
  offenseCategories: Record<string, number>;
  raceBreakdown: Record<string, number>;
  convictionRate: number;
  averageSentenceMonths: number | null;
}

export class LocalCourtSource extends BaseDataSource<CourtCaseRecord[]> {
  private static readonly DEFAULT_CONFIG: DataSourceConfig = {
    name: 'Local Court',
    baseUrl: 'file://',
    rateLimit: 1000,
    timeout: 60000,
  };

private cachedCases: CourtCaseRecord[] = [];

  constructor(config?: Partial<DataSourceConfig>) {
    super({ ...LocalCourtSource.DEFAULT_CONFIG, ...config });
  }

  async fetch(options: CourtFetchOptions = {}): Promise<DataSourceResponse<CourtCaseRecord[]>> {
    const cached = this.getCached(options);
    if (cached && this.cachedCases.length > 0) {
      const filtered = this.filterCases(this.cachedCases, options);
      return {
        data: filtered,
        metadata: {
          totalCount: filtered.length,
          page: 1,
          pageSize: filtered.length,
          fetchedAt: new Date().toISOString(),
          source: this.config.name,
        },
      };
    }

    if (this.cachedCases.length === 0) {
      await this.loadDefaultDataset();
    }

    const filtered = this.filterCases(this.cachedCases, options);
    this.setCache(options, { data: filtered, metadata: { totalCount: filtered.length, page: 1, pageSize: filtered.length, fetchedAt: new Date().toISOString(), source: this.config.name } });

    return {
      data: filtered,
      metadata: {
        totalCount: filtered.length,
        page: 1,
        pageSize: filtered.length,
        fetchedAt: new Date().toISOString(),
        source: this.config.name,
      },
    };
  }

  protected parseResponse(json: unknown, _options: CourtFetchOptions): DataSourceResponse<CourtCaseRecord[]> {
    const records = Array.isArray(json) ? json : ((json as any)?.data || []);
    const cases = records.map((r: any) => this.normalizeCourtRecord(r));
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

  async ingestCSVFile(filePath: string): Promise<{ cases: CourtCaseRecord[]; stats: CourtDatasetStats }> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    const cases = this.parseCourtCSV(content);
    this.cachedCases = cases;
    const stats = this.computeStats(cases);
    return { cases, stats };
  }

  async ingestJSONFile(filePath: string): Promise<{ cases: CourtCaseRecord[]; stats: CourtDatasetStats }> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);
    const records = Array.isArray(raw) ? raw : (raw?.data || raw?.cases || []);
    const cases = records.map((r: any) => this.normalizeCourtRecord(r));
    this.cachedCases = cases;
    const stats = this.computeStats(cases);
    return { cases, stats };
  }

  async ingestDirectory(directoryPath: string): Promise<{ cases: CourtCaseRecord[]; stats: CourtDatasetStats; filesProcessed: string[] }> {
    const fs = await import('fs');
    const path = await import('path');
    const filesProcessed: string[] = [];
    let allCases: CourtCaseRecord[] = [];

    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.csv' && ext !== '.json') continue;

      const filePath = path.join(directoryPath, entry.name);
      if (ext === '.csv') {
        const result = await this.ingestCSVFile(filePath);
        allCases = [...allCases, ...result.cases];
      } else {
        const result = await this.ingestJSONFile(filePath);
        allCases = [...allCases, ...result.cases];
      }
      filesProcessed.push(filePath);
    }

    this.cachedCases = allCases;
    const stats = this.computeStats(allCases);

    return { cases: allCases, stats, filesProcessed };
  }

  async getDatasetStats(options?: CourtFetchOptions): Promise<CourtDatasetStats> {
    const cases = options ? this.filterCases(this.cachedCases, options) : this.cachedCases;
    return this.computeStats(cases);
  }

  async getConvictionRateByDemographic(options?: CourtFetchOptions): Promise<{
    byRace: Record<string, { rate: number; count: number }>;
    byGender: Record<string, { rate: number; count: number }>;
    byAgeGroup: Record<string, { rate: number; count: number }>;
  }> {
    const cases = options ? this.filterCases(this.cachedCases, options) : this.cachedCases;

    const byRace: Record<string, { rate: number; count: number }> = {};
    const byGender: Record<string, { rate: number; count: number }> = {};
    const byAgeGroup: Record<string, { rate: number; count: number }> = {};

    const raceCounts: Record<string, { total: number; convictions: number }> = {};
    const genderCounts: Record<string, { total: number; convictions: number }> = {};
    const ageCounts: Record<string, { total: number; convictions: number }> = {};

    for (const c of cases) {
      const race = c.defendantRace || 'Unknown';
      if (!raceCounts[race]) raceCounts[race] = { total: 0, convictions: 0 };
      raceCounts[race].total++;
      if (c.disposition === 'conviction') raceCounts[race].convictions++;

      const gender = c.defendantGender || 'Unknown';
      if (!genderCounts[gender]) genderCounts[gender] = { total: 0, convictions: 0 };
      genderCounts[gender].total++;
      if (c.disposition === 'conviction') genderCounts[gender].convictions++;

      const ageGroup = c.defendantAge ? this.ageGroup(c.defendantAge) : 'Unknown';
      if (!ageCounts[ageGroup]) ageCounts[ageGroup] = { total: 0, convictions: 0 };
      ageCounts[ageGroup].total++;
      if (c.disposition === 'conviction') ageCounts[ageGroup].convictions++;
    }

    for (const [race, stats] of Object.entries(raceCounts)) {
      byRace[race] = { rate: stats.total > 0 ? stats.convictions / stats.total : 0, count: stats.total };
    }
    for (const [gender, stats] of Object.entries(genderCounts)) {
      byGender[gender] = { rate: stats.total > 0 ? stats.convictions / stats.total : 0, count: stats.total };
    }
    for (const [age, stats] of Object.entries(ageCounts)) {
      byAgeGroup[age] = { rate: stats.total > 0 ? stats.convictions / stats.total : 0, count: stats.total };
    }

    return { byRace, byGender, byAgeGroup };
  }

  async getOffenseDisparity(options?: CourtFetchOptions): Promise<{
    byOffense: Record<string, { convictionRate: number; dismissalRate: number; caseCount: number; disparityRatio: number }>;
    overallConvictionRate: number;
  }> {
    const cases = options ? this.filterCases(this.cachedCases, options) : this.cachedCases;
    const overallConvictions = cases.filter(c => c.disposition === 'conviction').length;
    const overallRate = cases.length > 0 ? overallConvictions / cases.length : 0;

    const byOffense: Record<string, { convictionRate: number; dismissalRate: number; caseCount: number; disparityRatio: number }> = {};
    const offenseStats: Record<string, { total: number; convictions: number; dismissals: number }> = {};

    for (const c of cases) {
      const offense = c.offenseCategory || c.offenseType || 'Other';
      if (!offenseStats[offense]) offenseStats[offense] = { total: 0, convictions: 0, dismissals: 0 };
      offenseStats[offense].total++;
      if (c.disposition === 'conviction') offenseStats[offense].convictions++;
      if (c.disposition === 'dismissal') offenseStats[offense].dismissals++;
    }

    for (const [offense, stats] of Object.entries(offenseStats)) {
      const convictionRate = stats.total > 0 ? stats.convictions / stats.total : 0;
      const dismissalRate = stats.total > 0 ? stats.dismissals / stats.total : 0;
      const disparityRatio = overallRate > 0 ? convictionRate / overallRate : 0;
      byOffense[offense] = { convictionRate, dismissalRate, caseCount: stats.total, disparityRatio };
    }

    return { byOffense, overallConvictionRate: overallRate };
  }

  private filterCases(cases: CourtCaseRecord[], options: CourtFetchOptions): CourtCaseRecord[] {
    return cases.filter(c => {
      if (options.jurisdiction && c.jurisdiction !== options.jurisdiction) return false;
      if (options.county && c.county !== options.county) return false;
      if (options.state && c.state !== options.state) return false;
      if (options.year && c.arrestDate && !c.arrestDate.startsWith(options.year.toString())) return false;
      if (options.disposition && c.disposition !== options.disposition) return false;
      if (options.offenseType && c.offenseType !== options.offenseType) return false;
      return true;
    });
  }

  private loadDefaultDataset(): void {
    this.cachedCases = [];
  }

  private parseCourtCSV(csv: string): CourtCaseRecord[] {
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const cases: CourtCaseRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.parseCSVLine(line);
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || '';
      });
      cases.push(this.normalizeCourtRecord(record));
    }

    return cases;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private normalizeCourtRecord(raw: any): CourtCaseRecord {
    const toNumber = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '' || v === 'Unknown') return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };

    const toString = (v: any): string => {
      if (v === undefined || v === null) return '';
      return String(v).trim();
    };

    return {
      caseId: toString(raw.case_id || raw.caseId || raw.id || ''),
      offenseType: toString(raw.offense_type || raw.offenseType || raw.charge || ''),
      offenseCategory: toString(raw.offense_category || raw.offenseCategory || raw.crime_category || ''),
      chargeDegree: toString(raw.charge_degree || raw.chargeDegree || raw.degree || ''),
      jurisdiction: toString(raw.jurisdiction || raw.court_name || ''),
      county: toString(raw.county || raw.jurisdiction || ''),
      state: toString(raw.state || raw.jurisdiction_state || ''),
      arrestDate: toString(raw.arrest_date || raw.arrestDate || undefined),
      bookingDate: toString(raw.booking_date || raw.bookingDate || undefined),
      firstAppearanceDate: toString(raw.first_appearance_date || raw.firstAppearanceDate || undefined),
      dispositionDate: toString(raw.disposition_date || raw.dispositionDate || undefined),
      disposition: toString(raw.disposition || raw.outcome || raw.result || 'unknown'),
      sentenceLengthMonths: toNumber(raw.sentence_length_months || raw.sentenceLengthMonths || raw.sentence_months),
      sentenceType: toString(raw.sentence_type || raw.sentenceType || ''),
      fineAmount: toNumber(raw.fine_amount || raw.fineAmount || raw.fine),
      probationLengthMonths: toNumber(raw.probation_length_months || raw.probationLengthMonths || raw.probation_months),
      bailAmount: toNumber(raw.bail_amount || raw.bailAmount || raw.bail),
      bailPosted: raw.bail_posted === 'true' || raw.bailPosted === true || raw.bailPosted === '1' || undefined,
      pretrialDetained: raw.pretrial_detained === 'true' || raw.pretrialDetained === true || raw.pretrialDetained === '1' || undefined,
      defendantRace: toString(raw.defendant_race || raw.defendantRace || raw.race || undefined),
      defendantEthnicity: toString(raw.defendant_ethnicity || raw.defendantEthnicity || raw.ethnicity || undefined),
      defendantGender: toString(raw.defendant_gender || raw.defendantGender || raw.gender || undefined),
      defendantAge: toNumber(raw.defendant_age || raw.defendantAge || raw.age),
      defendantZipCode: toString(raw.defendant_zip_code || raw.defendantZipCode || raw.zip_code || undefined),
      defenseAttorneyType: toString(raw.defense_attorney_type || raw.defenseAttorneyType || raw.attorney_type || undefined),
      prosecutorName: toString(raw.prosecutor_name || raw.prosecutorName || ''),
      judgeName: toString(raw.judge_name || raw.judgeName || ''),
      offenseLocation: toString(raw.offense_location || raw.offenseLocation || ''),
      weaponInvolved: raw.weapon_involved === 'true' || raw.weaponInvolved === true || raw.weapon_involved === '1' || undefined,
      priorConvictions: toNumber(raw.prior_convictions || raw.priorConvictions || raw.prior_convictions_count),
      notes: toString(raw.notes || raw.comments || undefined),
    };
  }

  private computeStats(cases: CourtCaseRecord[]): CourtDatasetStats {
    const dates = cases.map(c => c.arrestDate).filter(Boolean);
    const jurisdictions = [...new Set(cases.map(c => c.jurisdiction))];
    const offenseCategories: Record<string, number> = {};
    const raceBreakdown: Record<string, number> = {};

    let convictionCount = 0;
    let totalSentenceMonths = 0;
    let sentenceCount = 0;

    for (const c of cases) {
      const cat = c.offenseCategory || c.offenseType || 'Other';
      offenseCategories[cat] = (offenseCategories[cat] || 0) + 1;
      const race = c.defendantRace || 'Unknown';
      raceBreakdown[race] = (raceBreakdown[race] || 0) + 1;
      if (c.disposition === 'conviction') convictionCount++;
      if (c.sentenceLengthMonths !== undefined) {
        totalSentenceMonths += c.sentenceLengthMonths;
        sentenceCount++;
      }
    }

    return {
      totalCases: cases.length,
      dateRange: {
        start: dates.length > 0 ? dates.sort()[0] : undefined,
        end: dates.length > 0 ? dates.sort()[dates.length - 1] : undefined,
      },
      jurisdictions,
      offenseCategories,
      raceBreakdown,
      convictionRate: cases.length > 0 ? convictionCount / cases.length : 0,
      averageSentenceMonths: sentenceCount > 0 ? totalSentenceMonths / sentenceCount : null,
    };
  }

  private ageGroup(age: number): string {
    if (age < 18) return 'Under 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }
}
