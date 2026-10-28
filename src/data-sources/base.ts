export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
}

export interface DataFetchOptions {
  startDate?: string;
  endDate?: string;
  jurisdiction?: string;
  variables?: string[];
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface DataSourceResponse<T> {
  data: T;
  metadata: {
    totalCount: number;
    page: number;
    pageSize: number;
    fetchedAt: string;
    source: string;
  };
  warnings?: string[];
}

export interface DataSourceError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface DataSourceStats {
  requestCount: number;
  cacheSize: number;
}

export abstract class BaseDataSource<T> {
  protected config: DataSourceConfig;
  protected cache: Map<string, unknown> = new Map();
  protected requestCount = 0;
  protected lastRequestTime = 0;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  abstract fetch(options?: DataFetchOptions): Promise<DataSourceResponse<T>>;

  protected async rateLimit(): Promise<void> {
    if (this.config.rateLimit) {
      const elapsed = Date.now() - this.lastRequestTime;
      const minInterval = 60000 / this.config.rateLimit;
      if (elapsed < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
      }
    }
  }

  public buildQueryParams(options: DataFetchOptions = {}): URLSearchParams {
    const params = new URLSearchParams();
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.jurisdiction) params.append('jurisdiction', options.jurisdiction);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.variables?.length) params.append('variables', options.variables.join(','));
    return params;
  }

  protected async makeRequest(
    endpoint: string,
    options: DataFetchOptions = {}
  ): Promise<DataSourceResponse<T>> {
    await this.rateLimit();
    
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.search = this.buildQueryParams(options).toString();
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Akashic-Civics/1.17.0',
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    const response = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      const error: DataSourceError = {
        code: `HTTP_${response.status}`,
        message: `Request failed: ${response.statusText}`,
        retryable: response.status >= 500,
        details: { status: response.status, url: url.toString() },
      };
      throw error;
    }

    const json = await response.json();
    return this.parseResponse(json, options);
  }

  protected abstract parseResponse(json: unknown, options: DataFetchOptions): DataSourceResponse<T>;

  getCacheKey(options: DataFetchOptions = {}): string {
    return JSON.stringify(options);
  }

  getCached(options: DataFetchOptions = {}): DataSourceResponse<T> | undefined {
    return this.cache.get(this.getCacheKey(options)) as DataSourceResponse<T> | undefined;
  }

  setCache(options: DataFetchOptions, response: DataSourceResponse<T>): void {
    this.cache.set(this.getCacheKey(options), response);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): DataSourceStats {
    return { requestCount: this.requestCount, cacheSize: this.cache.size };
  }
}