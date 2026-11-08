/**
 * Type definitions for R/JS Bridge
 * 
 * Shared types used by enhanced_r_bridge, inline_r_generator,
 * js_fallback_analyses, and other modules.
 */

import { LegalJusticeCase } from '../normalization/legal_justice_schema';

export interface FallbackConfig {
  useFallback: boolean;
  warnOnFallback: boolean;
}

export interface AnalysisCacheEntry {
  key: string;
  result: EnhancedRAnalysisResult;
  timestamp: number;
  ttl: number;
}

export interface EnhancedRAnalysisOptions {
  analysisType: 'survival' | 'mediation' | 'mixedEffects' | 'machineLearning' | 'custom';
  packageUsed: 'survival' | 'mediation' | 'lme4' | 'caret' | 'base';
  modelFormula?: string;
  dataTransform?: string;
  controlVariables?: string[];
  alpha?: number;
  useParallel?: boolean;
  cores?: number;
  includeModelSummary?: boolean;
  includeDiagnostics?: boolean;
}

export interface SurvivalAnalysisOptions extends EnhancedRAnalysisOptions {
  analysisType: 'survival';
  timeVariable: string;
  eventVariable: string;
  groupVariable?: string;
  useKaplanMeier?: boolean;
}

export interface MediationAnalysisOptions extends EnhancedRAnalysisOptions {
  analysisType: 'mediation';
  treatmentVariable: string;
  mediatorVariable: string;
  outcomeVariable: string;
  covariates?: string[];
}

export interface MixedEffectsOptions extends EnhancedRAnalysisOptions {
  analysisType: 'mixedEffects';
  fixedFormula: string;
  randomFormula: string;
  family?: 'gaussian' | 'binomial' | 'poisson';
}

export interface MachineLearningOptions extends EnhancedRAnalysisOptions {
  analysisType: 'machineLearning';
  outcomeVariable: string;
  algorithm?: 'rf' | 'svm' | 'glmnet' | 'xgboost';
  tuneParameters?: boolean;
  crossValidation?: boolean;
  folds?: number;
}

export interface EnhancedRAnalysisResult {
  analysis_type: string;
  effect_size?: number;
  p_value?: number;
  confidence_interval?: [number, number];
  confidence_interval_indirect?: [number, number];
  confidence_interval_direct?: [number, number];
  confidence_interval_total?: [number, number];
  hazard_ratio?: number;
  odds_ratio?: number;
  indirect_effect?: number;
  direct_effect?: number;
  total_effect?: number;
  proportion_mediated?: number;
  sample_size?: number;
  model_type?: string;
  method?: string;
  model_summary?: any;
  coefficients?: Record<string, { estimate: number; std_error: number; z_value: number; p_value: number }>;
  model_diagnostics?: {
    aic: number;
    bic: number;
    log_likelihood: number;
    pseudo_r_squared?: number;
    concordance_index?: number;
    residuals?: Record<string, any>;
  };
  survival_curves?: {
    time_points: number[];
    survival_probability: number[];
    confidence_lower?: number[];
    confidence_upper?: number[];
  }[];
  feature_importance?: Record<string, number>;
  prediction_accuracy?: {
    accuracy: number;
    sensitivity: number;
    specificity: number;
    auc: number;
  };
  data_quality?: {
    n_cases: number;
    missing_rate: number;
    completeness_score: number;
  };
  fallback_used?: boolean;
  fallback_reason?: string;
}

export interface RScriptContext {
  dataFile: string;
  outputFile: string;
  options: EnhancedRAnalysisOptions;
  cases?: LegalJusticeCase[];
}