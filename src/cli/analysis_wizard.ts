/**
 * Analysis Wizard
 *
 * Domain-specific wizard that guides users through the complete
 * analysis workflow: data source selection, jurisdiction setup,
 * analysis type configuration, execution, and result export.
 */

import { InteractiveCLI, WizardStep, WizardResult } from './interactive_cli';
import { ExportFormatters, ExportFormat } from './export_formatters';
import { AnalysisPipeline } from '../analysis';
import type { AnalysisPipelineResult } from '../analysis';
import { FBIUCRSource, FBIFetchOptions } from '../data-sources';
import { BJSSource } from '../data-sources';

export type DataSourceType = 'fbi-ucr' | 'bjs';
export type AnalysisType = 'disparity' | 'sentencing' | 'trend' | 'causal';

const DATA_SOURCE_OPTIONS: Array<{ value: DataSourceType; label: string }> = [
  { value: 'fbi-ucr', label: 'FBI UCR' },
  { value: 'bjs', label: 'BJS' },
];

const ANALYSIS_TYPE_OPTIONS: Array<{ value: AnalysisType; label: string }> = [
  { value: 'disparity', label: 'Disparity Analysis' },
  { value: 'sentencing', label: 'Sentencing Analysis' },
  { value: 'trend', label: 'Trend Monitoring' },
  { value: 'causal', label: 'Causal Inference' },
];

const COMMON_COVARIATES = [
  'offense_severity',
  'prior_record',
  'count',
  'population',
];

export interface AnalysisWizardConfig {
  projectName: string;
  jurisdictionId: string;
  jurisdictionName: string;
  dataSource: DataSourceType;
  analysisType: AnalysisType;
  alpha: number;
  covariates: string[];
  groupVar: string;
  outcomeVar: string;
  description?: string;
}

export class AnalysisWizard {
  private cli: InteractiveCLI;
  private formatters: ExportFormatters;
  private config: AnalysisWizardConfig;

  constructor(cli: InteractiveCLI, formatters: ExportFormatters) {
    this.cli = cli;
    this.formatters = formatters;
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): AnalysisWizardConfig {
    return {
      projectName: '',
      jurisdictionId: '',
      jurisdictionName: '',
      dataSource: 'fbi-ucr' as DataSourceType,
      analysisType: 'disparity' as AnalysisType,
      alpha: 0.05,
      covariates: [],
      groupVar: 'race_ethnicity',
      outcomeVar: 'conviction',
      description: '',
    };
  }

  static create(cli: InteractiveCLI, formatters: ExportFormatters): AnalysisWizard {
    return new AnalysisWizard(cli, formatters);
  }

  getConfig(): AnalysisWizardConfig {
    return this.config;
  }

  getPrompts(): WizardStep[] {
    return [
      this.createJurisdictionPrompt(),
      this.createDataSourcePrompt(),
      this.createAnalysisTypePrompt(),
      this.createCovariatesPrompt(),
      this.createAlphaPrompt(),
    ];
  }

  private createJurisdictionPrompt(): WizardStep {
    return {
      name: 'jurisdictionId',
      prompt: 'Enter jurisdiction identifier (e.g., TX-001)',
      defaultValue: '',
      validate: (v: string) => {
        if (!v || !/^[A-Z]{2}-\d+$/.test(v)) {
          return 'Enter format: STATE-DISTRICT (e.g., TX-001)';
        }
        return true;
      },
    };
  }

  private createDataSourcePrompt(): WizardStep {
    return {
      name: 'dataSource',
      prompt: 'Select data source',
      defaultValue: 'fbi-ucr',
      validate: (v: string) => {
        const valid = DATA_SOURCE_OPTIONS.map(o => o.value);
        if (!valid.includes(v as DataSourceType)) {
          return `Valid options: ${valid.join(', ')}`;
        }
        return true;
      },
    };
  }

  private createAnalysisTypePrompt(): WizardStep {
    return {
      name: 'analysisType',
      prompt: 'Select analysis type',
      defaultValue: 'disparity',
      validate: (v: string) => {
        const valid = ANALYSIS_TYPE_OPTIONS.map(o => o.value);
        if (!valid.includes(v as AnalysisType)) {
          return `Valid options: ${valid.join(', ')}`;
        }
        return true;
      },
    };
  }

