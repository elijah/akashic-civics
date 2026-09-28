#!/usr/bin/env Rscript
#' Example Analysis Workflow
#' 
#' This script demonstrates a complete analysis workflow using the
#' akashicjustice functions with simulated data. Replace the simulated
#' data with your actual Akashic export for real analysis.

# Load the analysis functions
source("akashicjustice.R")

# Load required packages
suppressPackageStartupMessages({
  library(dplyr)
  library(ggplot2)
  library(mice)
  library(survival)
})

# ============================================================
# STEP 1: Simulate data (replace with import_akashic_cases() for real data)
# ============================================================

set.seed(123)
n_cases <- 2000

# Simulate cases with realistic structure
simulated_cases <- data.frame(
  id = paste0("case-", 1:n_cases),
  jurisdiction_id = "putnam-county-tn",
  jurisdiction_name = "Putnam County, TN",
  
  # Demographics (with some missing)
  race_ethnicity = sample(
    c("White", "Black", "Hispanic", "Unknown"), 
    n_cases, 
    replace = TRUE, 
    prob = c(0.65, 0.25, 0.07, 0.03)
  ),
  age_at_arrest = rnorm(n_cases, mean = 32, sd = 11),
  gender = sample(c("male", "female"), n_cases, replace = TRUE, prob = c(0.75, 0.25)),
  socioeconomic_proxy = sample(c("low", "moderate", "high", "unknown"), n_cases, replace = TRUE, prob = c(0.4, 0.35, 0.15, 0.1)),
  prior_record_proxy = sample(c("none", "minor", "moderate", "serious", "unknown"), n_cases, replace = TRUE, prob = c(0.4, 0.25, 0.15, 0.1, 0.1)),
  
  # Charge characteristics
  offense_severity = sample(
    c("misdemeanor_first", "misdemeanor_second", "felony_third", "felony_second", "felony_first"),
    n_cases, replace = TRUE, prob = c(0.3, 0.25, 0.25, 0.15, 0.05)
  ),
  charge_type = sample(c("violent", "property", "drug", "public_order", "white_collar"), 
                       n_cases, replace = TRUE, prob = c(0.15, 0.25, 0.3, 0.2, 0.1)),
  is_violent = ifelse(charge_type == "violent", TRUE, FALSE),
  mandatory_minimum = sample(c(TRUE, FALSE), n_cases, replace = TRUE, prob = c(0.15, 0.85)),
  
  # Outcomes (with simulated disparities)
  # Base conviction probability varies by severity
  conviction = rbinom(n_cases, 1, 
    case_when(
      offense_severity == "misdemeanor_first" ~ 0.65,
      offense_severity == "misdemeanor_second" ~ 0.75,
      offense_severity == "felony_third" ~ 0.7,
      offense_severity == "felony_second" ~ 0.8,
      offense_severity == "felony_first" ~ 0.85,
      TRUE ~ 0.5
    )
  ),
  
  # Sentencing (only for convictions)
  sentence_months = case_when(
    offense_severity == "misdemeanor_first" ~ rpois(n_cases, lambda = 3),
    offense_severity == "misdemeanor_second" ~ rpois(n_cases, lambda = 6),
    offense_severity == "felony_third" ~ rpois(n_cases, lambda = 18),
    offense_severity == "felony_second" ~ rpois(n_cases, lambda = 36),
    offense_severity == "felony_first" ~ rpois(n_cases, lambda = 72),
    TRUE ~ 0
  ),
  
  # Days to disposition
  days_to_disposition = case_when(
    offense_severity == "misdemeanor_first" ~ rpois(n_cases, lambda = 45),
    offense_severity == "misdemeanor_second" ~ rpois(n_cases, lambda = 60),
    offense_severity == "felony_third" ~ rpois(n_cases, lambda = 120),
    offense_severity == "felony_second" ~ rpois(n_cases, lambda = 180),
    offense_severity == "felony_first" ~ rpois(n_cases, lambda = 300),
    TRUE ~ rpois(n_cases, lambda = 90)
  ),
  
  # Provenance
  completeness_score = sample(50:100, n_cases, replace = TRUE)
)

