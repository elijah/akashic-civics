/**
 * Data Normalizer
 * 
 * Transforms raw legal/justice data into the standardized LegalJusticeCase schema.
 * Handles data quality flags, missing fields, and transformation history.
 * 
 * Part of Phase 1.1 (Data Normalization Layer) per PLAN_STATISTICAL_RIGOR.md
 */

import {
  LegalJusticeCase,
  OFFENSE_SEVERITY_LEVELS,
  DEMOGRAPHIC_CATEGORIES,
  OUTCOME_CATEGORIES,
  OffenseSeverityLevel,
  RaceEthnicityCategory,
  GenderCategory,
  OutcomeCategory
} from './legal_justice_schema';

export interface TransformationStep {
  step: string;
  timestamp: string;
  description: string;
  parameters: Record<string, any>;
}

export interface NormalizationResult {
  cases: LegalJusticeCase[];
  provenance: {
    source_connector: string;
    source_version: string;
    ingestion_timestamp: string;
    raw_data_reference?: string;
    transformation_history: TransformationStep[];
  };
  quality_assessment: {
    total_processed: number;
    valid_cases: number;
    rejected_cases: number;
    missing_demographics_rate: number;
    overall_completeness_score: number;
    common_quality_issues: Record<string, number>;
  };
}

/**
 * Schema validation results for raw input data
 */
export interface ValidationResults {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  rawCount: number;
  validCount: number;
  invalidCount: number;
  summary: {
    missingIds: number;
    missingJurisdiction: number;
    malformedDates: number;
    negativeNumbers: number;
    unrecognizedRaces: number;
    unrecognizedGenders: number;
  };
}

export class DataNormalizer {
  private transformationHistory: TransformationStep[] = [];
  
  constructor(
    private sourceConnector: string = 'unknown',
    private sourceVersion: string = '1.0.0'
  ) {}
  
  /**
   * Validate raw input data before normalization
   * Returns detailed validation results with issues and warnings
   */
  validateRawData(rawCases: any[]): ValidationResults {
    const results: ValidationResults = {
      isValid: true,
      issues: [],
      warnings: [],
      rawCount: rawCases.length,
      validCount: 0,
      invalidCount: 0,
      summary: {
        missingIds: 0,
        missingJurisdiction: 0,
        malformedDates: 0,
        negativeNumbers: 0,
        unrecognizedRaces: 0,
        unrecognizedGenders: 0,
      }
    };
    
    if (!Array.isArray(rawCases)) {
      results.isValid = false;
      results.issues.push('Input must be an array');
      return results;
    }
    
    for (const raw of rawCases) {
      if (!raw || typeof raw !== 'object') {
        results.invalidCount++;
        results.issues.push('Invalid case: not an object');
        continue;
      }
      
      // Check for case ID
      const id = raw.id || raw.case_id || raw.caseNumber;
      if (!id || String(id).trim() === '') {
        results.summary.missingIds++;
        results.warnings.push('Case missing ID');
      }
      
      // Check for jurisdiction
      const jurisdiction = raw.jurisdiction_id || raw.jurisdictionId || raw.county;
      if (!jurisdiction || String(jurisdiction).trim() === '') {
        results.summary.missingJurisdiction++;
        results.warnings.push('Case missing jurisdiction');
      }
      
      // Check for valid dates
      const dateFields = ['arrest_date', 'arrestDate', 'date_of_arrest',
        'filing_date', 'filingDate', 'filed_date',
        'disposition_date', 'dispositionDate',
        'sentencing_date', 'sentencingDate', 'sentence_date'];
      for (const field of dateFields) {
        if (raw[field]) {
          const date = new Date(raw[field]);
          if (isNaN(date.getTime())) {
            results.summary.malformedDates++;
            results.warnings.push(`Invalid date in field: ${field}`);
          }
        }
      }
      
      // Check for negative numbers in numeric fields
      const numericFields = ['age_at_arrest', 'age', 'sentence_months',
        'sentenceMonths', 'probation_months', 'probationMonths',
        'fines_amount', 'fines', 'fine_amount', 'bail_amount', 'bail'];
      for (const field of numericFields) {
        if (raw[field] !== undefined && raw[field] !== null) {
          const val = typeof raw[field] === 'number' ? raw[field] : parseFloat(raw[field]);
          if (!isNaN(val) && val < 0) {
            results.summary.negativeNumbers++;
            results.warnings.push(`Negative value in ${field}: ${raw[field]}`);
          }
        }
      }
      
      // Check for recognized race/ethnicity
      const race = raw.race_ethnicity || raw.race || raw.ethnicity;
      if (race && String(race).trim() !== '') {
        const raceLower = String(race).trim().toLowerCase();
        const knownRaces = ['white', 'black', 'african american', 'hispanic', 'hispanic/latino',
          'hispanic or latino', 'latino', 'latina', 'asian', 'native american',
          'indian', 'native hawaiian', 'pacific islander', 'two or more',
          'multiracial', 'other', 'unknown', 'prefer not to say'];
        if (!knownRaces.includes(raceLower)) {
          results.summary.unrecognizedRaces++;
          results.warnings.push(`Unrecognized race: ${race}`);
        }
      }
      
      // Check for recognized gender
      const gender = raw.gender;
      if (gender && String(gender).trim() !== '') {
        const genderLower = String(gender).trim().toLowerCase();
        const knownGenders = ['male', 'm', 'female', 'f', 'non-binary', 'nonbinary',
          'other', 'unknown', 'prefer not to say'];
        if (!knownGenders.includes(genderLower)) {
          results.summary.unrecognizedGenders++;
          results.warnings.push(`Unrecognized gender: ${gender}`);
        }
      }
      
      results.validCount++;
    }
    
    results.isValid = results.invalidCount === 0;
    return results;
  }
  