  private createCovariatesPrompt(): WizardStep {
    return {
      name: 'covariates',
      prompt: 'Enter covariates (comma-separated, or "common" for defaults)',
      defaultValue: 'common',
      validate: (v: string) => {
        if (v === 'common' || v === '') return true;
        const parts = v.split(',').map(s => s.trim().toLowerCase());
        for (const p of parts) {
          if (!COMMON_COVARIATES.includes(p)) {
            return `Unknown covariate: ${p}. Common options: ${COMMON_COVARIATES.slice(0, 4).join(', ')}`;
          }
        }
        return true;
      },
    };
  }

  private createAlphaPrompt(): WizardStep {
    return {
      name: 'alpha',
      prompt: 'Significance level (0.01–0.10)',
      defaultValue: '0.05',
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n) || n <= 0.01 || n >= 0.10) {
          return 'Alpha must be between 0.01 and 0.10';
        }
        return true;
      },
    };
  }

  async run(): Promise<WizardResult> {
    const result = await this.cli.runWizard(this.config as unknown as Record<string, unknown>);

    if (!result.success) {
      return result;
    }

    this.updateConfig(result.values as Record<string, unknown>);

    return result;
  }

  private updateConfig(values: Record<string, unknown>): void {
    if (values.jurisdictionId) {
      this.config.jurisdictionId = String(values.jurisdictionId);
      this.config.jurisdictionName = String(values.jurisdictionName || '');
    }
    if (values.dataSource) {
      this.config.dataSource = values.dataSource as DataSourceType;
    }
    if (values.analysisType) {
      this.config.analysisType = values.analysisType as AnalysisType;
    }
    if (values.alpha !== undefined) {
      this.config.alpha = Number(values.alpha);
    }
    if (values.covariates) {
      const cv = String(values.covariates);
      if (cv === 'common') {
        this.config.covariates = COMMON_COVARIATES.slice(0, 3);
      } else {
        this.config.covariates = cv.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (values.groupVar) {
      this.config.groupVar = String(values.groupVar);
    }
    if (values.outcomeVar) {
      this.config.outcomeVar = String(values.outcomeVar);
    }
  }

  private parseJurisdiction(): { state: string; district: string } {
    const parts = this.config.jurisdictionId.split('-');
    return { state: parts[0], district: parts[1] || '' };
  }

  async execute(): Promise<{
    success: boolean;
    result?: AnalysisPipelineResult;
    error?: string;
  }> {
    try {
      const { state } = this.parseJurisdiction();
      let rawData: any[] = [];

      if (this.config.dataSource === 'fbi-ucr') {
        const dataSource = new FBIUCRSource();
        const options: FBIFetchOptions = { state };
        const response = await dataSource.fetch(options);
        rawData = response?.data || [];
      } else {
        const dataSource = new BJSSource();
        const metric = this.config.covariates.length > 0
          ? this.config.covariates[0]
          : 'conviction_rate';
        rawData = await dataSource.fetchTimeSeries(metric, state, 2019, 2023);
      }

      if (!rawData || rawData.length === 0) {
        return { success: false, error: 'No data returned from source' };
      }

      const analysisPipeline = new AnalysisPipeline();
      const result = await analysisPipeline.runPipeline(rawData, {
        groupVariable: this.config.groupVar,
        outcomeVariable: this.config.outcomeVar,
        controlVariables: this.config.covariates,
        analysisType: this.config.analysisType as
          | 'disparate_impact_conviction'
          | 'sentencing_disparity'
          | 'time_to_disposition',
      });

      return { success: true, result };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }

  async exportResult(
    format: ExportFormat,
    template?: 'simplified' | 'technical' | 'policy'
  ): Promise<string> {
    if (!this.config.projectName) {
      throw new Error('Project not configured');
    }
    return this.formatters.exportReport(
      { project: this.config, format, template } as any,
      { format, template }
    ).content;
  }
}