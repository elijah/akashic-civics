import { FBIUCRSource, FBIFetchOptions, FBICaseData } from './fbi-ucr';
import { BJSSource, BJSFetchOptions, BJSDataPoint } from './bjs';
import { LocalCourtSource, CourtCaseRecord, CourtFetchOptions } from './local-court';
import { DataSourceStats } from './base';

export interface DataSourceRegistry {
  fbiUCR: FBIUCRSource;
  bjs: BJSSource;
  localCourt: LocalCourtSource;
}

export class DataPipeline {
  private registry: DataSourceRegistry;

  constructor(registry?: DataSourceRegistry) {
    this.registry = registry || this.defaultRegistry();
  }

  private defaultRegistry(): DataSourceRegistry {
    return {
      fbiUCR: new FBIUCRSource(),
      bjs: new BJSSource(),
      localCourt: new LocalCourtSource(),
    };
  }

  async getCasesByState(state: string, year?: number): Promise<FBICaseData[]> {
    const response = await this.registry.fbiUCR.fetch({
      ...(year && { year }),
      state,
    });
    return response.data;
  }

  async getDispositionData(state: string, year: number): Promise<{
    totalCases: number;
    arrests: number;
    convictions: number;
    dismissals: number;
  }> {
    const cases = await this.getCasesByState(state, year);
    const total = cases.length;
    const arrests = cases.filter(c => c.arrestMade).length;
    const convictions = cases.filter(c => c.disposition === 'conviction').length;
    const dismissals = cases.filter(c => c.disposition === 'dismissal').length;
    return { totalCases: total, arrests, convictions, dismissals };
  }

  async getTimeSeries(
    metric: string,
    state: string,
    startYear: number,
    endYear: number
  ): Promise<BJSDataPoint[]> {
    return this.registry.bjs.fetchTimeSeries(metric, state, startYear, endYear);
  }

  async getArrestRates(state: string, startYear: number, endYear: number): Promise<BJSDataPoint[]> {
    return this.getTimeSeries('arrest_rate', state, startYear, endYear);
  }

  async getSentencingData(state: string, metric: string, year: number): Promise<BJSDataPoint[]> {
    const response = await this.registry.bjs.fetch({ year, state, metric });
    return response.data;
  }

  async ingestLocalCourtData(options: {
    filePath?: string;
    directoryPath?: string;
    format?: 'csv' | 'json';
  }): Promise<{ cases: CourtCaseRecord[]; stats: any; filesProcessed?: string[] }> {
    if (options.directoryPath) {
      return this.registry.localCourt.ingestDirectory(options.directoryPath);
    } else if (options.filePath) {
      if (options.format === 'json') {
        return this.registry.localCourt.ingestJSONFile(options.filePath);
      }
      return this.registry.localCourt.ingestCSVFile(options.filePath);
    }
    throw new Error('Either filePath or directoryPath must be provided');
  }

  async getLocalCourtStats(options?: CourtFetchOptions): Promise<any> {
    return this.registry.localCourt.getDatasetStats(options);
  }

  async getConvictionDisparity(state: string, year?: number): Promise<any> {
    return this.registry.fbiUCR.fetchConvictionDisparity(state, year);
  }

  async getArrestsByState(state: string, year?: number): Promise<any> {
    return this.registry.fbiUCR.fetchArrestsByState(state, year);
  }

  async getConvictionRateByDemographic(options?: CourtFetchOptions): Promise<any> {
    return this.registry.localCourt.getConvictionRateByDemographic(options);
  }

  async getOffenseDisparity(options?: CourtFetchOptions): Promise<any> {
    return this.registry.localCourt.getOffenseDisparity(options);
  }

  getSourceStats(): { fbiUCR: DataSourceStats; bjs: DataSourceStats; localCourt: DataSourceStats } {
    return {
      fbiUCR: this.registry.fbiUCR.getStats(),
      bjs: this.registry.bjs.getStats(),
      localCourt: this.registry.localCourt.getStats(),
    };
  }

  clearAllCaches(): void {
    this.registry.fbiUCR.clearCache();
    this.registry.bjs.clearCache();
    this.registry.localCourt.clearCache();
  }
}

export const dataPipeline = new DataPipeline();
export { FBIUCRSource, FBIFetchOptions, BJSSource, BJSFetchOptions, LocalCourtSource, CourtCaseRecord, CourtFetchOptions };