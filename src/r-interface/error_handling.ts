/**
 * R-Specific Error Management and Fallback
 * 
 * Provides comprehensive error parsing from R execution,
 * automatic fallback to JS implementation, and detailed
 * error reporting with remediation suggestions.
 */

import { spawn } from 'child_process';

export interface RAnalysisErrorInfo {
  code: string;
  message: string;
  category: 'package_not_found' | 'execution_error' | 'parse_error' | 'data_error' | 'memory_error' | 'timeout_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation: string[];
  fallbackAvailable: boolean;
}

export interface ErrorHandlerContext {
  analysisType: string;
  packageUsed?: string;
  caseCount?: number;
  hasMissingData?: boolean;
}

export interface ErrorHandlerResult<T> {
  success: boolean;
  result?: T;
  error?: RAnalysisErrorInfo;
  fallbackUsed: boolean;
  remediationApplied: string[];
}

/**
 * R-specific error class
 */
export class RAnalysisError extends Error {
  public readonly code: string;
  public readonly category: RAnalysisErrorInfo['category'];
  public readonly severity: RAnalysisErrorInfo['severity'];
  public readonly remediation: string[];
  public readonly fallbackAvailable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      category?: RAnalysisErrorInfo['category'];
      severity?: RAnalysisErrorInfo['severity'];
      remediation?: string[];
      fallbackAvailable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'RAnalysisError';
    this.code = options.code || 'R_UNKNOWN_ERROR';
    this.category = options.category || 'execution_error';
    this.severity = options.severity || 'medium';
    this.remediation = options.remediation || [];
    this.fallbackAvailable = options.fallbackAvailable ?? true;
  }
}

/**
 * Error handler for R analysis operations
 */
export class RErrorHandler {
  private rScriptPath: string;
  private errorLog: RAnalysisErrorInfo[] = [];

  constructor(rScriptPath: string = '/usr/bin/Rscript') {
    this.rScriptPath = rScriptPath;
  }

  /**
   * Handle an R analysis error and attempt fallback
   */
  handleError<T>(
    error: Error | RAnalysisError | null | undefined,
    context: ErrorHandlerContext,
    fallbackFn?: () => T
  ): ErrorHandlerResult<T> {
    // Handle null/undefined error case
    if (!error) {
      return {
        success: true,
        error: undefined,
        fallbackUsed: false,
        remediationApplied: []
      };
    }
    
    const errorInfo = this.classifyError(error, context);
    
    // Log the error
    this.errorLog.push(errorInfo);

    const remediationApplied: string[] = [];
    let fallbackUsed = false;

    // Attempt remediation based on error category
    switch (errorInfo.category) {
      case 'package_not_found':
        remediationApplied.push(...this.handlePackageNotFound(errorInfo, context));
        break;
      case 'execution_error':
        remediationApplied.push(...this.handleExecutionError(errorInfo, context));
        break;
      case 'parse_error':
        remediationApplied.push(...this.handleParseError(errorInfo, context));
        break;
      case 'data_error':
        remediationApplied.push(...this.handleDataError(errorInfo, context));
        break;
      case 'memory_error':
        remediationApplied.push(...this.handleMemoryError(errorInfo, context));
        break;
      case 'timeout_error':
        remediationApplied.push(...this.handleTimeoutError(errorInfo, context));
        break;
    }

    // Attempt fallback if available
    if (errorInfo.fallbackAvailable && fallbackFn) {
      try {
        const fallbackResult = fallbackFn();
        fallbackUsed = true;
        remediationApplied.push('Fallback to JavaScript implementation');
        return {
          success: true,
          result: fallbackResult,
          error: errorInfo,
          fallbackUsed,
          remediationApplied
        };
      } catch (_fallbackError) {
        return {
          success: false,
          error: errorInfo,
          fallbackUsed: false,
          remediationApplied
        };
      }
    }

    return {
      success: false,
      error: errorInfo,
      fallbackUsed,
      remediationApplied
    };
  }

