**akashic-civics**

***

# Akashic Civics

## About This Project

Akashic Civics is an **extension to the main Akashic project** that provides specialized tools for analyzing hyper-local government and civic data with maximum methodological integrity. The main Akashic project aggregates intelligence about the world — aircraft, satellites, earthquakes, weather, public radio, infrastructure, country intelligence, public cameras, and open-source reconnaissance. Akashic Civics applies the same data pipeline to a domain where the questions are harder: **hyper-local government and civic institutions**.

## Our Methodological Stance: Anti-Bias by Design

This system is designed around one core principle: **we must go to extraordinary lengths to ensure our questions do not pre-poison the data or reflect bias on our part.**

When asking difficult questions about hyper-local government, we deliberately construct analyses that exert a large amount of effort toward avoiding bias and avoiding the appearance of political activism. The resulting analyses make clear that we are not acting out of anti-LEO, anti-government, or other politically questionable motives; instead, we are eliciting answers from systems that are rigorously self-checking.

### What This Means in Practice

1. **Pre-registration before data examination** — We specify our hypotheses, methods, and analysis plans *before* looking at any data. This prevents HARKing (hypothesizing after results known) and p-hacking (trying multiple specifications until something is significant).

2. **Disconfirmation testing** — Every finding must survive six falsification tests designed to actively try to disprove it. Placebo tests check for false positive bias. Negative controls check for systemic methodology bias. Out-of-sample validation checks for overfitting. Temporal robustness checks for period-specific artifacts. Alternative explanation testing checks for confounding. Specification sensitivity checks for fragile results.

3. **Transparent provenance** — Every data point carries its source, quality score, and transformation history. Anyone can trace a finding back to its raw data.

4. **Automatic limitation documentation** — Every report includes an explicit statement of what the analysis cannot determine. Observational data cannot establish causation. Unmeasured confounding may still exist. Small sample sizes reduce power. Data quality affects validity.

5. **Conservative evidentiary thresholds** — A finding is considered credible evidence of bias *only* if it survives all six disconfirmation tests, matches the pre-registered hypothesis, and has no major deviations flagged. This is not about proving a narrative — it's about testing claims against evidence with maximum transparency.

### What We Are NOT

This system is not designed to:
- Prove that any particular institution is biased
- Generate politically motivated reports
- Produce findings that support a predetermined narrative
- Replace human judgment with automated conclusions

### What We ARE

This system is designed to:
- Test hypotheses against evidence with maximum transparency
- Surface alternative explanations systematically
- Produce findings that withstand adversarial scrutiny
- Make the methodological care itself visible in every output

## Getting Started

```bash
# Clone this extension
git clone <akashic-civics-repo-url>
cd akashic-civics

# Install dependencies
./scripts/install.sh

# Run tests
npm test
```

## Quick Reference

| File | Purpose |
|------|---------|
| `INSTALL.md` | Installation and setup |
| `PLAN_STATISTICAL_RIGOR.md` | Development and methodology plan |
| `USER_GUIDE.md` | Complete user guide |
| `WORKBOOK.md` | Guided exercises |
| `QUICK_REFERENCE.md` | One-page cheat sheet |
| `ANALYSIS_SYSTEM_SUMMARY.md` | System architecture overview |
| `docs/data-dictionary/legal_justice_schema.md` | Schema field definitions |
| `docs/methodology/rigorous_bias_analysis.md` | Methodology document |
| `docs/analysis-templates/README.md` | R analysis templates |

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

## License

MIT License — See LICENSE file in repository root.
