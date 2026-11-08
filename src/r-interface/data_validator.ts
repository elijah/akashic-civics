/**
 * Data Validator for R/JS Bridge
 * 
 * Pre-execution validation of case data to catch issues before
 * sending to R, providing clear error messages instead of cryptic
 * R runtime failures.
 */

import { LegalJusticeCase } from '../normalization/legal_justice_schema';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  caseIndex?: number;
  value?: any;
  recommendedAction?: 'proceed' | 'impute' | 'abort';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalCases: number;
    validCases: number;
    missingRate: number;
    fieldsMissingData: Record<string, number>;
  };
  recommendedAction: 'proceed' | 'impute' | 'abort';
}

export interface DataValidationConfig {
  minCases?: number;
  maxMissingRate?: number;
  requiredFields?: string[];
  warnOnSmallSample?: boolean;
  warnOnHighMissing?: boolean;
}

const DEFAULT_CONFIG: Required<DataValidationConfig> = {
  minCases: 10,
  maxMissingRate: 0.5,
  requiredFields: ['id', 'jurisdiction_id'],
  warnOnSmallSample: true,
  warnOnHighMissing: true
};

export class DataValidator {
  private config: Required<DataValidationConfig>;

  constructor(config: DataValidationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate cases before R analysis
   */
  validate(
    cases: LegalJusticeCase[],
    requiredVars?: string[]
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const allRequired = new Set([
      ...this.config.requiredFields,
      ...(requiredVars ?? [])
    ]);

    // Check for empty input
    if (!Array.isArray(cases) || cases.length === 0) {
      return {
        valid: false,
        issues: [{ field: 'cases', message: 'No cases provided for analysis', severity: 'error' }],
        summary: { totalCases: 0, validCases: 0, missingRate: 1, fieldsMissingData: {} },
        recommendedAction: 'abort'
      };
    }

    // Check minimum case count
    if (cases.length < this.config.minCases) {
      issues.push({
        field: 'sample_size',
        message: `Only ${cases.length} cases provided. Minimum recommended: ${this.config.minCases}. Results may be unreliable.`,
        severity: cases.length < 5 ? 'error' : 'warning',
        recommendedAction: cases.length < 5 ? 'abort' : 'proceed'
      });
    }

    // Validate each case
    const fieldMissingCounts: Record<string, number> = {};
    let validCases = 0;

    const requiredVarsList = Array.from(allRequired);

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      if (!c || typeof c !== 'object') {
        issues.push({ field: `cases[${i}]`, message: `Case ${i} is not a valid object`, severity: 'error' });
        continue;
      }

      // Check ID
      if (!c.id || typeof c.id !== 'string') {
        issues.push({ field: 'id', message: `Case ${i} missing valid ID`, severity: 'error', caseIndex: i });
        continue;
      }

      // Check required fields
      let caseValid = true;
      for (const field of requiredVarsList) {
        const val = (c as any)[field];
        if (val == null || val === '' || val === 'NA' || val === 'NaN') {
          fieldMissingCounts[field] = (fieldMissingCounts[field] || 0) + 1;
          issues.push({
            field,
            message: `Case ${i} missing required field '${field}'`,
            severity: 'warning',
            caseIndex: i,
            value: val
          });
          caseValid = false;
        }
      }

      if (caseValid) validCases++;
    }

    // Calculate missing rates
    const fieldsMissingData: Record<string, number> = {};
    let totalMissingCells = 0;
    let totalCells = 0;

    for (const field of requiredVarsList) {
      const missing = fieldMissingCounts[field] || 0;
      const rate = missing / cases.length;
      fieldsMissingData[field] = Math.round(rate * 1000) / 10;
      totalMissingCells += missing;
      totalCells += cases.length;
    }

    const missingRate = totalCells > 0 ? totalMissingCells / totalCells : 0;

    // Check high missing rate
    if (missingRate > this.config.maxMissingRate) {
      issues.push({
        field: 'data_completeness',
        message: `High missing data rate: ${Math.round(missingRate * 100)}% of required fields are missing. Consider imputation or data cleaning.`,
        severity: missingRate > 0.8 ? 'error' : 'warning',
        recommendedAction: missingRate > 0.8 ? 'abort' : 'impute'
      });
    }

    // Warn on small sample
    if (this.config.warnOnSmallSample && cases.length < 100 && cases.length >= this.config.minCases) {
      issues.push({
        field: 'sample_size',
        message: `Small sample size (${cases.length} cases). Confidence intervals will be wide and results may lack statistical power.`,
        severity: 'warning'
      });
    }

    // Warn on high missing per field
    if (this.config.warnOnHighMissing) {
      for (const [field, count] of Object.entries(fieldMissingCounts)) {
        const rate = count / cases.length;
        if (rate > 0.2) {
          issues.push({
            field,
            message: `Field '${field}' has ${Math.round(rate * 100)}% missing data. Results for analyses using this field may be biased.`,
            severity: 'warning'
          });
        }
      }
    }

    // Determine overall validity
    const hasErrors = issues.some(i => i.severity === 'error');
    const valid = !hasErrors;

    // Determine recommended action
    let recommendedAction: 'proceed' | 'impute' | 'abort' = 'proceed';
    if (hasErrors) {
      recommendedAction = 'abort';
    } else if (missingRate > 0.1) {
      recommendedAction = 'impute';
    }

    return {
      valid,
      issues,
      summary: {
        totalCases: cases.length,
        validCases,
        missingRate,
        fieldsMissingData
      },
      recommendedAction
    };
  }

