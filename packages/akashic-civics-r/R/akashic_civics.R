#' Akashic Civics R Package
#'
#' Provides statistical methods for criminal justice disparity analysis,
#' including descriptive statistics, hypothesis testing, OLS/logistic
#' regression, doubly-robust causal estimation, disconfirmation batteries,
#' and multi-jurisdiction comparison.
#'
#' @name akashic.civics
#' @docType package
#' @importFrom stats pnorm qnorm asin sqrt mean sum sd pchisq pf qf qt cor var predict fitted residuals
NULL

#' Compute descriptive statistics from case data
#'
#' @param cases A data frame with case-level data
#' @param race_col Column name for race/ethnicity
#' @param conviction_col Column name for conviction (0/1)
#' @return List with conviction_rate, avg_sentence_months, demographic_distribution
#'
#' @examples
#' \dontrun{
#'   stats <- compute_descriptive_stats(cases,
#'                                      race_col = "race_ethnicity",
#'                                      conviction_col = "conviction")
#' }
#' @export
compute_descriptive_stats <- function(cases, race_col = "race_ethnicity",
                                        conviction_col = "conviction") {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_descriptive_stats(cases, race_col, conviction_col)
  return(result)
}

#' Run disconfirmation tests
#'
#' @param cases A data frame with case-level data
#' @param treatment_col Treatment column name
#' @param outcome_col Outcome column name
#' @param covariates Covariate column names
#' @return List with test results and scores
#'
#' @examples
#' \dontrun{
#'   results <- run_disconfirmation_tests(cases,
#'                                         treatment_col = "treatment",
#'                                         outcome_col = "outcome",
#'                                         covariates = c("age", "prior_convictions"))
#' }
#' @export
run_disconfirmation_tests <- function(cases, treatment_col = NULL, outcome_col = NULL,
                                        covariates = NULL) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_disconfirmation_battery(cases, treatment_col, outcome_col, covariates)
  return(result)
}

#' Run Z-test comparing two proportions
#'
#' @param p1 Proportion for group 1
#' @param n1 Sample size for group 1
#' @param p2 Proportion for group 2
#' @param n2 Sample size for group 2
#' @param pooled Whether to use pooled variance (default: TRUE)
#' @return List with z_statistic, p_value, effect_size, confidence_interval
#'
#' @examples
#' \dontrun{
#'   result <- run_z_test(0.45, 100, 0.30, 100)
#' }
#' @export
run_z_test <- function(p1, n1, p2, n2, pooled = TRUE) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_two_proportion_ztest(p1, n1, p2, n2, pooled)
  return(result)
}

#' Run OLS regression with disparity analysis
#'
#' @param cases A data frame with outcome and predictor columns
#' @param outcome_col Name of outcome variable column
#' @param predictors Character vector of predictor column names
#' @param group_col Name of grouping column (e.g., race_ethnicity)
#' @param reference_group Value of reference group
#' @return List with coefficients, r_squared, adj_r_squared, p_values, confidence_intervals
#'
#' @examples
#' \dontrun{
#'   result <- run_ols_regression(cases,
#'                                outcome_col = "sentence_months",
#'                                predictors = c("race_ethnicity", "age", "prior_convictions"),
#'                                group_col = "race_ethnicity")
#' }
#' @export
run_ols_regression <- function(cases, outcome_col, predictors,
                                 group_col = "race_ethnicity", reference_group = NULL) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_ols_regression(cases, outcome_col, predictors,
                                       group_col, reference_group)
  return(result)
}

#' Run logistic regression for binary outcomes
#'
#' @param cases A data frame
#' @param outcome_col Binary outcome column (0/1)
#' @param predictors Predictor column names
#' @return List with coefficients, odds_ratios, p_values, confidence_intervals
#'
#' @examples
#' \dontrun{
#'   result <- run_logistic_regression(cases,
#'                                      outcome_col = "conviction",
#'                                      predictors = c("race_ethnicity", "age"))
#' }
#' @export
run_logistic_regression <- function(cases, outcome_col, predictors) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_logistic_regression(cases, outcome_col, predictors)
  return(result)
}

#' Run doubly-robust estimation for causal treatment effects
#'
#' @param cases A data frame
#' @param treatment_col Binary treatment indicator (0/1)
#' @param outcome_col Outcome variable
#' @param covariates Vector of covariate column names for adjustment
#' @return List with treatment_effect, confidence_interval, standard_error, p_value
#'
#' @examples
#' \dontrun{
#'   result <- run_doubly_robust(cases,
#'                                treatment_col = "treatment",
#'                                outcome_col = "outcome",
#'                                covariates = c("age", "race_ethnicity"))
#' }
#' @export
run_doubly_robust <- function(cases, treatment_col, outcome_col, covariates) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- run_doubly_robust(cases, treatment_col, outcome_col, covariates)
  return(result)
}

#' Compare disparities across jurisdictions
#'
#' @param cases A data frame with jurisdiction_id column
#' @param outcome_col Outcome column name
#' @param group_col Grouping column name
#' @param jurisdiction_col Jurisdiction column name
#' @return List with per-jurisdiction disparities and comparison
#'
#' @examples
#' \dontrun{
#'   result <- compare_jurisdictions(cases,
#'                                    outcome_col = "conviction",
#'                                    group_col = "race_ethnicity",
#'                                    jurisdiction_col = "jurisdiction_id")
#' }
#' @export
compare_jurisdictions <- function(cases, outcome_col, group_col = "race_ethnicity",
                                     jurisdiction_col = "jurisdiction_id") {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))

  result <- compare_jurisdiction_disparities(cases, outcome_col, group_col, jurisdiction_col)
  return(result)
}

#' Export results to various formats
#'
#' @param results Analysis results
#' @param format Output format ("json", "csv", "markdown")
#' @param file Output file path
#'
#' @examples
#' \dontrun{
#'   export_results(results, format = "json", file = "output.json")
#' }
#' @export
export_results <- function(results, format = "json", file = NULL) {
  if (format == "json") {
    output <- jsonlite::toJSON(results, pretty = TRUE, auto_unbox = TRUE)
    if (is.null(file)) {
      cat(output)
    } else {
      write(output, file)
    }
  } else if (format == "csv") {
    if (is.null(file)) {
      stop("file path is required for csv format")
    }
    utils::write.csv(results, file)
  } else {
    stop(sprintf("Unsupported format: %s", format))
  }
}