  /**
   * Normalize raw case data into the standardized schema
   */
  normalize(rawCases: any[], rawDataReference?: string): NormalizationResult {
    const timestamp = new Date().toISOString();
    const startTime = timestamp;
    
    this.transformationHistory = [{
      step: 'normalization_start',
      timestamp,
      description: 'Starting data normalization',
      parameters: { sourceConnector: this.sourceConnector, sourceVersion: this.sourceVersion, inputCount: rawCases.length }
    }];
    
    const validCases: LegalJusticeCase[] = [];
    const rejectedCases: any[] = [];
    const qualityIssues: Record<string, number> = {};
    let missingDemographicsCount = 0;
    
    for (const rawCase of rawCases) {
      try {
        const normalized = this.normalizeCase(rawCase);
        
        const missingFields = normalized.missing_fields || [];
        if (missingFields.length > 0) {
          normalized.data_quality_flags = normalized.data_quality_flags || [];
          normalized.data_quality_flags.push('missing_fields');
          missingFields.forEach(field => {
            const flag = `missing_${field}`;
            qualityIssues[flag] = (qualityIssues[flag] || 0) + 1;
          });
        }
        
        if (!normalized.race_ethnicity || normalized.race_ethnicity === 'Unknown') {
          missingDemographicsCount++;
        }
        
        validCases.push(normalized);
      } catch (_error) {
        rejectedCases.push(rawCase);
        qualityIssues['normalization_error'] = (qualityIssues['normalization_error'] || 0) + 1;
      }
    }
    
    this.transformationHistory.push({
      step: 'normalization_complete',
      timestamp: new Date().toISOString(),
      description: 'Data normalization complete',
      parameters: { totalProcessed: rawCases.length, validCases: validCases.length, rejectedCases: rejectedCases.length }
    });
    
    const overallCompleteness = rawCases.length > 0 
      ? ((validCases.length / rawCases.length) * 100) 
      : 0;
    
    return {
      cases: validCases,
      provenance: {
        source_connector: this.sourceConnector,
        source_version: this.sourceVersion,
        ingestion_timestamp: startTime,
        raw_data_reference: rawDataReference,
        transformation_history: this.transformationHistory
      },
      quality_assessment: {
        total_processed: rawCases.length,
        valid_cases: validCases.length,
        rejected_cases: rejectedCases.length,
        missing_demographics_rate: rawCases.length > 0 ? missingDemographicsCount / rawCases.length : 0,
        overall_completeness_score: Math.round(overallCompleteness * 10) / 10,
        common_quality_issues: Object.entries(qualityIssues)
          .sort((a, b) => b[1] - a[1])
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      }
    };
  }
  
