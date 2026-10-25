/**
 * Test suite for R Error Handling
 * 
 * Tests cover:
 * - Error classification by category
 * - Error severity assignment
 * - Remediation suggestion generation
 * - Fallback mechanism testing
 * - R availability checking
 */

import { RErrorHandler, RAnalysisError, createRAnalysisErrorHandler } from '../error_handling';

describe('RErrorHandler', () => {
  let handler: RErrorHandler;

  beforeEach(() => {
    handler = new RErrorHandler('/usr/bin/Rscript');
  });

  test('should initialize with default R path', () => {
    expect(handler).toBeDefined();
  });

  test('should initialize with custom R path', () => {
    const customHandler = new RErrorHandler('/custom/R/path');
    expect(customHandler).toBeDefined();
  });

  test('should classify package not found error', () => {
    const error = new Error("there is no package called 'survival'");
    const context = { analysisType: 'survival_analysis', packageUsed: 'survival' };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('package_not_found');
    expect(result.error!.severity).toBe('high');
    expect(result.error!.remediation.length).toBeGreaterThan(0);
    expect(result.error!.remediation[0]).toContain('survival');
  });

  test('should classify execution error', () => {
    const error = new Error("R script execution failed with runtime error");
    const context = { analysisType: 'mediation_analysis' };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('execution_error');
    expect(result.error!.severity).toBe('medium');
  });

  test('should classify parse error', () => {
    const error = new Error("parse error: unexpected JSON output");
    const context = { analysisType: 'mixed_effects_analysis' };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('parse_error');
    expect(result.error!.severity).toBe('low');
  });

  test('should classify data error', () => {
    const error = new Error("missing values detected in input data");
    const context = { analysisType: 'survival_analysis', hasMissingData: true };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('data_error');
    expect(result.error!.severity).toBe('medium');
  });

  test('should classify memory error', () => {
    const error = new Error("cannot allocate vector of size 1.2 Gb");
    const context = { analysisType: 'machine_learning_analysis' };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('memory_error');
    expect(result.error!.severity).toBe('high');
    expect(result.error!.fallbackAvailable).toBe(false);
  });

  test('should classify timeout error', () => {
    const error = new Error("execution timed out after 300 seconds");
    const context = { analysisType: 'mixed_effects_analysis' };
    
    const result = handler.handleError(error, context);
    
    expect(result.error!).toBeDefined();
    expect(result.error!.category).toBe('timeout_error');
    expect(result.error!.severity).toBe('medium');
  });

  test('should use fallback when available and fallback function provided', () => {
    const error = new Error("there is no package called 'survival'");
    const context = { analysisType: 'survival_analysis', packageUsed: 'survival' };
    const fallbackResult = { analysis_type: 'survival_analysis', p_value: 0.05, hazard_ratio: 1.0 };
    
    const result = handler.handleError(error, context, () => fallbackResult);
    
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.result).toEqual(fallbackResult);
    expect(result.error!.fallbackAvailable).toBe(true);
  });

  test('should not use fallback when fallback function not provided', () => {
    const error = new Error("there is no package called 'survival'");
    const context = { analysisType: 'survival_analysis', packageUsed: 'survival' };
    
    const result = handler.handleError(error, context);
    
    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(false);
  });

  test('should track errors in error log', () => {
    const error = new Error("test error");
    const context = { analysisType: 'survival_analysis' };
    
    handler.handleError(error, context);
    
    const errorLog = handler.getErrorLog();
    expect(errorLog.length).toBe(1);
    expect(errorLog[0].message).toBe('test error');
  });

  test('should clear error log', () => {
    const error = new Error("test error");
    const context = { analysisType: 'survival_analysis' };
    
    handler.handleError(error, context);
    handler.clearErrorLog();
    
    const errorLog = handler.getErrorLog();
    expect(errorLog.length).toBe(0);
  });

  test('should return success when no error', () => {
    const result = handler.handleError(null as any, { analysisType: 'test' });
    expect(result.success).toBe(true);
  });
});

describe('RAnalysisError', () => {
  test('should create with default values', () => {
    const error = new RAnalysisError('Test error message');
    expect(error.name).toBe('RAnalysisError');
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('R_UNKNOWN_ERROR');
    expect(error.category).toBe('execution_error');
    expect(error.severity).toBe('medium');
    expect(error.fallbackAvailable).toBe(true);
  });

  test('should create with custom values', () => {
    const error = new RAnalysisError('Package missing', {
      code: 'R_PACKAGE_MISSING',
      category: 'package_not_found',
      severity: 'high',
      remediation: ['Install package X'],
      fallbackAvailable: true
    });
    
    expect(error.code).toBe('R_PACKAGE_MISSING');
    expect(error.category).toBe('package_not_found');
    expect(error.severity).toBe('high');
    expect(error.remediation).toEqual(['Install package X']);
    expect(error.fallbackAvailable).toBe(true);
  });
});

describe('createRAnalysisErrorHandler', () => {
  test('should create a handler instance', () => {
    const handler = createRAnalysisErrorHandler('survival_analysis');
    expect(handler).toBeInstanceOf(RErrorHandler);
  });

  test('should handle error with fallback', () => {
    const handler = createRAnalysisErrorHandler('mediation_analysis');
    const error = new Error("there is no package called 'mediation'");
    const context = { analysisType: 'mediation_analysis', packageUsed: 'mediation' };
    const fallbackResult = { analysis_type: 'mediation_analysis', indirect_effect: 0.1 };
    
    const result = handler.handleError(error, context, () => fallbackResult);
    
    expect(result.fallbackUsed).toBe(true);
    expect(result.result).toEqual(fallbackResult);
  });
});
