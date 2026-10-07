import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { LegalJusticeCase } from '../normalization/legal_justice_schema';

const NA_REAL_ = null;

export interface RAnalysisResult {
  analysis_type: string;
  effect_size: number;
  p_value: number;
  confidence_interval: [number, number];
  odds_ratio?: number;
  hazard_ratio?: number;
  sample_size?: number;
  model_type?: string;
  model_summary?: any;
  coefficients?: Record<string, { estimate: number; std_error: number; z_value: number; p_value: number }>;
  model_diagnostics?: {
   aic: number;
    bic: number;
    log_likelihood: number;
    pseudo_r_squared?: number;
    concordance_index?: number;
  };
  data_quality?: {
    n_cases: number;
    missing_rate: number;
    completeness_score: number;
  };
  disconfirmation_tests?: {
    passed: boolean;
    tests_passed: number;
    tests_total: number;
    details: Record<string, boolean>;
  };
}

export interface RAnalysisOptions {
  analysisFunction: 'disparate_impact_conviction' | 'sentencing_disparity' | 'time_to_disposition' | 'custom';
  groupVariable: string;
  outcomeVariable: string;
  controlVariables: string[];
  alpha: number;
  imputeMissing: boolean;
  includeDisconfirmation: boolean;
  outputFormat: 'json' | 'csv' | 'rds';
}

export class RInterface {
  private rScriptPath: string;
  private analysisTemplatesDir: string;
  
  constructor(
    rScriptPath: string = '/usr/bin/Rscript',
    analysisTemplatesDir: string = join(__dirname, '../../docs/analysis-templates')
  ) {
    this.rScriptPath = rScriptPath;
    this.analysisTemplatesDir = analysisTemplatesDir;
  }
  