  /**
   * Normalize a single raw case into the LegalJusticeCase schema
   */
  private normalizeCase(raw: any): LegalJusticeCase {
    const missingFields: string[] = [];
    
    const normalized: LegalJusticeCase = {
      id: this.normalizeString(raw.id, raw.case_id, raw.caseNumber) || this.generateId(),
      jurisdiction_id: this.normalizeString(raw.jurisdiction_id, raw.jurisdictionId, raw.county) || 'unknown',
      jurisdiction_name: this.normalizeString(raw.jurisdiction_name, raw.jurisdictionName, raw.county_name),
      race_ethnicity: this.normalizeRaceEthnicity(raw.race_ethnicity, raw.race, raw.ethnicity),
      gender: this.normalizeGender(raw.gender),
      age_at_arrest: this.normalizeNumber(raw.age_at_arrest, raw.age, raw.age_at_arrest),
      arrest_date: this.normalizeDate(raw.arrest_date, raw.arrestDate, raw.date_of_arrest),
      filing_date: this.normalizeDate(raw.filing_date, raw.filingDate, raw.filed_date),
      disposition_date: this.normalizeDate(raw.disposition_date, raw.dispositionDate, raw.disposition_date),
      sentencing_date: this.normalizeDate(raw.sentencing_date, raw.sentencingDate, raw.sentence_date),
      offense_severity: this.normalizeOffenseSeverity(raw.offense_severity, raw.severity, raw.offense_level),
      offense_description: this.normalizeString(raw.offense_description, raw.offenseDescription, raw.charge_description),
      statute_code: this.normalizeString(raw.statute_code, raw.statuteCode, raw.statute),
      charge_type: this.normalizeChargeType(raw.charge_type, raw.chargeType, raw.offense_category),
      conviction: this.normalizeBinary(raw.conviction, raw.was_convicted, raw.found_guilty),
      conviction_type: this.normalizeString(raw.conviction_type, raw.convictionType, raw.verdict),
      sentence_months: this.normalizeNumber(raw.sentence_months, raw.sentenceMonths, raw.incarceration_months),
      probation_months: this.normalizeNumber(raw.probation_months, raw.probationMonths),
      fines_amount: this.normalizeNumber(raw.fines_amount, raw.fines, raw.fine_amount),
      restitution_amount: this.normalizeNumber(raw.restitution_amount, raw.restitution),
      disposition_type: this.normalizeOutcomeCategory(raw.disposition_type, raw.disposition, raw.outcome),
      disposition_description: this.normalizeString(raw.disposition_description, raw.dispositionDescription),
      days_to_disposition: this.normalizeNumber(raw.days_to_disposition, raw.daysToDisposition, raw.processing_days),
      days_to_sentencing: this.normalizeNumber(raw.days_to_sentencing, raw.daysToSentencing),
      judge_id: this.normalizeString(raw.judge_id, raw.judgeId),
      judge_name: this.normalizeString(raw.judge_name, raw.judgeName),
      prosecutor_office: this.normalizeString(raw.prosecutor_office, raw.prosecutorOffice, raw.prosecutor),
      attorney_type: this.normalizeString(raw.attorney_type, raw.attorneyType, raw.representation_type),
      bail_amount: this.normalizeNumber(raw.bail_amount, raw.bail, raw.bail_amount_usd),
      bail_posted: this.normalizeBinary(raw.bail_posted, raw.bailPosted, raw.bail_paid),
      source_connector: this.sourceConnector,
      source_version: this.sourceVersion,
      ingestion_timestamp: new Date().toISOString(),
      missing_fields: missingFields,
      data_quality_flags: [],
      completeness_score: 0  // Calculated after normalization
    };
    
    // Track missing core fields
    const coreFields = ['race_ethnicity', 'conviction', 'sentence_months', 'offense_severity'];
    for (const field of coreFields) {
      if (normalized[field as keyof LegalJusticeCase] == null || 
          normalized[field as keyof LegalJusticeCase] === '' ||
          normalized[field as keyof LegalJusticeCase] === 'Unknown') {
        missingFields.push(field);
      }
    }
    
    // Calculate completeness score
    const totalCoreFields = coreFields.length;
    const missingCoreCount = missingFields.length;
    normalized.completeness_score = totalCoreFields > 0 
      ? Math.round(((totalCoreFields - missingCoreCount) / totalCoreFields) * 100) 
      : 0;
    
    return normalized;
  }
  
  /**
   * Normalize a string field, trying multiple possible key names
   */
  private normalizeString(...values: (string | undefined | null)[]): string | undefined {
    for (const val of values) {
      if (val != null && val !== 'null' && val !== 'undefined') {
        const trimmed = String(val).trim();
        if (trimmed !== '') {
          return trimmed;
        }
      }
    }
    return undefined;
  }
  
