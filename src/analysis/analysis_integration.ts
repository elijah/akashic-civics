/**
 * Integration Layer: JavaScript Data Pipeline → R Analysis Framework
 * 
 * Connects the Akashic data normalization pipeline with the R-based
 * rigorous statistical analysis system.
 */

import { ProvenanceTracker } from '../provenance/provenance_tracker';
import { HistoricalBaseline } from '../statistical/historical_baseline';

export interface AnalysisInput {
  cases: Array<{
    id: string;
    jurisdiction_id: string;
    jurisdiction_name: string;
    race_ethnicity: string;
    gender: string;
    age_at_arrest: number;
    offense_severity: string;
    charge_type: string;
    conviction: number;
    sentence_months: number;
    days_to_disposition: number;
    source_connector: string;
    source_version: string;
    missing_fields: string[];
    completeness_score: number;
  }>;
  provenance: ProvenanceTracker;
  baseline: HistoricalBaseline;
}

export interface AnalysisResult {
  snapshot_id: string;
  case_count: number;
  conviction_rate: number;
  data_quality_score: number;
  disconfirmation_passed: boolean;
  pre_registration_id: string;
  effect_size?: number;
  p_value?: number;
  conclusion?: string;
}

export class AnalysisIntegration {
  private provenance: ProvenanceTracker;
  private baseline: HistoricalBaseline;
  
  constructor() {
    this.provenance = new ProvenanceTracker();
    this.baseline = new HistoricalBaseline('./snapshots');
  }
  
  /**
   * Process raw cases through the full pipeline:
   * 1. Provenance tracking
   * 2. Historical baseline creation
   * 3. Export to R analysis
   */
  async processCases(cases: AnalysisInput['cases']): Promise<AnalysisResult> {
    // Step 1: Track provenance for each case
    cases.forEach(c => {
      this.provenance.addEntry(c.id, {
        sourceConnector: c.source_connector,
        sourceVersion: c.source_version,
        ingestionTimestamp: new Date().toISOString(),
        dataQualityScore: c.completeness_score,
        qualityFlags: c.missing_fields.length > 0 ? ['missing_fields'] : [],
        transformationHistory: [
          {
            step: 'ingestion',
            timestamp: new Date().toISOString(),
            description: 'Data imported from Akashic source',
            parameters: { source: c.source_connector }
          }
        ]
      });
    });
    
    // Step 2: Create historical baseline snapshot
    const snapshot = this.baseline.createSnapshot(
      cases[0]?.jurisdiction_id || 'unknown',
      cases.map(c => ({
        conviction: c.conviction,
        sentence_months: c.sentence_months,
        days_to_disposition: c.days_to_disposition,
        race_ethnicity: c.race_ethnicity,
        offense_severity: c.offense_severity,
        missing_fields: c.missing_fields
      }))
    );
    
    // Step 3: Export data for R analysis
    const rInput = this.prepareRInput(cases);
    
    // Step 4: Verify data quality
    const qualityReport = this.provenance.getQualityReport();
    
    return {
      snapshot_id: snapshot.snapshot_id,
      case_count: cases.length,
      conviction_rate: snapshot.key_statistics.conviction_rate,
      data_quality_score: qualityReport.avgQualityScore,
      disconfirmation_passed: false, // Set by R analysis
      pre_registration_id: '' // Set by pre-registration system
    };
  }
  
  /**
   * Prepare data for R analysis in the format expected by akashicjustice.R
   */
  private prepareRInput(cases: AnalysisInput['cases']): object {
    return {
      cases: cases.map(c => ({
        id: c.id,
        jurisdiction_id: c.jurisdiction_id,
        race_ethnicity: c.race_ethnicity,
        gender: c.gender,
        age_at_arrest: c.age_at_arrest,
        offense_severity: c.offense_severity,
        charge_type: c.charge_type,
        conviction: c.conviction,
        sentence_months: c.sentence_months,
        days_to_disposition: c.days_to_disposition,
        completeness_score: c.completeness_score
      })),
      metadata: {
        source: cases[0]?.source_connector,
        version: cases[0]?.source_version,
        ingested_at: new Date().toISOString()
      }
    };
  }
  
  /**
   * Get quality report for data assessment
   */
  getQualityReport() {
    return this.provenance.getQualityReport();
  }
  
  /**
   * Get historical baselines for temporal comparison
   */
  getBaselines(jurisdictionId?: string) {
    return jurisdictionId
      ? this.baseline.getSnapshots(jurisdictionId)
      : Array.from(this.baseline.snapshots.values());
  }
  
  /**
   * Detect change points in conviction rates
   */
  detectChangePoints(jurisdictionId: string) {
    return this.baseline.detectChangePoints(jurisdictionId);
  }
}

export default AnalysisIntegration;
