#' Akashic Civics R Package
#' 
#' Provides functions for criminal justice disparity analysis.
#' 
#' @name akashic.civics
#' @docType package
NULL

#' Compute descriptive statistics from case data
#' 
#' @param cases A data frame with case-level data
#' @param race_col Column name for race/ethnicity
#' @param conviction_col Column name for conviction (0/1)
#' @return List with conviction_rate, avg_sentence, demographic_distribution
#' 
#' @examples
#' \dontrun{
#'   stats <- compute_descriptive_stats(cases, 
#'                                     race_col = "race_ethnicity",
#'                                     conviction_col = "conviction")
#' }
compute_descriptive_stats <- function(cases, race_col = "race_ethnicity", 
                                        conviction_col = "conviction") {
  # Load the R templates from Akashic Civics
  source(system.file("r_templates", "akashicjustice.R", 
                     package = "akashic.civics"))
  
  # Run descriptive statistics analysis
  result <- run_descriptive_stats(cases, race_col, conviction_col)
  return(result)
}

#' Run disconfirmation tests
#' 
#' @param cases A data frame with case-level data
#' @return List with test results and scores
run_disconfirmation_tests <- function(cases) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))
  
  result <- run_disconfirmation_battery(cases)
  return(result)
}

#' Run Z-test comparing two proportions
#' 
#' @param p1 Proportion for group 1
#' @param n1 Sample size for group 1
#' @param p2 Proportion for group 2
#' @param n2 Sample size for group 2
#' @return List with p_value, effect_size, confidence_interval
run_z_test <- function(p1, n1, p2, n2) {
  source(system.file("r_templates", "akashicjustice.R",
                     package = "akashic.civics"))
  
  result <- run_two_proportion_ztest(p1, n1, p2, n2)
  return(result)
}

#' Export results to various formats
#' 
#' @param results Analysis results
#' @param format Output format ("json", "csv", "markdown")
#' @param file Output file path
export_results <- function(results, format = "json", file = NULL) {
  if (is.null(file)) {
    cat(jsonlite::toJSON(results, pretty = TRUE))
  } else {
    write(jsonlite::toJSON(results, pretty = TRUE), file)
  }
}