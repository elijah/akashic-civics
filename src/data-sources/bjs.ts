import { BaseDataSource, DataSourceConfig, DataFetchOptions, DataSourceResponse, DataSourceError } from './base';

export interface BJSDataPoint {
  year: number;
  jurisdiction: string;
  jurisdictionType: 'state' | 'federal' | 'local';
  metric: string;
  value: number;
  unit: string;
  confidenceInterval?: [number, number];
  sampleSize?: number;
}

export interface BJSFetchOptions extends DataFetchOptions {
  year?: number;
  state?: string;
  metric?: string;
  jurisdictionType?: 'state' | 'federal' | 'local';
}

export interface BJSDatasetRecord {
  year: number;
  jurisdiction: string;
  jurisdiction_type: string;
  indicator: string;
  value: number;
  unit: string;
  ci_lower?: number;
  ci_upper?: number;
  n?: number;
}

export class BJSSource extends BaseDataSource<BJSDataPoint[]> {
  private static readonly DEFAULT_CONFIG: DataSourceConfig = {
    name: 'BJS',
    baseUrl: 'https://api.bjs.gov/v1',
    rateLimit: 60,
    timeout: 30000,
  };

  constructor(config?: Partial<DataSourceConfig>) {
    super({ ...BJSSource.DEFAULT_CONFIG, ...config });
  }

  async fetch(options: BJSFetchOptions = {}): Promise<DataSourceResponse<BJSDataPoint[]>> {
    try {
      const response = await this.makeRequest('/statistics', options);
      return response;
    } catch (error) {
      const sourceError = error as { code: string; message: string; retryable: boolean; details?: Record<string, unknown> };
      throw {
        ...sourceError,
        message: `BJS fetch failed: ${sourceError.message}`,
      };
    }
  }

  protected parseResponse(json: unknown, _options: BJSFetchOptions): DataSourceResponse<BJSDataPoint[]> {
    const records = Array.isArray(json) ? json : ((json as any)?.data || (json as any)?.results || []);
    const data: BJSDataPoint[] = records.map((r: any) => this.mapDatasetRecord(r));

    return {
      data,
      metadata: {
        totalCount: data.length,
        page: 1,
        pageSize: data.length,
        fetchedAt: new Date().toISOString(),
        source: this.config.name,
      },
    };
  }

  private mapDatasetRecord(record: BJSDatasetRecord): BJSDataPoint {
    return {
      year: record.year,
      jurisdiction: record.jurisdiction,
      jurisdictionType: record.jurisdiction_type as 'state' | 'federal' | 'local',
      metric: record.indicator,
      value: record.value,
      unit: record.unit,
      confidenceInterval: record.ci_lower !== undefined && record.ci_upper !== undefined
        ? [record.ci_lower, record.ci_upper]
        : undefined,
      sampleSize: record.n,
    };
  }

  async fetchTimeSeries(
    metric: string,
    state: string,
    startYear: number,
    endYear: number
  ): Promise<BJSDataPoint[]> {
    const allData: BJSDataPoint[] = [];
    for (let year = startYear; year <= endYear; year++) {
      try {
        const response = await this.fetch({ year, state, metric });
        allData.push(...response.data);
      } catch (error) {
        if ((error as DataSourceError).retryable) {
          throw error;
        }
        console.warn(`Skipping year ${year} for ${metric} in ${state}: ${(error as Error).message}`);
      }
    }
    return allData;
  }

  async ingestLocalDataset(filePath: string): Promise<BJSDataPoint[]> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');

    try {
      const json = JSON.parse(content);
      return this.parseJsonDataset(json);
    } catch {
      return this.parseCsvDataset(content);
    }
  }

  private parseJsonDataset(data: any[]): BJSDataPoint[] {
    return (data as BJSDatasetRecord[]).map(r => this.mapDatasetRecord(r));
  }

  private parseCsvDataset(csv: string): BJSDataPoint[] {
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: BJSDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || '';
      });

      rows.push({
        year: parseInt(record.year || '0', 10) || 0,
        jurisdiction: record.jurisdiction || '',
        jurisdictionType: (record.jurisdiction_type || 'local') as 'state' | 'federal' | 'local',
        metric: record.metric || record.indicator || '',
        value: parseFloat(record.value) || 0,
        unit: record.unit || 'count',
        confidenceInterval: record.ci_lower && record.ci_upper
          ? [parseFloat(record.ci_lower), parseFloat(record.ci_upper)]
          : undefined,
        sampleSize: parseInt(record.n || '0', 10) || undefined,
      });
    }

    return rows;
  }

  async ingestCourtExports(filePath: string): Promise<BJSDataPoint[]> {
    return this.ingestLocalDataset(filePath);
  }

  async ingestCountyData(filePath: string): Promise<BJSDataPoint[]> {
    return this.ingestLocalDataset(filePath);
  }
}
