# data-exporter.R
#
# Exports akashicjustice.R analysis results to standardized JSON format
# consumable by the akashic-public-tools ingestion pipeline.
#
# Usage:
#   Rscript data-exporter.R <input-cases-rds> <output-json>
#
# Example:
#   Rscript data-exporter.R simulated_akashic_cases.rds cases.json

library(jsonlite)

#' Export disparity analysis results to JSON
#'
#' @param cases Path to .rds file containing normalized case data
#' @param output_path Path to write the JSON output
#' @param jurisdiction_id Jurisdiction identifier
#' @param source_version Version string for provenance
export_analysis_results <- function(cases, output_path, jurisdiction_id = "unknown",
                                    source_version = "1.0.0") {

  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    stop("Required package 'jsonlite' is not installed.")
  }

  # Basic validation
  if (!file.exists(cases)) {
    stop(paste("Input file not found:", cases))
  }

  # Load cases
  cases <- readRDS(cases)
  if (!is.data.frame(cases)) {
    stop("Expected .rds file containing a data frame")
  }

  # Normalize case IDs
  case_ids <- paste0("case-", seq_len(nrow(cases)))

  # Build output records
  records <- lapply(seq_len(nrow(cases)), function(i) {
    row <- cases[i, , drop = FALSE]
    rec <- list(
      case_id = case_ids[i],
      jurisdiction_id = jurisdiction_id,
      race_ethnicity = if (!is.null(row$race_ethnicity)) as.character(row$race_ethnicity) else "Unknown",
      gender = if (!is.null(row$gender)) as.character(row$gender) else "Unknown",
      age_at_arrest = as.numeric(row$age_at_arrest),
      offense_severity = if (!is.null(row$offense_severity)) as.character(row$offense_severity) else "unknown",
      charge_type = if (!is.null(row$charge_type)) as.character(row$charge_type) else "unknown",
      conviction = as.numeric(row$conviction),
      sentence_months = as.numeric(row$sentence_months),
      days_to_disposition = as.numeric(row$days_to_disposition),
      disposition_type = if (!is.null(row$disposition_type)) as.character(row$disposition_type) else "unknown",
      source_connector = "akashic-analysis",
      source_version = source_version,
      ingestion_timestamp = Sys.time()
    )
    rec
  })

  # Build export structure
  export <- list(
    metadata = list(
      jurisdiction_id = jurisdiction_id,
      source_version = source_version,
      export_timestamp = Sys.time(),
      total_cases = nrow(cases)
    ),
    cases = records
  )

  # Write JSON with pretty printing
  jsonlite::toJSON(export, pretty = TRUE, auto_unbox = TRUE) %>%
    jsonlite::write_json(output_path)

  invisible(export)
}

# CLI entry point
if (!interactive()) {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) < 2) {
    stop("Usage: Rscript data-exporter.R <input-cases-rds> <output-json> [jurisdiction_id] [source_version]")
  }

  output <- export_analysis_results(
    cases = args[1],
    output_path = args[2],
    jurisdiction_id = if (length(args) >= 3) args[3] else "unknown",
    source_version = if (length(args) >= 4) args[4] else "1.0.0"
  )

  cat(paste("Exported", output$metadata$total_cases, "cases to", args[2], "\n"))
}