  /**
   * Normalize a numeric field
   * Handles strings with currency symbols, thousands separators, and decimals
   */
  private normalizeNumber(...values: (number | string | undefined | null)[]): number | undefined {
    for (const val of values) {
      if (val == null) continue;
      if (typeof val === 'number' && !isNaN(val)) return val;
if (typeof val === 'string') {
      // Handle parentheses as negative numbers
      let isNegative = false;
      let cleaned = val;
      if (val.startsWith('(') && val.endsWith(')')) {
        isNegative = true;
        cleaned = val.substring(1, val.length - 1);
      }
      
      // Remove common formatting: currency symbols, thousands separators
      cleaned = cleaned
        .replace(/[^0-9.\-]/g, '')
        .replace(/--/g, '-');           // Handle malformed negative markers
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return isNegative ? -parsed : parsed;
    }
    }
    return undefined;
  }
  
  /**
   * Normalize a date field
   * Tries Date constructor, then common string formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
   * Validates that parsed date matches input components to reject invalid dates like Feb 30
   */
  private normalizeDate(...values: (string | undefined | null)[]): string | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const str = String(val).trim();
      
      // Helper: validate that a constructed date matches expected year/month/day
      const matchesExpectedDate = (d: Date, y: number, m: number, day: number): boolean => {
        return !isNaN(d.getTime()) &&
               d.getFullYear() === y &&
               d.getMonth() === m - 1 &&
               d.getDate() === day;
      };
      
