# Akashic Civics - Installation Guide

## Overview

Akashic Civics is a methodologically rigorous analysis system for hyper-local government and civic data. It is an **extension to the main Akashic project** that provides specialized tools for analyzing legal and justice data with maximum methodological integrity.

The system is designed around one core principle: **we must go to extraordinary lengths to ensure our questions do not pre-poison the data or reflect bias on our part.** When asking difficult questions about hyper-local government, we deliberately construct analyses that exert a large amount of effort toward avoiding bias and avoiding the appearance of political activism. The resulting analyses make clear that we are not acting out of anti-LEO, anti-government, or other politically questionable motives; instead, we are eliciting answers from systems that are rigorously self-checking.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- R >= 4.x (optional, for full statistical analysis capabilities)

## Quick Start

```bash
# Clone this Akashic extension
git clone <akashic-civics-repo-url>
cd akashic-civics

# Run setup script
./scripts/install.sh

# Run the test suite
npm test
```

## Why This Extension Exists

The main Akashic project aggregates intelligence about the world — aircraft, satellites, weather, infrastructure, country intelligence, and open-source reconnaissance. Akashic Civics is a companion that applies the same data pipeline to a domain where the questions are harder: **hyper-local government and civic institutions**.

In that domain, the questions matter deeply:

- Do certain demographic groups receive longer sentences for comparable offenses?
- Are case processing times longer for some groups than others?
- Do officials' decisions vary in ways that cannot be explained by case characteristics?

These questions carry real social and political weight, and they are precisely the questions where a methodologically weak analysis would be easily dismissed — and where a methodologically careful one could genuinely illuminate injustice. We therefore designed this extension to make the **care** itself visible: pre-registration before data examination, disconfirmation testing before claims are made, transparent provenance for every data point, and automatic documentation of every limitation. A finding that survives all of this is evidence of a quality that a sloppier analysis could never produce.

## Core Components

| Component | Purpose |
|-----------|---------|
| `data_normalizer.ts` | Standardized legal/justice data schema with provenance tracking |
| `provenance_tracker.ts` | Lineage and quality assessment for every data point |
| `historical_baseline.ts` | Temporal comparison against historical baselines |
| `statistical_analysis.ts` | Regression, effect sizes, confidence intervals, model diagnostics |
| `alternative_explanations.ts` | Systematic testing of confounders and alternative hypotheses |
| `r_bridge.ts` | R integration for rigorous statistical analysis |
| `rigorous_inquiry.ts` | LLM prompts engineered for methodological clarity |
| `methodology_docs.ts` | Automatic generation of methodological documentation |
| `officials_tracker.ts` | Accountability tracking for individual decision-makers |
| `red_flag_reporter.ts` | Automated reporting of statistically anomalous patterns |
| `analysis_integration.ts` | End-to-end analysis pipeline orchestration |

## R/Statistical Analysis Workflow

```bash
# In your analysis directory:
source("docs/analysis-templates/akashicjustice.R")
source("docs/analysis-templates/disconfirmation.R")
source("docs/analysis-templates/pre_registration.R")

# Create pre-registration BEFORE looking at data
node scripts/pre-register/pre_register.js create \
  --question="Your research question" \
  --hypothesis="Your directional hypothesis" \
  --outcome=outcome_var \
  --predictor=predictor_var \
  --controls=control1,control2,control3 \
  --alpha=0.05 \
  --output=my_prereg.json

# Run the full workflow
Rscript -e '
source("akashicjustice.R")
source("disconfirmation.R")
source("pre_registration.R")
cases <- import_akashic_cases("your_data.json")
reg <- load_pre_registration("my_prereg.json")
results <- pre_registered_analysis(cases, reg, disparate_impact_conviction, "results")
'
```

## Integration with Main Akashic Project

Akashic Civics is designed to be both standalone and integrable with the main Akashic monorepo. See `docs/WORKSPACE_SETUP.md` for setup options (standalone installation, or integration via npm workspaces with TypeScript path mappings).

```bash
# Standalone (recommended for development)
./scripts/install.sh

# Or integrate into the main Akashic workspace
cd /home/elw
npm install
cd Akashic
# add "akashic-civics": "file:../akashic-civics" to dependencies
```

## Documentation

- `PLAN_STATISTICAL_RIGOR.md` — the development and methodology plan
- `docs/data-dictionary/legal_justice_schema.md` — full schema field definitions
- `docs/methodology/rigorous_bias_analysis.md` — methodology for rigorous bias analysis
- `docs/analysis-templates/README.md` — R analysis templates and usage guide
- `WORKBOOK.md` — guided exercises for learning the system
- `docs/data-requirements/public-tool-data-spec.md` — data requirements for accountability tools

## License

MIT License — See LICENSE file in repository root.
