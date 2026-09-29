/**
 * Pre-Registration Script for Akashic Legal Analysis
 * 
 * Usage: node scripts/pre-register.js --help
 * 
 * Creates a pre-registration file with all required fields specified BEFORE data examination.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs() {
  const args = {};
  let positional = [];
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      args[key.replace('--', '')] = value || 'true';
    } else {
      positional.push(arg);
    }
  });
  args._ = positional;
  return args;
}

function createPreRegistration(args) {
  const timestamp = new Date().toISOString();
  const hash = crypto.createHash('sha256').update(timestamp).digest('hex').substring(0, 16);
  
  const registration = {
    meta: {
      id: hash,
      created: timestamp,
      version: '1.0.0'
    },
    research_question: args.question || 'Racial/ethnic disparity in legal case outcomes',
    hypothesis: {
      statement: args.hypothesis || 'Black defendants have higher conviction rates than white defendants',
      directional: args.directional || 'one.sided',
      alpha: parseFloat(args.alpha) || 0.05
    },
    outcome_variable: {
      name: args.outcome || 'conviction',
      definition: args.outcome_definition || 'Binary: 1 if convicted, 0 otherwise',
      type: args.outcome_type || 'binary'
    },
    predictor_variable: {
      name: args.predictor || 'race_ethnicity',
      levels: ['White', 'Black', 'Hispanic', 'Other'],
      reference_level: 'White'
    },
    controls: {
      mandatory: (args.controls || 'offense_severity,charge_type,age_at_arrest').split(','),
      optional: [],
      included: true
    },
    analysis_plan: {
      method: args.method || 'logistic regression',
      model_formula: args.formula || 'conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest',
      software: 'R 4.x+',
      robust_errors: args.robust_errors !== 'false'
    },
    inclusion_criteria: {
      min_cases_per_group: parseInt(args.min_cases) || 30,
      exclude_pending: args.exclude_pending !== 'false',
      exclude_dismissed: args.exclude_dismissed !== 'false'
    },
    observed_effect: null,
    observed_p_value: null,
    observed_conclusion: null,
    discrepancy_notes: null
  };
  
  return JSON.stringify(registration, null, 2);
}

function validatePreRegistration(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const reg = JSON.parse(content);
  const issues = [];
  
  const required = ['research_question', 'hypothesis', 'outcome_variable', 
                    'predictor_variable', 'analysis_plan', 'inclusion_criteria'];
  required.forEach(field => {
    if (!reg[field]) issues.push(`Missing required field: ${field}`);
  });
  
  if (reg.hypothesis) {
    if (!reg.hypothesis.statement) issues.push('Hypothesis statement missing');
    if (!['one.sided', 'two.sided'].includes(reg.hypothesis.directional)) {
      issues.push('Directional must be "one.sided" or "two.sided"');
    }
    if (typeof reg.hypothesis.alpha !== 'number' || reg.hypothesis.alpha <= 0 || reg.hypothesis.alpha >= 1) {
      issues.push('Alpha must be between 0 and 1');
    }
  }
  
  return { valid: issues.length === 0, issues };
}

function comparePrePost(registrationPath, observed) {
  const content = fs.readFileSync(registrationPath, 'utf-8');
  const reg = JSON.parse(content);
  
  const comparison = {
    meta: {
      registration_id: reg.meta.id,
      created: reg.meta.created,
      compared_at: new Date().toISOString()
    },
    pre_registered: {
      hypothesis: reg.hypothesis.statement,
      alpha: reg.hypothesis.alpha,
      model_formula: reg.analysis_plan.model_formula
    },
    observed: {
      effect_size: observed.effect,
      p_value: observed.p,
      conclusion: observed.conclusion
    }
  };
  
  const deviations = [];
  if (reg.hypothesis.alpha !== 0.05) {
    deviations.push(`Alpha differs from standard 0.05 (${reg.hypothesis.alpha})`);
  }
  if (reg.analysis_plan.robust_errors === false) {
    deviations.push('Robust errors NOT used - affects inference');
  }
  
  comparison.deviations = deviations;
  comparison.match = deviations.length === 0 ? 'ALIGNED' : 'DEVIATIONS FOUND';
  
  return comparison;
}

function main() {
  const args = parseArgs();
  const command = Array.isArray(args._) ? args._[0] : (args._ || args.command || 'help');
  
  switch (command) {
    case 'create': {
      const json = createPreRegistration(args);
      const outputPath = args.output || `pre_registration_${Date.now()}.json`;
      fs.writeFileSync(outputPath, json);
      console.log(`Pre-registration created: ${outputPath}`);
      console.log(`ID: ${JSON.parse(json).meta.id}`);
      break;
    }
    case 'validate': {
      if (!args.file) {
        console.error('Error: --file=path required for validate command');
        process.exit(1);
      }
      const result = validatePreRegistration(args.file);
      console.log(`Valid: ${result.valid}`);
      if (result.issues.length > 0) {
        console.log('Issues:');
        result.issues.forEach(i => console.log(`  - ${i}`));
      }
      break;
    }
    case 'compare': {
      if (!args.file || !args.effect || !args.p) {
        console.error('Usage: --file=reg.json --effect=1.5 --p=0.03');
        process.exit(1);
      }
      const comparison = comparePrePost(args.file, {
        effect: parseFloat(args.effect),
        p: parseFloat(args.p),
        conclusion: args.conclusion || null
      });
      console.log(JSON.stringify(comparison, null, 2));
      break;
    }
    case 'help':
    default:
      console.log(`
Usage: node pre-register.js <command> [options]

Commands:
  create    - Create new pre-registration file
    --question="text"     Research question
    --hypothesis="text"   Hypothesis statement
    --outcome=name        Outcome variable name
    --predictor=name      Primary predictor variable
    --controls=csv        Comma-separated control variables
    --alpha=0.05          Significance level
    --output=path         Output file path
    
  validate  - Validate a pre-registration file
    --file=path          Path to pre-registration JSON
    
  compare   - Compare pre-registered vs observed
    --file=path          Path to pre-registration JSON
    --effect=number      Observed effect size (OR)
    --p=number           Observed p-value
    --conclusion="text"  Observed conclusion
      `);
  }
}

main();