  /**
   * Run a pre-registered analysis via R
   */
  async runAnalysis(
    cases: LegalJusticeCase[],
    options: RAnalysisOptions,
    preRegistrationPath?: string
  ): Promise<RAnalysisResult> {
    const tempInput = join(tmpdir(), `akashic_input_${Date.now()}.json`);
    const tempOutput = join(tmpdir(), `akashic_output_${Date.now()}.json`);
    
    try {
      const inputData = {
        cases: cases.map(c => this.sanitizeCaseForR(c)),
        options: {
          ...options,
          analysisFunction: options.analysisFunction,
          groupVariable: options.groupVariable,
          outcomeVariable: options.outcomeVariable,
          controlVariables: options.controlVariables,
          alpha: options.alpha,
          imputeMissing: options.imputeMissing,
          includeDisconfirmation: options.includeDisconfirmation,
          outputFormat: 'json' as const
        },
        preRegistrationPath,
        metadata: {
          source: 'akashic-civics-js',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };
      
      writeFileSync(tempInput, JSON.stringify(inputData, null, 2));
      
      const result = await this.executeRScript(tempInput, tempOutput, options, preRegistrationPath);
      
      if (result.status !== 0) {
        throw new Error(`R script failed with code ${result.status}: ${result.stderr}`);
      }
      
      const output = JSON.parse(readFileSync(tempOutput, 'utf-8'));
      return this.validateResult(output);
      
    } finally {
      this.cleanupTempFiles(tempInput, tempOutput);
    }
  }
  
  /**
   * Export cases to CSV for R analysis
   */
  exportToCSV(cases: LegalJusticeCase[], outputPath: string): void {
    const headers = [
      'id', 'jurisdiction_id', 'race_ethnicity', 'gender', 'age_at_arrest',
      'offense_severity', 'charge_type', 'conviction', 'sentence_months',
      'days_to_disposition', 'disposition_type', 'judge_id', 'prosecutor_office',
      'completeness_score'
    ];
    
    const lines = [headers.join(',')];
    
    for (const c of cases) {
      const row = headers.map(h => {
        const val = (c as any)[h];
        if (val == null) return '';
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      });
      lines.push(row.join(','));
    }
    
    const csv = lines.join('\n');
    writeFileSync(outputPath, csv);
  }
  
  /**
   * Export cases to JSON for R analysis (via jsonlite)
   */
  exportToJSON(cases: LegalJusticeCase[], outputPath: string): void {
    const json = JSON.stringify(cases.map(c => this.sanitizeCaseForR(c)), null, 2);
    writeFileSync(outputPath, json);
  }
  
  /**
   * Import R results back into JS
   */
  importRResults(filePath: string): RAnalysisResult {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return this.validateResult(data);
  }
  
  /**
   * Generate R script that calls the analysis templates
   */
  generateRScript(
    inputPath: string,
    outputPath: string,
    options: RAnalysisOptions,
    preRegistrationPath?: string
  ): string {
    const rCode = `
library(jsonlite)
source("${this.analysisTemplatesDir}/akashicjustice.R")
source("${this.analysisTemplatesDir}/disconfirmation.R")
source("${this.analysisTemplatesDir}/pre_registration.R")

# Load input data
input <- fromJSON("${inputPath}")
cases <- lapply(input$cases, function(x) as.data.frame(x, stringsAsFactors = FALSE))
cases <- do.call(rbind, cases)

# Load pre-registration if provided
reg <- NULL
if (!is.null("${preRegistrationPath || ''}") && file.exists("${preRegistrationPath || ''}")) {
  reg <- load_pre_registration("${preRegistrationPath}")
}

# Run analysis
result <- pre_registered_analysis(
  data = cases,
  registration = reg,
  analysis_function = ${options.analysisFunction},
  output_dir = "${dirname(outputPath)}",
  verbose = TRUE
)

# Export results
write(toJSON(result, auto_unbox = TRUE), "${outputPath}")
`;
    return rCode;
  }
  
  /**
   * Execute R script via child process
   */
  private async executeRScript(
    inputPath: string,
    outputPath: string,
    options: RAnalysisOptions,
    preRegistrationPath?: string
  ): Promise<{ status: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const script = this.generateRScript(inputPath, outputPath, options, preRegistrationPath);
      
      const scriptPath = join(tmpdir(), `akashic_script_${Date.now()}.R`);
      writeFileSync(scriptPath, script);
      
      const process = spawn(this.rScriptPath, [scriptPath]);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => { stdout += data.toString(); });
      process.stderr.on('data', (data) => { stderr += data.toString(); });
      
      process.on('close', (code) => {
        if (existsSync(scriptPath)) unlinkSync(scriptPath);
        resolve({ status: code || 0, stdout, stderr });
      });
      
      process.on('error', (err) => {
        if (existsSync(scriptPath)) unlinkSync(scriptPath);
        reject(err);
      });
    });
  }
  
  /**
   * Sanitize a case for R consumption
   */
  private sanitizeCaseForR(c: LegalJusticeCase): any {
    return {
      id: c.id,
      jurisdiction_id: c.jurisdiction_id,
      race_ethnicity: c.race_ethnicity || '',
      gender: c.gender || '',
      age_at_arrest: c.age_at_arrest ?? NA_REAL_,
      offense_severity: c.offense_severity || '',
      charge_type: c.charge_type || '',
      conviction: c.conviction ?? NA_REAL_,
      sentence_months: c.sentence_months ?? NA_REAL_,
      days_to_disposition: c.days_to_disposition ?? NA_REAL_,
      disposition_type: c.disposition_type || '',
      judge_id: c.judge_id || '',
      prosecutor_office: c.prosecutor_office || '',
      completeness_score: c.completeness_score ?? NA_REAL_
    };
  }
  
  /**
   * Validate R result structure
   */
  private validateResult(data: any): RAnalysisResult {
    if (!data.analysis_type) {
      throw new Error('Invalid R result: missing analysis_type');
    }
    return {
      analysis_type: data.analysis_type || 'unknown',
      model_summary: data.model_summary || {},
      effect_size: data.effect_size ?? 0,
      p_value: data.p_value ?? 1,
      confidence_interval: data.confidence_interval || [0, 0],
      odds_ratio: data.odds_ratio,
      hazard_ratio: data.hazard_ratio,
      coefficients: data.coefficients || {},
      model_diagnostics: data.model_diagnostics || { aic: 0, bic: 0, log_likelihood: 0 },
      data_quality: data.data_quality || { n_cases: 0, missing_rate: 0, completeness_score: 0 },
      disconfirmation_tests: data.disconfirmation_tests
    };
  }
  
  /**
   * Clean up temporary files
   */
  private cleanupTempFiles(...paths: string[]): void {
    for (const path of paths) {
      try {
        if (existsSync(path)) unlinkSync(path);
      } catch { /* ignore cleanup errors */ }
    }
  }
}

// Placeholder for NA real value in R context