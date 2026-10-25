/**
 * Performance Module Exports
 */

export * from './streaming_processor';
export * from './parallel_analysis';
export * from './caching_layer';

import { StreamProcessor } from './streaming_processor';
import { WorkerPool } from './parallel_analysis';
import { CacheManager } from './caching_layer';

export { StreamProcessor, WorkerPool, CacheManager };

export default {
  StreamProcessor,
  WorkerPool,
  CacheManager,
};