  /**
   * Validate that specific variables exist and have sufficient data
   */
  validateVariables(
    cases: LegalJusticeCase[],
    variables: string[]
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const fieldsMissingData: Record<string, number> = {};
    let validCases = cases.length;

    for (const varName of variables) {
      let missingCount = 0;
      for (let i = 0; i < cases.length; i++) {
        const val = (cases[i] as any)[varName];
        if (val == null || val === '' || val === 'NA' || val === 'NaN') {
          missingCount++;
          issues.push({
            field: varName,
            message: `Case ${i} missing value for variable '${varName}'`,
            severity: 'warning',
            caseIndex: i,
            value: val
          });
        }
      }

      const rate = missingCount / cases.length;
      fieldsMissingData[varName] = Math.round(rate * 1000) / 10;

      if (rate === 1) {
        issues.push({
          field: varName,
          message: `Variable '${varName}' is completely missing (100% of cases)`,
          severity: 'error'
        });
        validCases = 0;
      } else if (rate > 0.5) {
        issues.push({
          field: varName,
          message: `Variable '${varName}' has ${Math.round(rate * 100)}% missing data`,
          severity: 'warning'
        });
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0 && validCases > 0,
      issues,
      summary: {
        totalCases: cases.length,
        validCases,
        missingRate: Object.values(fieldsMissingData).reduce((a, b) => a + b, 0) / Object.keys(fieldsMissingData).length / 100,
        fieldsMissingData
      },
      recommendedAction: validCases === 0 ? 'abort' : 'proceed'
    };
  }

  /**
   * Check if data is suitable for a specific analysis type
   */
  validateForAnalysis(
    cases: LegalJusticeCase[],
    analysisType: 'survival' | 'mediation' | 'mixedEffects' | 'machineLearning' | 'disparateImpact',
    variables: Record<string, string[]>
  ): ValidationResult {
    const requiredVars: string[] = [];

    switch (analysisType) {
      case 'survival':
        requiredVars.push(...(variables.timeVariable ? [variables.timeVariable[0]] : []),
          ...(variables.eventVariable ? [variables.eventVariable[0]] : []));
        if (variables.groupVariable) requiredVars.push(variables.groupVariable[0]);
        break;
      case 'mediation':
        requiredVars.push(
          ...(variables.treatmentVariable ? [variables.treatmentVariable[0]] : []),
          ...(variables.mediatorVariable ? [variables.mediatorVariable[0]] : []),
          ...(variables.outcomeVariable ? [variables.outcomeVariable[0]] : [])
        );
        if (variables.covariates) requiredVars.push(...variables.covariates);
        break;
      case 'mixedEffects':
        if (variables.fixedFormula) requiredVars.push(variables.fixedFormula[0]);
        if (variables.randomFormula) requiredVars.push(variables.randomFormula[0]);
        break;
      case 'machineLearning':
        requiredVars.push(...(variables.outcomeVariable ? [variables.outcomeVariable[0]] : []));
        break;
      case 'disparateImpact':
        requiredVars.push(
          ...(variables.groupVariable ? [variables.groupVariable[0]] : []),
          ...(variables.outcomeVariable ? [variables.outcomeVariable[0]] : [])
        );
        if (variables.controlVariables) requiredVars.push(...variables.controlVariables);
        break;
    }

    return this.validateVariables(cases, requiredVars);
  }

  /**
   * Get validation config
   */
  getConfig(): Required<DataValidationConfig> {
    return { ...this.config };
  }

  /**
   * Update validation config
   */
  updateConfig(config: Partial<DataValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}