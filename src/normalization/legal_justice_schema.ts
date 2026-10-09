/**
 * Legal Justice Data Schema
 * 
 * Standardized schema that all legal/justice data flows through to enable
 * consistent analysis across different jurisdictions and data sources.
 * 
 * Fields follow the specification in PLAN_STATISTICAL_RIGOR.md Section 1.1:
 * - Standardized offense severity coding
 * - Uniform demographic fields (privacy-preserving options)
 * - Consistent case processing timestamps
 * - Standardized outcome categories
 * - Data quality flags
 */

export interface LegalJusticeCase {
  /** Unique identifier for the case */
  id: string;
  
  /** Jurisdiction where the case originated */
  jurisdiction_id: string;
  jurisdiction_name?: string;
  
  /** Demographic information (privacy-preserving options) */
  race_ethnicity?: string;      // Standardized categories
  gender?: string;              // M/F/Non-binary/Other/Unknown
  age_at_arrest?: number;       // In years
  
  /** Case timeline timestamps */
  arrest_date?: string;         // ISO timestamp
  filing_date?: string;         // ISO timestamp  
  disposition_date?: string;    // ISO timestamp
  sentencing_date?: string;     // ISO timestamp
  
  /** Offense information */
  offense_severity?: string;    // felony_level_1, felony_level_2, ..., misdemeanor_a, misdemeanor_b, etc.
  offense_description?: string; // Text description of offense
  statute_code?: string;        // Legal statute violated
  charge_type?: string;         // felony, misdemeanor, infraction, etc.
  
  /** Case outcomes */
  conviction?: number;          // 0 = no conviction, 1 = conviction
  conviction_type?: string;     // guilty_plea, trial_conviction, etc.
  sentence_months?: number;     // Length of incarceration sentence in months
  probation_months?: number;    // Length of probation sentence in months
  fines_amount?: number;        // Monetary fines in local currency
  restitution_amount?: number;  // Restitution ordered
  
  /** Case disposition */
  disposition_type?: string;    // conviction, dismissal, acquittal, diversion, deferred_prosecution, etc.
  disposition_description?: string;
  
  /** Processing metrics */
  days_to_disposition?: number; // Days from arrest to disposition
  days_to_sentencing?: number;  // Days from conviction to sentencing
  
  /** Court and legal actors */
  judge_id?: string;
  judge_name?: string;
  prosecutor_office?: string;
  attorney_type?: string;       // public_defender, private_attorney, pro_se, etc.
  
  /** Bail/bond information */
  bail_amount?: number;
  bail_posted?: number;         // 0 = not posted, 1 = posted
  
  /** Data quality and provenance */
  source_connector?: string;    // Which connector/source provided this data
  source_version?: string;      // Version of the source connector
  ingestion_timestamp?: string; // When data was ingested into pipeline
  missing_fields?: string[];    // List of fields that were missing in source data
  data_quality_flags?: string[]; // Quality issues identified during processing
  completeness_score?: number;  // 0-100 score of data completeness
  
  /** Additional case-specific data */
  [key: string]: any;           // Allow for extension by specific jurisdictions
}

/**
 * Standardized offense severity levels for consistent analysis
 */
export const OFFENSE_SEVERITY_LEVELS = [
  'felony_level_1',   // Most severe (e.g., capital murder)
  'felony_level_2',   // (e.g., first-degree murder, kidnapping)
  'felony_level_3',   // (e.g., second-degree murder, rape)
  'felony_level_4',   // (e.g., robbery, aggravated assault)
  'felony_level_5',   // (e.g., burglary, drug trafficking)
  'felony_level_6',   // (e.g., possession with intent, theft)
  'felony_level_7',   // Least severe felony
  'misdemeanor_a',    // Most severe misdemeanor
  'misdemeanor_b',    // (e.g., simple assault, petty theft)
  'misdemeanor_c',    // (e.g., disorderly conduct, trespassing)
  'misdemeanor_d',    // Least severe misdemeanor
  'infraction',       // Traffic violations, minor offenses
  'unknown'
] as const;

export type OffenseSeverityLevel = typeof OFFENSE_SEVERITY_LEVELS[number];

/**
 * Standardized demographic categories (with privacy-preserving options)
 */
export const DEMOGRAPHIC_CATEGORIES = {
  race_ethnicity: [
    'White (Non-Hispanic)',
    'Black or African American',
    'Hispanic or Latino',
    'Asian',
    'Native American or Alaska Native',
    'Native Hawaiian or Pacific Islander',
    'Two or More Races',
    'Other',
    'Unknown',
    'Prefer not to say'  // Privacy-preserving option
  ] as const,
  
  gender: [
    'Male',
    'Female', 
    'Non-binary',
    'Other',
    'Unknown',
    'Prefer not to say'  // Privacy-preserving option
  ] as const
};

export type RaceEthnicityCategory = typeof DEMOGRAPHIC_CATEGORIES.race_ethnicity[number];
export type GenderCategory = typeof DEMOGRAPHIC_CATEGORIES.gender[number];

/**
 * Standardized outcome categories
 */
export const OUTCOME_CATEGORIES = [
  'conviction',
  'dismissal', 
  'acquittal',
  'diversion',
  'deferred_prosecution',
  'nolle_prosequi',
  'dead_docket',
  'unknown'
] as const;

export type OutcomeCategory = typeof OUTCOME_CATEGORIES[number];

/**
 * Data quality flag constants
 */
export const DATA_QUALITY_FLAGS = [
  'missing_demographics',
  'inconsistent_dates',
  'invalid_offense_code',
  'out_of_range_sentence',
  'conflicting_disposition',
  'missing_bail_info',
  'duplicate_case_id',
  'temporal_anomaly'
] as const;

export type DataQualityFlag = typeof DATA_QUALITY_FLAGS[number];