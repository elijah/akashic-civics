# Akashic Justice Analysis Templates

This directory contains R templates for conducting rigorous statistical analysis of normalized legal/justice data from the Akashic system.

## Files

### `akashicjustice.R`
The core R package with functions for:
- Importing normalized case data from Akashic JSON exports
- Disparate impact analysis (conviction rates)
- Sentencing disparity analysis
- Time-to-disposition survival analysis
- Multiple imputation for missing data
- E-value sensitivity analysis
- Automated methodology report generation

### `example_analysis.R`
Example script demonstrating how to use the analysis functions with simulated data.

### `sample_data.json`
Sample normalized case data in Akashic format for testing.

## Usage

1. Export normalized legal case data from the Akashic pipeline:
   ```bash
   # From Akashic pipeline
   npm run export-legal-data -- --output-format=json --file=/path/to/cases.json
   ```

2. Load the analysis functions:
   ```r
   source("docs/analysis-templates/akashicjustice.R")
   ```

3. Import your data:
   ```r
   cases <- import_akashic_cases("path/to/your/cases.json")
   ```

4. Run analyses:
   ```r
   # Disparate impact analysis
   impact_results <- disparate_impact_conviction(
     cases, 
     group_var = "race_ethnicity",
     controls = c("offense_severity", "charge_type", "age_at_arrest")
   )
   
   # Sentencing analysis
   sentence_results <- sentencing_disparity(
     cases,
     group_var = "race_ethnicity",
     controls = c("offense_severity", "charge_type", "prior_record_proxy")
   )
   ```

5. Generate methodological documentation:
   ```r
   report <- generate_methodology_report(
     impact_results,
     "Disparate Impact Analysis: Conviction Rates by Race/Ethnicity",
     "Your Name"
   )
   writeLines(report, "analysis_report.md")
   ```

## Methodological Features

The templates implement best practices for rigorous social science analysis:
- Proper statistical controls for confounding variables
- Effect sizes with confidence intervals (not just p-values)
- Robust standard errors to account for heteroskedasticity
- Multiple imputation for missing data
- Sensitivity analysis (E-values) for unmeasured confounding
- Automated methodology documentation for transparency
- Clear separation of descriptive vs. inferential statistics
- Explicit statement of assumptions and limitations

## Required R Packages

Install with:
```r
install.packages(c(
  "dplyr", "tidyr", "purrr", "stringr", "forcats",
  "lme4", "sandwich", "lmtest", "survey", "mice", 
  "car", "ggplot2", "broom", "haven", "readr", "jsonlite",
  "survival"
))
```

## Example Workflow

See `example_analysis.R` for a complete walkthrough with simulated data demonstrating:
1. Data import
2. Descriptive analysis
3. Disparate impact testing
4. Sentencing analysis
5. Sensitivity analysis
6. Report generation

The goal is to produce evidence that meets methodological standards for social science research while maintaining transparency about what can and cannot be concluded from the data.