# Add SIMULATED disparity: Black defendants 15% more likely to be convicted
# controlling for offense severity (this is the signal we want to detect)
black_indices <- which(simulated_cases$race_ethnicity == "Black")
extra_conviction_prob <- 0.15 * (1 - simulated_cases$conviction[black_indices])
simulated_cases$conviction[black_indices] <- ifelse(
  runif(length(black_indices)) < extra_conviction_prob, 
  1, 
  simulated_cases$conviction[black_indices]
)

# Add SIMULATED sentencing disparity: 20% longer sentences for Black defendants
black_convicted <- which(simulated_cases$race_ethnicity == "Black" & simulated_cases$conviction == 1)
simulated_cases$sentence_months[black_convicted] <- 
  round(simulated_cases$sentence_months[black_convicted] * 1.2)

# Introduce some missing data (realistic)
missing_race <- sample(1:n_cases, round(n_cases * 0.08))
simulated_cases$race_ethnicity[missing_race] <- NA
missing_prior <- sample(1:n_cases, round(n_cases * 0.12))
simulated_cases$prior_record_proxy[missing_prior] <- NA
missing_age <- sample(1:n_cases, round(n_cases * 0.05))
simulated_cases$age_at_arrest[missing_age] <- NA

# Save simulated data for R analysis
saveRDS(simulated_cases, "simulated_akashic_cases.rds")
write.csv(simulated_cases, "simulated_akashic_cases.csv", row.names = FALSE)

cat("Simulated", n_cases, "cases with known disparities\n")
cat("Black conviction rate:", round(mean(simulated_cases$conviction[simulated_cases$race_ethnicity == "Black"], na.rm = TRUE), 3), "\n")
cat("White conviction rate:", round(mean(simulated_cases$conviction[simulated_cases$race_ethnicity == "White"], na.rm = TRUE), 3), "\n\n")

# ============================================================
# STEP 2: Disparate Impact Analysis
# ============================================================

cat("=== DISPARATE IMPACT ANALYSIS ===\n\n")

impact_results <- disparate_impact_conviction(
  simulated_cases,
  group_var = "race_ethnicity",
  controls = c("offense_severity", "charge_type", "age_at_arrest")
)

cat("Descriptive Statistics:\n")
print(impact_results$descriptive)

cat("\nChi-square Test:\n")
print(impact_results$chisq_test)

cat("\nAdjusted Odds Ratios:\n")
print(impact_results$odds_ratios)

cat("\nModel Summary (first 10 rows):\n")
print(head(impact_results$model_summary, 10))

# ============================================================
# STEP 3: Sentencing Disparity Analysis
# ============================================================

cat("\n\n=== SENTENCING DISPARITY ANALYSIS ===\n\n")

sentence_results <- sentencing_disparity(
  simulated_cases,
  group_var = "race_ethnicity",
  controls = c("offense_severity", "charge_type", "prior_record_proxy")
)

cat("Descriptive Statistics:\n")
print(sentence_results$descriptive)

cat("\nPercent Differences (adjusted):\n")
print(sentence_results$percent_differences)

cat("\nRobust Coefficient Tests:\n")
print(sentence_results$coeftest_robust)

# ============================================================
# STEP 4: Time-to-Disposition Analysis
# ============================================================

cat("\n\n=== TIME-TO-DISPOSITION ANALYSIS ===\n\n")

time_results <- time_to_disposition(
  simulated_cases,
  group_var = "race_ethnicity",
  controls = c("offense_severity", "charge_type")
)

cat("Cox Model Summary:\n")
print(summary(time_results$cox_model))

cat("\nProportional Hazards Test:\n")
print(time_results$ph_test)

# ============================================================
# STEP 5: Multiple Imputation for Missing Data
# ============================================================

cat("\n\n=== MULTIPLE IMPUTATION ===\n\n")

imp_results <- impute_missing_demographics(simulated_cases, m = 3)

cat("Imputed", length(imp_results$imputed_datasets), "datasets\n")
cat("First imputed dataset dimensions:", dim(imp_results$imputed_datasets[[1]]), "\n")

