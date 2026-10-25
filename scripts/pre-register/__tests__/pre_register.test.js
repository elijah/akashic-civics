/**
 * Pre-Registration CLI Tests
 * 
 * Tests the pre-registration script commands: create, validate, compare
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCli(args) {
  const result = execSync(
    `node scripts/pre-register/pre_register.js ${args}`,
    { encoding: 'utf-8' }
  );
  return result;
}

describe('Pre-Registration CLI - create command', () => {
  it('should create a pre-registration file with default arguments', () => {
    const output = runCli('create --question="Test question" --hypothesis="Test hypothesis"');
    expect(output).toContain('Pre-registration created');
  });

  it('should create a pre-registration file with all specified arguments', () => {
    const output = runCli(
      'create --question="Racial disparity in drug sentencing" --hypothesis="Black defendants receive longer sentences" --outcome=sentence_months --predictor=race_ethnicity --controls=offense_severity,age_at_arrest --alpha=0.05 --output=test_prereg.json'
    );
    expect(output).toContain('Pre-registration created');
    expect(fs.existsSync('test_prereg.json')).toBe(true);
    
    // Validate the created file
    const content = fs.readFileSync('test_prereg.json', 'utf-8');
    const reg = JSON.parse(content);
    expect(reg.meta.id).toBeDefined();
    expect(reg.research_question).toBe('Racial disparity in drug sentencing');
    expect(reg.hypothesis.statement).toBe('Black defendants receive longer sentences');
    expect(reg.analysis_plan.model_formula).toContain('race_ethnicity');
    expect(reg.inclusion_criteria.min_cases_per_group).toBe(30);
    
    // Cleanup
    fs.unlinkSync('test_prereg.json');
  });

  it('should use custom alpha value', () => {
    const output = runCli('create --alpha=0.01 --question="Test" --hypothesis="Test"');
    expect(output).toContain('Pre-registration created');
  });
});

describe('Pre-Registration CLI - validate command', () => {
  it('should validate a valid pre-registration file', () => {
    // Create a valid pre-registration first
    runCli('create --question="Test question" --hypothesis="Test hypothesis" --output=validate_test.json');
    
    const output = runCli('validate --file=validate_test.json');
    // Output shows "Valid: true" (lowercase)
    expect(output).toContain('Valid: true');
    
    // Cleanup
    fs.unlinkSync('validate_test.json');
  });

  it('should report issues for an invalid pre-registration file', () => {
    // Create an invalid pre-registration (missing fields)
    fs.writeFileSync('invalid_prereg.json', JSON.stringify({
      meta: { id: 'test', created: new Date().toISOString(), version: '1.0.0' }
      // Missing required fields
    }, null, 2));
    
    const output = runCli('validate --file=invalid_prereg.json');
    expect(output).toContain('Issues:');
    expect(output).toContain('Missing required field: research_question');
    
    // Cleanup
    fs.unlinkSync('invalid_prereg.json');
  });
});

describe('Pre-Registration CLI - compare command', () => {
  it('should compare pre-registered vs observed results', () => {
    // Create a pre-registration first
    runCli('create --question="Test" --hypothesis="Test" --output=test_prereg.json');
    
    const output = runCli(
      'compare --file=test_prereg.json --effect=1.5 --p=0.03 --conclusion="reject"'
    );
    expect(output).toContain('ALIGNED');
    
    // Cleanup
    fs.unlinkSync('test_prereg.json');
  });

  it('should show comparison with deviations when alpha differs from 0.05', () => {
    // Create a pre-registration with alpha=0.01
    runCli('create --alpha=0.01 --question="Test" --hypothesis="Test" --output=compare_test.json');
    
    const output = runCli(
      'compare --file=compare_test.json --effect=1.5 --p=0.03'
    );
    expect(output).toContain('DEVIATIONS FOUND');
    expect(output).toContain('Alpha differs from standard 0.05 (0.01)');
    
    // Cleanup
    fs.unlinkSync('compare_test.json');
  });
});