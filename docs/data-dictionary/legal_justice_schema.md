# Akashic Legal Justice Data Dictionary

This dictionary defines the standardized schema for all legal/justice data in the Akashic system.

## Field Definitions

### Core Identifiers
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| case_id | string | Unique case identifier | "case-12345" |
| jurisdiction_id | string | Court/jurisdiction ID | "putnam-county-tn" |
| jurisdiction_name | string | Human-readable jurisdiction name | "Putnam County, TN" |
| source_connector | string | Data source (CSV, API, etc.) | "tn_courts_api_v2" |
| source_version | string | Version of source data | "2024.01.15" |
| ingestion_timestamp | ISO String | When data entered system | "2024-01-15T14:30:00Z" |

### Demographics (Privacy-Preserving Options)
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| race_ethnicity | categorical | Race/ethnicity | "White", "Black", "Hispanic", "Asian", "Native American", "Other", "Unknown" |
| gender | categorical | Gender identity | "male", "female", "non_binary", "unknown" |
| age_at_arrest | numeric (0-120) | Age at time of arrest | 32 |
| socioeconomic_proxy | categorical | SES indicator (area-based) | "low", "moderate", "high", "unknown" |
| education_level | categorical | Highest education completed | "less_than_hs", "hs_ged", "some_college", "bachelors", "graduate", "unknown" |

### Charge Characteristics
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| offense_severity | ordinal | Severity of charged offense | "infraction", "violation", "misdemeanor_second", "misdemeanor_first", "felony_third", "felony_second", "felony_first" |
| charge_type | categorical | Type of offense | "violent", "property", "drug", "public_order", "white_collar", "other" |
| is_violent | boolean | Whether offense involves violence | true/false |
| mandatory_minimum | boolean | Whether charge carries mandatory minimum | true/false |
| specific_statute | string | Exact statute charged | "TCA 39-13-202" |
| charge_count | integer | Number of separate charges | 3 |

### Case Processing Timeline
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| arrest_date | ISO String | Date of arrest | "2024-01-15" |
| charge_date | ISO String | Date charges filed | "2024-01-16" |
| arraignment_date | ISO String | Date of arraignment | "2024-01-20" |
| plea_date | ISO String | Date of plea entry | "2024-02-01" |
| disposition_date | ISO String | Date case resolved | "2024-03-15" |
| days_to_disposition | integer | Days from arrest to disposition | 60 |

### Outcomes
| Field | Type | Description | Values |
|-------|------|-------------|---------|
| disposition | categorical | Final case outcome | "dismissed", "convicted", "acquitted", "diverted", "pending" |
| conviction | binary | Whether resulted in conviction | 0/1 |
| conviction_type | categorical | Type of conviction (if convicted) | "guilty_plea", "bench_trial", "jury_trial", "no_contest" |
| sentence_type | categorical | Sentence imposed | "probation", "jail", "prison", "fine", "community_service", "none" |
| sentence_months | integer | Length of incarceration (if applicable) | 12 |
| fine_amount | numeric | Monetary fine imposed | 500.00 |
| restitution_amount | numeric | Restitution ordered | 1000.00 |
| probation_months | integer | Length of probation (if applicable) | 24 |

### Data Quality Fields
| Field | Type | Description |
|-------|------|-------------|
| completeness_score | integer (0-100) | Percentage of non-missing core fields |
| data_quality_flags | string[] | Quality issues detected |
| missing_fields | string[] | List of fields with missing values |
| inconsistent_dates | boolean | Whether date sequence is logical |
| outlier_flags | string[] | Detected statistical outliers |

### Derived Variables (For Analysis)
| Field | Type | Description | Calculation |
|-------|------|-------------|-------------|
| offense_severity_score | numeric (0-6) | Numeric severity score | infraction=0, violation=1, misd_2=2, misd_1=3, felony_3=4, felony_2=5, felony_1=6 |
| charge_severity_weight | numeric | Weight for regression models | Based on historical sentencing data |
| prior_record_proxy_score | numeric (0-4) | Prior record severity | none=0, minor=1, moderate=2, serious=3, unknown=NA |
| risk_score | numeric | Composite risk score | Function of age, priors, offense type |
| has_missing_demographics | boolean | True if race/gender/age missing | Derived logic |

## Data Quality Assessment Framework

Each case receives a quality score (0-100) based on:

### Completeness (40 points)
- Core fields present: case_id, jurisdiction, dates, demographics, charge, outcome (20 points)
- Derived variables calculable (20 points)

### Consistency (30 points)
- Logical date sequence (arrest ≤ charge ≤ disposition) (15 points)
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
const SEVERITY_ORDER = [
  "infraction",      // 0
  "violation",       // 1
  "misdemeanor_second", // 2
  "misdemeanor_first",  // 3
  "felony_third",    // 4
  "felony_second",   // 5
  "felony_first"     // 6
];
```

### Charge Type Categories
- **violent**: homicide, assault, robbery, rape, kidnapping
- **property**: burglary, theft, motor vehicle theft, arson
- **drug**: possession, trafficking, manufacturing
- **public_order**: disorderly conduct, trespassing, loitering
- **white_collar**: fraud, embezzlement, forgery, tax evasion
- **other**: traffic, wildlife, regulatory

### Disposition Mapping for Binary Outcomes
```javascript
// For conviction analysis:
const CONVICTION_DISPOSITIONS = ["convicted", "guilty_plea", "no_contest"];
const NON_CONVICTION_DISPOSITIONS = ["dismissed", "acquitted", "diverted"];
```

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