  /**
   * Classify an error into a category
   */
  private classifyError(error: Error | RAnalysisError, _context: ErrorHandlerContext): RAnalysisErrorInfo {
    const message = error.message.toLowerCase();

    if (error instanceof RAnalysisError) {
      return {
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity,
        remediation: error.remediation,
        fallbackAvailable: error.fallbackAvailable
      };
    }

    // Detect package not found
    if (message.includes('there is no package called') || message.includes('package not found')) {
      const packageName = this.extractPackageName(message);
      return {
        code: 'R_PACKAGE_NOT_FOUND',
        message: error.message,
        category: 'package_not_found',
        severity: 'high',
        remediation: [
          `Install required R package: ${packageName}`,
          `Run: install.packages("${packageName}", repos = "https://cran.r-project.org")`,
          'Check R package installation and CRAN repository access',
          'Verify internet connectivity for package download'
        ],
        fallbackAvailable: true
      };
    }

    // Detect execution error
    if (message.includes('execution failed') || message.includes('runtime error')) {
      return {
        code: 'R_EXECUTION_ERROR',
        message: error.message,
        category: 'execution_error',
        severity: 'medium',
        remediation: [
          'Check R script syntax and dependencies',
          'Verify data format compatibility',
          'Review R script logs for detailed error information',
          'Ensure all required R packages are installed'
        ],
        fallbackAvailable: true
      };
    }

    // Detect parse error
    if (message.includes('parse error') || message.includes('json') && message.includes('unexpected')) {
      return {
        code: 'R_PARSE_ERROR',
        message: error.message,
        category: 'parse_error',
        severity: 'low',
        remediation: [
          'Verify R output format matches expected schema',
          'Check for special characters in R output',
          'Ensure JSON serialization is valid in R script',
          'Review output parsing logic'
        ],
        fallbackAvailable: true
      };
    }

    // Detect data error
    if (message.includes('missing') || message.includes('na') || message.includes('null')) {
      return {
        code: 'R_DATA_ERROR',
        message: error.message,
        category: 'data_error',
        severity: 'medium',
        remediation: [
          'Check for missing values in input data',
          'Verify data types match expected format',
          'Impute missing values before analysis',
          'Review data export and import process'
        ],
        fallbackAvailable: true
      };
    }

    // Detect memory error
    if (message.includes('memory') || message.includes('cannot allocate') || message.includes('out of memory')) {
      return {
        code: 'R_MEMORY_ERROR',
        message: error.message,
        category: 'memory_error',
        severity: 'high',
        remediation: [
          'Reduce batch size for large datasets',
          'Increase available memory for R process',
          'Use streaming data processing instead of loading all data',
          'Close unnecessary R processes to free memory'
        ],
        fallbackAvailable: false
      };
    }

    // Detect timeout error
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        code: 'R_TIMEOUT_ERROR',
        message: error.message,
        category: 'timeout_error',
        severity: 'medium',
        remediation: [
          'Increase timeout threshold for R execution',
          'Optimize R script for performance',
          'Reduce dataset size or sample data',
          'Use parallel processing for computationally intensive tasks'
        ],
        fallbackAvailable: true
      };
    }

    // Default execution error
    return {
      code: 'R_UNKNOWN_ERROR',
      message: error.message,
      category: 'execution_error',
      severity: 'medium',
      remediation: [
        'Review R script execution logs',
        'Verify R installation and environment',
        'Check data compatibility with R analysis',
        'Contact system administrator for support'
      ],
      fallbackAvailable: true
    };
  }

  /**
   * Extract package name from error message
   */
  private extractPackageName(message: string): string {
    const match = message.match(/(?:package|called)\s+['"](\w+)['"]/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Handle package not found error
   */
  private handlePackageNotFound(_errorInfo: RAnalysisErrorInfo, _context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    if (_context.packageUsed) {
      actions.push(`Attempting to install package: ${_context.packageUsed}`);
      // In a full implementation, we would attempt package installation here
    }
    
    actions.push('Fall back to JavaScript implementation');
    
    return actions;
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(_errorInfo: RAnalysisErrorInfo, _context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    actions.push('Verify R script syntax');
    actions.push('Check data format compatibility');
    actions.push('Fall back to JavaScript implementation');
    
    return actions;
  }

  /**
   * Handle parse error
   */
  private handleParseError(_errorInfo: RAnalysisErrorInfo, _context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    actions.push('Verify R output serialization');
    actions.push('Check JSON parsing logic');
    actions.push('Fall back to JavaScript implementation');
    
    return actions;
  }

  /**
   * Handle data error
   */
  private handleDataError(_errorInfo: RAnalysisErrorInfo, context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    if (context.hasMissingData) {
      actions.push('Impute missing values in input data');
    }
    
    actions.push('Verify data types match R expectations');
    actions.push('Fall back to JavaScript implementation');
    
    return actions;
  }

  /**
   * Handle memory error
   */
  private handleMemoryError(_errorInfo: RAnalysisErrorInfo, _context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    actions.push('Reduce dataset size');
    actions.push('Use streaming processing');
    actions.push('Increase system memory allocation');
    
    return actions;
  }

  /**
   * Handle timeout error
   */
  private handleTimeoutError(_errorInfo: RAnalysisErrorInfo, _context: ErrorHandlerContext): string[] {
    const actions: string[] = [];
    
    actions.push('Increase timeout threshold');
    actions.push('Optimize R script performance');
    actions.push('Use parallel processing');
    actions.push('Fall back to JavaScript implementation');
    
    return actions;
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): RAnalysisErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Check if R is available on the system
   */
  async checkRAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const checkProcess = spawn(this.rScriptPath, ['--version']);
      
      let stdout = '';
      let stderr = '';

      checkProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      checkProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      checkProcess.on('close', (code) => {
        if (code === 0) {
          const versionMatch = stdout.match(/version\s+(\d+\.\d+\.\d+)/i);
          resolve({
            available: true,
            version: versionMatch ? versionMatch[1] : undefined
          });
        } else {
          resolve({
            available: false,
            error: stderr || 'R not available'
          });
        }
      });

      checkProcess.on('error', (error) => {
        resolve({
          available: false,
          error: error.message
        });
      });
    });
  }
}

/**
 * Create an error handler instance with standard configuration
 */
export function createRAnalysisErrorHandler(_analysisType: string): RErrorHandler {
  return new RErrorHandler();
}

/**
 * Create an R analysis error with detailed information
 */
export function createRAnalysisError(
  message: string,
  options: {
    code?: string;
    category?: RAnalysisErrorInfo['category'];
    severity?: RAnalysisErrorInfo['severity'];
    remediation?: string[];
    fallbackAvailable?: boolean;
  } = {}
): RAnalysisError {
  return new RAnalysisError(message, options);
}

/**
 * Check if an error is an R analysis error
 */
export function isRAnalysisError(error: Error): error is RAnalysisError {
  return error instanceof RAnalysisError;
}