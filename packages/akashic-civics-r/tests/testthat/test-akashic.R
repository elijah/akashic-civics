context("akashic.civics")

source(system.file("r_templates", "akashicjustice.R",
                   package = "akashic.civics"))

test_that("run_descriptive_stats computes basic stats", {
  cases <- data.frame(
    race_ethnicity = c("A", "A", "B", "B", "A"),
    conviction = c(1, 0, 1, 1, 0)
  )
  result <- run_descriptive_stats(cases)
  expect_equal(result$case_count, 5)
  expect_equal(result$conviction_rate, 0.6)
})

test_that("run_two_proportion_ztest returns correct output", {
  result <- run_two_proportion_ztest(0.5, 100, 0.3, 100)
  expect_type(result$z_statistic, "double")
  expect_gt(result$p_value, 0)
  expect_lt(result$p_value, 1)
})

test_that("run_ols_regression returns expected structure", {
  n <- 200
  cases <- data.frame(
    outcome = rnorm(n, mean = 50, sd = 10),
    group = sample(c("A", "B"), n, replace = TRUE),
    age = rnorm(n, mean = 40, sd = 10)
  )
  result <- run_ols_regression_impl(cases, "outcome", c("group", "age"))
  expect_true("r_squared" %in% names(result))
  expect_true("p_values" %in% names(result))
  expect_gte(result$r_squared, 0)
  expect_lte(result$r_squared, 1)
})

test_that("run_logistic_regression returns odds ratios", {
  n <- 200
  cases <- data.frame(
    outcome = rbinom(n, 1, 0.5),
    group = sample(c("A", "B"), n, replace = TRUE)
  )
  result <- run_logistic_regression_impl(cases, "outcome", c("group"))
  expect_true("odds_ratios" %in% names(result))
  expect_true("p_values" %in% names(result))
})

test_that("run_doubly_robust returns treatment effect", {
  set.seed(123)
  n <- 500
  cases <- data.frame(
    treatment = rbinom(n, 1, 0.5),
    outcome = rnorm(n),
    age = rnorm(n, 40, 10),
    prior = rbinom(n, 3, 0.3)
  )
  result <- run_doubly_robust_impl(cases, "treatment", "outcome", c("age", "prior"))
  expect_true("treatment_effect" %in% names(result))
  expect_true("standard_error" %in% names(result))
  expect_type(result$treatment_effect, "double")
})

test_that("run_disconfirmation_battery runs all subtests", {
  set.seed(123)
  n <- 200
  cases <- data.frame(
    treatment = rbinom(n, 1, 0.5),
    outcome = rnorm(n),
    age = rnorm(n, 40, 10)
  )
  result <- run_disconfirmation_battery(cases, "treatment", "outcome", c("age"))
  expect_true("aggregated_score" %in% names(result))
  expect_true("passed" %in% names(result))
  expect_true("failed" %in% names(result))
  expect_gte(result$aggregated_score, 0)
})

test_that("compare_jurisdiction_disparities ranks jurisdictions", {
  cases <- data.frame(
    jurisdiction_id = rep(c("J1", "J2"), each = 50),
    outcome = c(rep(0.3, 50), rep(0.6, 50)),
    race_ethnicity = rep(c("A", "B"), 50)
  )
  result <- compare_jurisdiction_disparities(cases, "outcome")
  expect_true("disparity_ranking" %in% names(result))
  expect_true(length(result$disparity_ranking) >= 2)
})