      // Try ISO/numeric format first (YYYY-MM-DD or YYYY/MM/DD)
      const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        const y = parseInt(year), m = parseInt(month), d = parseInt(day);
        const parsed = new Date(y, m - 1, d);
        if (matchesExpectedDate(parsed, y, m, d)) {
          // Use UTC to ensure consistent midnight output
          return new Date(Date.UTC(y, m - 1, d)).toISOString();
        }
        // Invalid date (e.g., Feb 30) - continue to try other formats
      } else {
        // Try native Date constructor for other formats
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          // For non-ISO formats, just accept if date is valid
          return date.toISOString();
        }
      }
      
      // Try MM/DD/YYYY format
      const mmddyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyy) {
        const [, month, day, year] = mmddyy;
        const y = parseInt(year), m = parseInt(month), d = parseInt(day);
        const parsed = new Date(y, m - 1, d);
        if (matchesExpectedDate(parsed, y, m, d)) {
          return new Date(Date.UTC(y, m - 1, d)).toISOString();
        }
      }
      
      // Try DD-MM-YYYY or DD/MM/YYYY format
      const ddmm = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (ddmm) {
        const [, a, b, year] = ddmm;
        const y = parseInt(year), v1 = parseInt(a), v2 = parseInt(b);
        // Try DD/MM/YYYY interpretation (a=day, b=month)
        const d1 = new Date(y, v2 - 1, v1);
        if (matchesExpectedDate(d1, y, v2, v1)) {
          return new Date(Date.UTC(y, v2 - 1, v1)).toISOString();
        }
        // Try MM/DD/YYYY interpretation (a=month, b=day)
        const d2 = new Date(y, v1 - 1, v2);
        if (matchesExpectedDate(d2, y, v1, v2)) {
          return new Date(Date.UTC(y, v1 - 1, v2)).toISOString();
        }
      }
    }
    return undefined;
  }
  
  /**
   * Normalize binary fields (0/1, true/false, yes/no)
   */
  private normalizeBinary(...values: (any | undefined | null)[]): number | undefined {
    for (const val of values) {
      if (val == null) continue;
      if (typeof val === 'number') return val === 1 ? 1 : val === 0 ? 0 : undefined;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        if (['1', 'true', 'yes', 'convicted', 'guilty', 'posted', 'yes'].includes(lower)) return 1;
        if (['0', 'false', 'no', 'not convicted', 'not guilty', 'not posted', 'no'].includes(lower)) return 0;
      }
    }
    return undefined;
  }
  
  /**
   * Normalize race/ethnicity to standard categories
   */
  private normalizeRaceEthnicity(...values: (string | undefined | null)[]): RaceEthnicityCategory | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const normalized = String(val).trim();
      
      // Map common variations to standard categories
      const categoryMap: Record<string, RaceEthnicityCategory> = {
        'white': 'White (Non-Hispanic)',
        'black': 'Black or African American',
        'african american': 'Black or African American',
        'hispanic': 'Hispanic or Latino',
        'hispanic/latino': 'Hispanic or Latino',
        'hispanic or latino': 'Hispanic or Latino',
        'latino': 'Hispanic or Latino',
        'latina': 'Hispanic or Latino',
        'asian': 'Asian',
        'native american': 'Native American or Alaska Native',
        'indian': 'Native American or Alaska Native',
        'native hawaiian': 'Native Hawaiian or Pacific Islander',
        'pacific islander': 'Native Hawaiian or Pacific Islander',
        'two or more': 'Two or More Races',
        'multiracial': 'Two or More Races',
        'other': 'Other',
        'unknown': 'Unknown',
        'prefer not to say': 'Prefer not to say'
      } as Record<string, RaceEthnicityCategory>;
      
      const lower = normalized.toLowerCase();
      if (categoryMap[lower]) return categoryMap[lower];
      
      // Check if it matches any category directly
      for (const cat of DEMOGRAPHIC_CATEGORIES.race_ethnicity) {
        if (lower.includes(cat.toLowerCase().split('(')[0].trim())) {
          return cat;
        }
      }
    }
    return 'Unknown';
  }
  
  /**
   * Normalize gender to standard categories
   */
  private normalizeGender(...values: (string | undefined | null)[]): GenderCategory | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const normalized = String(val).trim().toLowerCase();
      
      const categoryMap: Record<string, GenderCategory> = {
        'male': 'Male',
        'm': 'Male',
        'female': 'Female',
        'f': 'Female',
        'non-binary': 'Non-binary',
        'nonbinary': 'Non-binary',
        'other': 'Other',
        'unknown': 'Unknown',
        'prefer not to say': 'Prefer not to say'
      };
      
      if (categoryMap[normalized]) return categoryMap[normalized];
    }
    return 'Unknown';
  }
  
  /**
   * Normalize offense severity to standard levels
   */
  private normalizeOffenseSeverity(...values: (string | number | undefined | null)[]): OffenseSeverityLevel | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const normalized = String(val).trim().toLowerCase().replace(/\s+/g, '_');
      
      // Map common variations
      const severityMap: Record<string, OffenseSeverityLevel> = {
        'felony_1': 'felony_level_1',
        'felony_2': 'felony_level_2',
        'felony_3': 'felony_level_3',
        'felony_4': 'felony_level_4',
        'felony_5': 'felony_level_5',
        'felony_6': 'felony_level_6',
        'felony_7': 'felony_level_7',
        'felony_level_1': 'felony_level_1',
        'felony_level_2': 'felony_level_2',
        'misdemeanor_a': 'misdemeanor_a',
        'misdemeanor_b': 'misdemeanor_b',
        'misdemeanor_c': 'misdemeanor_c',
        'misdemeanor_d': 'misdemeanor_d',
        'infraction': 'infraction',
        'violation': 'infraction'
      };
      
      if (severityMap[normalized]) return severityMap[normalized];
      
      // Check if it matches any level directly
      for (const level of OFFENSE_SEVERITY_LEVELS) {
        if (normalized.includes(level.toLowerCase().replace(/_/g, ' '))) {
          return level;
        }
      }
    }
    return undefined;
  }
  
  /**
   * Normalize charge type
   */
  private normalizeChargeType(...values: (string | undefined | null)[]): string | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const normalized = String(val).trim().toLowerCase();
      if (['felony', 'misdemeanor', 'infraction', 'violation', 'petty offense', 'traffic'].includes(normalized)) {
        return normalized;
      }
    }
    return undefined;
  }
  
  /**
   * Normalize outcome category
   */
  private normalizeOutcomeCategory(...values: (string | undefined | null)[]): OutcomeCategory | undefined {
    for (const val of values) {
      if (val == null || val === '') continue;
      const normalized = String(val).trim().toLowerCase().replace(/[\s\-]/g, '_');
      
      const outcomeMap: Record<string, OutcomeCategory> = {
        'conviction': 'conviction',
        'convicted': 'conviction',
        'dismissal': 'dismissal',
        'dismiss': 'dismissal',
        'acquittal': 'acquittal',
        'acquitted': 'acquittal',
        'diversion': 'diversion',
        'deferred_prosecution': 'deferred_prosecution',
        'deferred': 'deferred_prosecution',
        'nolle_prosequi': 'nolle_prosequi',
        'nolle': 'nolle_prosequi',
        'dead_docket': 'dead_docket',
        'dead': 'dead_docket'
      };
      
      if (outcomeMap[normalized]) return outcomeMap[normalized];
      
      for (const cat of OUTCOME_CATEGORIES) {
        if (normalized.includes(cat.toLowerCase().replace(/_/g, ' '))) {
          return cat;
        }
      }
    }
    return undefined;
  }
  
  /**
   * Generate a unique ID for cases without one
   */
  private generateId(): string {
    return `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}