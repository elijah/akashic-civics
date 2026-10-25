export * from './r_bridge';
export * from './data_exporter';
export * from './enhanced_r_bridge';
export * from './error_handling';

import { RInterface } from './r_bridge';
import { DataExporter } from './data_exporter';
import { EnhancedRInterface } from './enhanced_r_bridge';
import { RAnalysisError, RErrorHandler, createRAnalysisErrorHandler } from './error_handling';

export { RInterface, DataExporter, EnhancedRInterface, RAnalysisError, RErrorHandler, createRAnalysisErrorHandler };

export default {
  RInterface,
  DataExporter,
  EnhancedRInterface,
  RAnalysisError,
  RErrorHandler,
  createRAnalysisErrorHandler
};