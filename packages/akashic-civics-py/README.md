# akashic-civics-py

Python client for the Akashic Civics criminal justice disparity analysis platform.

## Installation

```bash
pip install akashic-civics-py
```

## Quick Start

```python
import akashic_civics

analyzer = akashic_civics.DisparityAnalyzer()

# Descriptive statistics
cases = [
    {"conviction": 1, "race_ethnicity": "Black"},
    {"conviction": 0, "race_ethnicity": "White"},
    {"conviction": 1, "race_ethnicity": "Hispanic"},
]

stats = analyzer.compute_descriptive_stats(cases)
print(f"Conviction rate: {stats['conviction_rate']:.1%}")

# Z-test
result = analyzer.run_z_test(p1=0.723, n1=1000, p2=0.651, n2=1000)
print(f"Z-test p-value: {result['p_value']:.3f}")

# Export results
analyzer.export_results(stats, format="markdown", output_file="results.md")
```

## Methods

- `compute_descriptive_stats(cases)` - Conviction rates, demographic distributions
- `run_z_test(p1, n1, p2, n2)` - Two-proportion Z-test
- `run_disconfirmation(cases)` - Adaptive disconfirmation battery
- `run_ols_regression(cases, predictors)` - OLS regression
- `export_results(results, format, output_file)` - Export to JSON/Markdown/CSV

## CLI Integration

The package also provides a CLI entry point:

```bash
akashic-civics analyze describe --input cases.jsonl
```

See the parent `akashic-civics` package for full CLI documentation.