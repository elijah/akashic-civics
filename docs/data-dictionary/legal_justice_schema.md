# Akashic Legal Justice Data Dictionary

This dictionary defines the standardized schema for all legal/justice data in the Akashic system.

## Field Definitions

### Core Identifiers
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique case identifier | "case-12345" |
| jurisdiction_id | string | Court/jurisdiction ID | "putnam-county-tn" |
| jurisdiction_name | string | Human-readable jurisdiction name | "Putnam County, TN" |
| source_connector | string | Data source (CSV, API, etc.) | "tn_courts_api_v2" |
| source_version | string | Version of source data | "2024.01.15" |
| ingestion_timestamp | ISO String | When data entered system | "2024-01-15T14:30:00Z" |

### Demographics (Privacy-Preserving Options)
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| race_ethnicity | categorical | Race/ethnicity | "White (Non-Hispanic)", "Black or African American", "Hispanic or Latino", "Asian", "Native American or Alaska Native", "Native Hawaiian or Pacific Islander", "Two or More Races", "Other", "Unknown", "Prefer not to say" |
| gender | categorical | Gender identity | "Male", "Female", "Non-binary", "Other", "Unknown", "Prefer not to say" |
| age_at_arrest | numeric (0-120) | Age at time of arrest | 32 |

### Case Timeline Timestamps
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| arrest_date | ISO String | Date of arrest | "2024-01-15" |
| filing_date | ISO String | Date charges filed | "2024-01-16" |
| disposition_date | ISO String | Date case resolved | "2024-03-15" |
| sentencing_date | ISO String | Date of sentencing (if convicted) | "2024-04-01" |

### Offense Information
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| offense_severity | ordinal | Severity of charged offense | felony_level_1 (most severe), felony_level_2, ..., felony_level_7 (least severe felony), misdemeanor_a (most severe misdemeanor), misdemeanor_b, misdemeanor_c, misdemeanor_d (least severe misdemeanor), infraction, unknown |
| offense_description | string | Text description of offense | "Possession with intent to distribute" |
| statute_code | string | Legal statute violated | "TCA 39-17-417" |
| charge_type | categorical | Type of offense | "felony", "misdemeanor", "infraction" |

### Case Outcomes
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| conviction | binary | Whether resulted in conviction | 0 = no conviction, 1 = conviction |
| conviction_type | categorical | Type of conviction (if convicted) | "guilty_plea", "trial_conviction", "no_contest", etc. |
| sentence_months | integer | Length of incarceration sentence in months | 24 |
| probation_months | integer | Length of probation sentence in months | 12 |
| fines_amount | numeric | Monetary fines imposed | 500.00 |
| restitution_amount | numeric | Restitution ordered | 1000.00 |
| disposition_type | categorical | Final case disposition | "conviction", "dismissal", "acquitted", "diversion", "deferred_prosecution", "nolle_prosequi", "dead_docket" |
| disposition_description | string | Additional details about disposition | "Case dismissed due to lack of evidence" |

### Processing Metrics
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| days_to_disposition | integer | Days from arrest to disposition | 60 |
| days_to_sentencing | integer | Days from conviction to sentencing | 30 |

### Court and Legal Actors
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| judge_id | string | Judge identifier | "judge-001" |
| judge_name | string | Judge name | "Hon. Jane Smith" |
| prosecutor_office | string | Prosecutor office | "District Attorney's Office" |
| attorney_type | string | Attorney representation type | "public_defender", "private_attorney", "pro_se" |

### Bail/Bond Information
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| bail_amount | numeric | Bail amount set | 5000.00 |
| bail_posted | binary | Whether bail was posted | 0 = not posted, 1 = posted |

### Data Quality and Provenance
| Field | Type | Description |
|-------|------|-------------|
| missing_fields | string[] | List of fields that were missing in source data |
| data_quality_flags | string[] | Quality issues identified during processing |
| completeness_score | integer (0-100) | Score of data completeness based on non-missing core fields |

### Additional Case-Specific Data
| Field | Type | Description |
|-------|------|-------------|
| [key: string]: any | flexible | Extension fields for jurisdiction-specific data |

## Data Quality Assessment Framework

Each case receives a quality score (0-100) based on:

### Completeness (40 points)
- Core fields present: id, jurisdiction_id, dates, demographics, offense, outcome (20 points)
- Derived variables calculable (20 points)

### Consistency (30 points)
- Logical date sequence (arrest ≤ filing ≤ disposition ≤ sentencing) (15 points)
- Demographic plausibility (age appropriate for charges) (10 points)
- Charge-outcome consistency (5 points)

### Plausibility (20 points)
- Sentence length appropriate for offense (10 points)
- No impossible combinations (e.g., felony with 0 sentence) (10 points)

### Source Reliability (10 points)
- Source connector reputation score
- Historical accuracy of this data source

## Standard Values & Mappings

### Offense Severity Hierarchy
```javascript
const OFFENSE_SEVERITY_LEVELS = [
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
];
```

### Standardized Demographic Categories (with privacy-preserving options)
- **Race/Ethnicity**: White (Non-Hispanic), Black or African American, Hispanic or Latino, Asian, Native American or Alaska Native, Native Hawaiian or Pacific Islander, Two or More Races, Other, Unknown, Prefer not to say
- **Gender**: Male, Female, Non-binary, Other, Unknown, Prefer not to say

### Standardized Outcome Categories
- conviction, dismissal, acquitted, diversion, deferred_prosecution, nolle_prosequi, dead_docket, unknown

### Data Quality Flag Constants
- missing_demographics
- inconsistent_dates
- invalid_offense_code
- out_of_range_sentence
- conflicting_disposition
- missing_bail_info
- duplicate_case_id
- temporal_anomaly

## Implementation Notes

1. **Missing Data Strategy**:
   - Use multiple imputation for analysis (not for data storage)
   - Track missingness patterns for bias assessment
   - Flag cases with >30% missing core fields for review

2. **Temporal Validity**:
   - All dates must be valid ISO 8601 strings
   - Future dates flagged as potential errors
   - Extremely old dates (>100 years) flagged

3. **Geographic Consistency**:
   - jurisdiction_id must match known court codes
   - Cross-reference with FIPS codes where applicable

4. **Privacy Protections**:
   - No PII stored (names, addresses, SSNs)
   - Demographic data coarsened where necessary
   - Small cell sizes (<5) suppressed in reports

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial schema definition |
| 1.1.0 | 2024-03-01 | Added socioeconomic_proxy, derived variables |
| 1.2.0 | 2024-06-15 | Enhanced quality assessment framework |
| 2.0.0 | 2024-10-08 | Complete redesign per PLAN_STATISTICAL_RIGOR.md |