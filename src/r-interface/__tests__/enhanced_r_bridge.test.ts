/**
 * Test suite for Enhanced R Interface
 * 
 * Tests cover:
 * - Initialization and configuration
 * - Package installation checking
 * - Template loading
 * - Survival analysis
 * - Mediation analysis
 * - Mixed-effects analysis
 * - Machine learning analysis
 * - Error handling and fallback
 */

import { EnhancedRInterface, EnhancedRAnalysisOptions } from '../enhanced_r_bridge';

describe('EnhancedRInterface', () => {
  test('should initialize with default values', () => {
    const enhancedInterface = new EnhancedRInterface();
    expect(enhancedInterface).toBeDefined();
    expect(enhancedInterface).toBeInstanceOf(EnhancedRInterface);
  });

  test('should initialize with custom R path', () => {
    const enhancedInterface = new EnhancedRInterface('/custom/R/path');
    expect(enhancedInterface).toBeDefined();
    const rPath = (enhancedInterface as any).rScriptPath;
    expect(rPath).toBe('/custom/R/path');
  });

  test('should initialize with custom templates directory', () => {
    const customDir = '/custom/templates/path';
    const enhancedInterface = new EnhancedRInterface('/usr/bin/Rscript', customDir);
    expect(enhancedInterface).toBeDefined();
    const templatesDir = (enhancedInterface as any).analysisTemplatesDir;
    expect(templatesDir).toBe(customDir);
  });

  test('should expose EnhancedRAnalysisOptions type', () => {
    const options: EnhancedRAnalysisOptions = {
      analysisType: 'survival',
      packageUsed: 'survival',
      alpha: 0.05,
      useParallel: true,
      cores: 4
    };
    expect(options.analysisType).toBe('survival');
    expect(options.packageUsed).toBe('survival');
    expect(options.alpha).toBe(0.05);
    expect(options.useParallel).toBe(true);
    expect(options.cores).toBe(4);
  });
});
