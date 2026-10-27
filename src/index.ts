export { DataNormalizer, LegalJusticeCase, TransformationStep, OffenseSeverityLevel, RaceEthnicityCategory, GenderCategory, OutcomeCategory, DataQualityFlag } from './normalization';
export { ProvenanceTracker } from './provenance';
export { HistoricalBaseline } from './statistical';
export { RInterface } from './r-interface/r_bridge';
export { DataExporter } from './r-interface/data_exporter';
export { MethodologyDocGenerator } from './reporting/methodology_docs';
export { LLMRigorousInquiry } from './llm/rigorous_inquiry';
export { OfficialsTracker } from './accountability';
export { RedFlagReporter } from './reporting';
export { DisparityVisualizer } from './visualization';
export { AnalysisPipeline, AnalysisPipelineConfig, AnalysisPipelineResult } from './analysis';
export { DataPipeline, dataPipeline, FBIUCRSource, BJSSource } from './data-sources';
export type { FBICaseData, BJSDataPoint, DataFetchOptions, DataSourceConfig } from './data-sources';
export { ExtensionRegistry, ExtensionError } from './extensions';
export { StreamProcessor, createStreamProcessor } from './performance';
export type { StreamConfig, StreamBatchResult, StreamManifest, StreamProcessorOptions } from './performance';

export { AnalysisPipeline as default } from './analysis';