# Run analysis on each imputed dataset and pool results
pooled_results <- lapply(imp_results$imputed_datasets, function(d) {
  disparate_impact_conviction(d, group_var = "race_ethnicity", controls = c("offense_severity", "charge_type"))
})

cat("\nPooled odds ratios across imputations:\n")
for (i in 1:3) {
  cat("Imputation", i, ":\n")
  print(pooled_results[[i]]$odds_ratios)
}

# ============================================================
# STEP 6: Sensitivity Analysis (E-values)
# ============================================================

cat("\n\n=== SENSITIVITY ANALYSIS (E-VALUES) ===\n\n")

# Get the main effect from the primary analysis
main_or_row <- impact_results$odds_ratios[impact_results$odds_ratios$term == "groupBlack", ]
if (nrow(main_or_row) > 0) {
  evalue_result <- evalue_sensitivity(
    main_or_row$odds_ratio,
    main_or_row$ci_lower,
    main_or_row$ci_upper
  )
  cat("Main effect (Black vs White, adjusted): OR =", round(main_or_row$odds_ratio, 2), "\n")
  cat("E-value:", round(evalue_result$e_value, 2), "\n")
  cat("E-value (CI lower bound):", round(evalue_result$e_value_ci_lower, 2), "\n")
  cat("Interpretation:", evalue_result$interpretation, "\n\n")
}

# ============================================================
# STEP 7: Generate Methodological Report
# ============================================================

cat("\n\n=== METHODOLOGICAL REPORT ===\n\n")

report <- generate_methodology_report(
  impact_results,
  "Disparate Impact Analysis: Conviction Rates by Race/Ethnicity in Putnam County, TN",
  "Akashic Analysis Pipeline"
)

writeLines(report, "example_analysis_report.md")
cat("Report written to example_analysis_report.md\n")
cat(report)

# ============================================================
# STEP 8: Visualization
# ============================================================

cat("\n\n=== CREATING VISUALIZATIONS ===\n\n")

# Adjusted prediction plot
p1 <- ggplot(impact_results$adjusted_predictions, 
             aes(x = offense_severity, y = predicted_prob, fill = group)) +
  geom_col(position = "dodge") +
  labs(
    title = "Adjusted Conviction Probabilities by Race/Ethnicity and Offense Severity",
    x = "Offense Severity",
    y = "Predicted Conviction Probability",
    fill = "Race/Ethnicity"
  ) +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

ggsave("conviction_by_race_severity.png", p1, width = 10, height = 6)

# Sentencing disparity plot
p2 <- ggplot(sentence_results$percent_differences, 
             aes(x = group, y = pct_difference)) +
  geom_col(fill = "steelblue") +
  geom_errorbar(aes(ymin = pct_difference - 1.96 * se, 
                    ymax = pct_difference + 1.96 * se), 
                width = 0.2) +
  labs(
    title = "Adjusted Sentencing Differences by Race/Ethnicity",
    x = "Race/Ethnicity (vs White reference)",
    y = "Percent Difference in Sentence Length (%)"
  ) +
  theme_minimal() +
  geom_hline(yintercept = 0, linetype = "dashed")

ggsave("sentencing_disparity.png", p2, width = 8, height = 5)

cat("Visualizations saved: conviction_by_race_severity.png, sentencing_disparity.png\n")

# ============================================================
# SUMMARY
# ============================================================

cat("\n\n=== ANALYSIS COMPLETE ===\n")
cat("This example demonstrated:\n")
cat("1. Disparate impact analysis with logistic regression controlling for confounders\n")
cat("2. Sentencing disparity analysis with linear regression on log sentence\n")
cat("3. Time-to-disposition survival analysis\n")
cat("4. Multiple imputation for missing demographic data\n")
cat("5. E-value sensitivity analysis for unmeasured confounding\n")
cat("6. Automated methodology report generation\n")
cat("7. Visualization of adjusted effects\n\n")
cat("Replace simulated data with real Akashic exports for actual analysis.\n")
cat("Key outputs: effect sizes with CIs, sensitivity analysis, methodological transparency.\n")