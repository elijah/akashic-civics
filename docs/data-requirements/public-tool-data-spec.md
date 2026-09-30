# Data Requirements for Public Accountability Tools

## Overview
This document specifies the minimum data requirements for each public-facing accountability tool. The goal is to provide clear, understandable insights to everyday citizens about potential bias in their local justice systems.

## Shared Data Requirements (All Tools)

### Core Case-Level Data
| Field | Type | Required? | Notes |
|-------|------|-----------|-------|
| case_id | string | Yes | Unique identifier |
| jurisdiction_id | string | Yes | County/court identifier |
| jurisdiction_name | string | Yes | Human-readable name |
| race_ethnicity | string | Yes | Demographic group |
| age_at_arrest | numeric | Yes | For demographic analysis |
| gender | string | Yes | Secondary demographic |
| offense_severity | string | Yes | For matching comparable cases |
| offense_description | string | Yes | Human-readable offense |
| charge_type | string | Yes | Category (violent, property, etc.) |
| conviction | binary (0/1) | Yes | Ultimate outcome |
| sentence_months | numeric | Conditional | If sentenced |
| days_to_disposition | numeric | Yes | Case duration |
| disposition_date | date | Yes | For temporal analysis |
| disposition_type | string | Yes | Convicted, dismissed, etc. |
| plea_date | date | Conditional | If pled |
| is_violent | boolean | Yes | Violent offense flag |
| mandatory_minimum | boolean | Yes | Mandatory sentencing flag |
| prior_record_proxy | string | Yes | Criminal history level |

### Enhanced Data (for specific tools)
| Field | Type | Used By | Notes |
|-------|------|---------|-------|
| judge_name | string | Officials Tracker | Judge assigned to case |
| judge_id | string | Officials Tracker | Unique judge identifier |
| prosecutor_office | string | Officials Tracker | DA/PA office name |
| prosecutor_name | string | Officials Tracker | Lead prosecutor |
| court_location | string | Officials Tracker | Specific courtroom |
| court_id | string | Officials Tracker | Court identifier |
| filing_date | date | Temporal Analysis | Start of case timeline |
| arraignment_date | date | Temporal Analysis | First court appearance |
| plea_date | date | Temporal Analysis | When plea entered |
| trial_date | date | Temporal Analysis | Trial start |
| release_type | string | Pre-trial Detention | Cash, ROR, detained |
| bail_amount | numeric | Economic Impact | Bail amount set |
| attorney_type | string | Resource Disparity | Public/private |
| source_connector | string | Provenance | Data source identifier |
| ingestion_timestamp | ISO date | Timestamp | When data entered system |

## Data Requirements by Tool

### 1. Red Flag Report Generator

**Minimum Required:**
- jurisdiction_name, race_ethnicity, conviction, offense_severity
- 12+ months of data for trend analysis
- Minimum 30 cases per demographic group per year

**Calculates:**
- Conviction rates by race
- Sentence length disparities
- Temporal trends (year-over-year changes)
- Comparison to reference rates

**Example Output Fields:**
```
{
  jurisdiction: "Putnam County, TN",
  period: "2023-01-01 to 2023-12-31",
  metrics: [
    {
      name: "conviction_rate",
      black_rate: 0.68,
      white_rate: 0.52,
      disparity: 0.16,
      disparity_type: "percentage_point",
      direction: "higher_for_black"
    }
  ],
  reference_comparison: {
    state_average_gap: 0.08,
    percentile_worse: 92  // Worse than 92% of counties
  },
  trend: "worsening",
  data_quality: "high"
}
```

### 2. Compare Your County Tool

**Minimum Required:**
- jurisdiction_id, jurisdiction_name, state_code
- All core case-level data
- Data from both target jurisdiction and peer jurisdictions

**Peer Matching Criteria:**
- Population size (±25%)
- Median household income (±30%)
- Urban/rural designation (same category)
- State (same state preferred)

**Calculates for Each Jurisdiction:**
- Conviction rate gap (demographic group vs. reference group)
- Average sentence difference
- Disposition distribution
- Case processing time differences

### 3. Visualization Templates

**Required Data:**
- race_ethnicity, offense_severity, conviction, sentence_months
- disposition_date (for time series)
- judge_name (for judge comparison)
- court_location (for geographic maps)

**Template Types:**

| Visualization | Data Needed | Minimum Cases | Notes |
|---------------|-------------|---------------|-------|
| Bar chart: Conviction rates by race | race_ethnicity, conviction | 30 per group | Shows disparity magnitude |
| Trend line: Over time | disposition_date, race_ethnicity, conviction | 300+ total | 5+ data points per year |
| Heatmap: Offense type vs. race gap | offense_severity, race_ethnicity, conviction | 15 per cell | Reveals pattern variation |
| Judge comparison | judge_name, race_ethnicity, conviction | 50 per judge | Requires judge names |
| Sentence distribution | race_ethnicity, sentence_months | 50 per group | Histogram/violin plot |
| Disposition flow | race_ethnicity, disposition_type | 30 per group | Sankey/stacked bar |

### 4. Officials Accountability Tracker

**Special Requirements:**
- judge_name / judge_id (for judicial data)
- prosecutor_office, prosecutor_name (for prosecutorial data)
- court_location, court_id
- case_id for linking

**Additional Legal Considerations:**
- Cases with <5 per official suppressed
- Statistical significance testing before ranking
- Clear disclaimers about sample size effects
- Privacy: Only report for officials handling >100 cases/year

**Calculates:**
- Conviction rate by official (with confidence intervals)
- Disparity scores (gap between demographic groups)
- Case volume (total and by demographic)
- Trend over time
- Statistical uncertainty (confidence intervals, credible intervals)

### 5. "What If" Analysis Simulator

**Required:**
- offense_severity, race_ethnicity, conviction, sentence_months
- Controls for matching (prior_record_proxy, charge_type, other demographics)

**Simulates:**
- Counterfactual scenario where case mix is equal across groups
- Isolation of treatment effect from composition effect
- Confidence in observed disparity vs. case-mix driven disparity

## Data Quality Requirements

### For ALL Analyses:
1. **Completeness**: ≥80% of core fields present
2. **Consistency**: No logical contradictions (e.g., conviction=0 but sentence_months>0)
3. **Temporal Coverage**: ≥12 months of data
4. **Demographic Reporting**: All major demographic categories reported

### Specific Requirements:
| Analysis Type | Min Sample Size | Min Data Quality | Notes |
|---------------|-----------------|------------------|-------|
| Disparity detection | 100 per group | 80% complete | Basic statistical power |
| Judicial comparison | 50 per judge | 85% complete | Need sufficient caseload |
| Temporal trends | 500 total | 75% complete | Enough points over time |
| Policy impact | 200 pre + 200 post | 80% complete | Adequate for trend detection |

## Data Sources

### Primary Sources:
- Court administration systems (automated exports preferred)
- District attorney/court clerk record requests
- Public defender office data
- State court administrative offices (e.g., TN Administrative Office of the Courts)

### Secondary Sources:
- FBI Uniform Crime Reporting (UCR) data
- State statistical abstracts
- Census demographic data
- County budget/finance data (for resource comparisons)

## API Endpoints Design

For serving data to public tools:

```
/api/v1/jurisdictions
  GET /                    # List all jurisdictions
  GET /:id                # Get jurisdiction details
  GET /:id/metrics        # Get computed metrics

/api/v1/disparity-report
  POST /                  # Generate report for parameters
  GET /:report_id         # Retrieve report

/api/v1/compare
  GET /                   # Compare jurisdictions

/api/v1/officials
  GET /:jurisdiction_id   # List officials in jurisdiction
  GET /:official_id/stats # Get stats for specific official

/api/v1/visualizations
  GET /templates          # List available visualization templates
  GET /generate           # Generate visualization for parameters
```

## Privacy & Legal Compliance

### Data Suppression Rules:
- Any cell with <5 cases: suppressed
- Any official with <100 cases/year: not individually reported
- No individual case data ever exposed in public reports
- Aggregate statistics only with confidence intervals

### Legal Considerations:
- Reports must state limitations (observational data, not causal)
- Include appropriate disclaimers about data quality
- Follow local FOIA/public records laws for data access
- Consider terms of service for any automated data feeds

## Integration Points

### With Existing Akashic Infrastructure:
1. **Data Normalization Layer** (TypeScript) → Standardizes inputs
2. **Provenance Tracker** → Tracks source and quality
3. **Historical Baseline System** → Provides temporal context
4. **R Analysis Framework** → Performs statistical computations
5. **JavaScript Infrastructure** → Serves data to public tools

### Data Flow:
```
Raw Data Sources → Normalization → Provenance Tracking → 
Statistical Analysis → Result Aggregation → 
Report Generation → Public API → Web Interface
```