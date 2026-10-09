import { AnalysisPipeline, AnalysisPipelineConfig } from './src/analysis/analysis_integration';
import { DisparityVisualizer, VizConfig } from './src/visualization/disparity_visualizer';

async function main() {
  console.log('=== Generating Sample Data ===\n');

  // Generate sample cases with known disparity:
  // Black defendants: 60% conviction rate
  // White defendants: 40% conviction rate
  const rawCases: any[] = [];

  // 20 Black defendants: 12 convicted (60%), 8 not convicted
  for (let i = 0; i < 12; i++) {
    rawCases.push({
      case_id: `blk-${i + 1}`,
      official_id: `judge-${Math.floor(i / 4) + 1}`,
      official_name: `Judge ${String.fromCharCode(65 + Math.floor(i / 4))}`,
      official_type: 'judge' as const,
      jurisdiction_id: 'sample-jurisdiction',
      race_ethnicity: 'Black',
      gender: i % 2 === 0 ? 'male' : 'female',
      age_at_arrest: 25 + (i % 5) * 10,
      offense_severity: (['high' as const, 'medium' as const, 'low' as const][i % 3]),
      charge_type: (['felony' as const, 'misdemeanor' as const, 'infraction' as const][i % 3]),
      conviction: 1,
      sentence_months: 12 + i * 6,
      days_to_disposition: 30 + i * 5,
      missing_fields: [],
      source_connector: 'sample-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date(Date.UTC(2023, 0, 1 + i)).toISOString(),
      data_quality_score: 85 + (i % 10) * 1.5,
    });
  }
  for (let i = 12; i < 20; i++) {
    rawCases.push({
      case_id: `blk-${i + 1}`,
      official_id: `judge-${Math.floor(i / 4) + 1}`,
      official_name: `Judge ${String.fromCharCode(65 + Math.floor(i / 4))}`,
      official_type: 'judge' as const,
      jurisdiction_id: 'sample-jurisdiction',
      race_ethnicity: 'Black',
      gender: i % 2 === 0 ? 'male' : 'female',
      age_at_arrest: 25 + (i % 5) * 10,
      offense_severity: (['high' as const, 'medium' as const, 'low' as const][i % 3]),
      charge_type: (['felony' as const, 'misdemeanor' as const, 'infraction' as const][i % 3]),
      conviction: 0,
      sentence_months: 0,
      days_to_disposition: 0,
      missing_fields: [],
      source_connector: 'sample-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date(Date.UTC(2023, 0, 1 + i)).toISOString(),
      data_quality_score: 80 + (i % 10) * 1.5,
    });
  }

  // 20 White defendants: 8 convicted (40%), 12 not convicted
  for (let i = 0; i < 8; i++) {
    rawCases.push({
      case_id: `wht-${i + 1}`,
      official_id: `judge-${Math.floor(i / 4) + 5}`,
      official_name: `Judge ${String.fromCharCode(70 + Math.floor(i / 4))}`,
      official_type: 'judge' as const,
      jurisdiction_id: 'sample-jurisdiction',
      race_ethnicity: 'White',
      gender: i % 2 === 0 ? 'male' : 'female',
      age_at_arrest: 25 + (i % 5) * 10,
      offense_severity: (['high' as const, 'medium' as const, 'low' as const][i % 3]),
      charge_type: (['felony' as const, 'misdemeanor' as const, 'infraction' as const][i % 3]),
      conviction: 1,
      sentence_months: 8 + i * 4,
      days_to_disposition: 20 + i * 3,
      missing_fields: [],
      source_connector: 'sample-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date(Date.UTC(2023, 0, 1 + i)).toISOString(),
      data_quality_score: 82 + (i % 10) * 1.5,
    });
  }
  for (let i = 8; i < 20; i++) {
    rawCases.push({
      case_id: `wht-${i + 1}`,
      official_id: `judge-${Math.floor(i / 4) + 5}`,
      official_name: `Judge ${String.fromCharCode(70 + Math.floor(i / 4))}`,
      official_type: 'judge' as const,
      jurisdiction_id: 'sample-jurisdiction',
      race_ethnicity: 'White',
      gender: i % 2 === 0 ? 'male' : 'female',
      age_at_arrest: 25 + (i % 5) * 10,
      offense_severity: (['high' as const, 'medium' as const, 'low' as const][i % 3]),
      charge_type: (['felony' as const, 'misdemeanor' as const, 'infraction' as const][i % 3]),
      conviction: 0,
      sentence_months: 0,
      days_to_disposition: 0,
      missing_fields: [],
      source_connector: 'sample-pipeline',
      source_version: '1.0.0',
      ingestion_timestamp: new Date(Date.UTC(2023, 0, 1 + i)).toISOString(),
      data_quality_score: 78 + (i % 10) * 1.5,
    });
  }

  console.log(`Total cases generated: ${rawCases.length}`);
  const blkCount = rawCases.filter(c => c.race_ethnicity === 'Black').length;
  const whtCount = rawCases.filter(c => c.race_ethnicity === 'White').length;
  const blkConv = rawCases.filter(c => c.race_ethnicity === 'Black' && c.conviction === 1).length;
  const whtConv = rawCases.filter(c => c.race_ethnicity === 'White' && c.conviction === 1).length;
  console.log(`Black: ${blkCount} cases, ${blkConv} convictions (rate: ${(blkConv / blkCount * 100).toFixed(1)}%)`);
  console.log(`White: ${whtCount} cases, ${whtConv} convictions (rate: ${(whtConv / whtCount * 100).toFixed(1)}%)\n`);

  // Configure the analysis pipeline
  const testConfig: AnalysisPipelineConfig = {
    jurisdictionId: 'sample-jurisdiction',
    jurisdictionName: 'Sample Jurisdiction',
    sourceConnector: 'sample-pipeline',
    sourceVersion: '1.0.0',
    alphaLevel: 0.05,
    includeDisconfirmation: true,
    generateMethodology: true,
    outputDir: './analysis_output',
  };

  const pipeline = new AnalysisPipeline(testConfig);

  console.log('=== Running Analysis Pipeline ===\n');

  // Run the pipeline
  const options = {
    groupVariable: 'race_ethnicity',
    outcomeVariable: 'conviction',
    controlVariables: ['offense_severity', 'charge_type'],
    analysisType: 'disparate_impact_conviction' as const,
  };

  const result = await pipeline.runPipeline(rawCases, options);

  console.log('=== Pipeline Results ===\n');
  console.log(`Pipeline ID: ${result.pipeline_id}`);
  console.log(`Snapshot ID: ${result.snapshot_id}`);
  console.log(`Case Count: ${result.case_count}`);
  console.log(`Conviction Rate (snapshot): ${result.conviction_rate}`);
  console.log(`Data Quality Score: ${result.data_quality_score}`);
  console.log(`Effect Size: ${result.analysis_results.effect_size}`);
  console.log(`P-Value: ${result.analysis_results.p_value}`);
  console.log(`Odds Ratio: ${result.analysis_results.odds_ratio}`);
  console.log(`Disconfirmation Passed: ${result.disconfirmation_passed}`);
  console.log(`\nConclusions:`);
  result.conclusions.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));

  console.log('\n=== Generating Visualization Specifications ===\n');

  const viz = new DisparityVisualizer();

  // Helper to create VizConfig for each chart type
  function createConfig(chartType: 'bar' | 'trend' | 'heatmap' | 'judge' | 'sentence' | 'disposition', metric: string, timeVar?: string): VizConfig {
    return {
      type: chartType,
      title: `Disparity Analysis: ${chartType.charAt(0).toUpperCase() + chartType.slice(1)}`,
      data: rawCases,
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric,
        time_var: timeVar,
        min_cases: 30,
      },
    };
  }

  // 1. Bar chart: Conviction rates by demographic group
  console.log('1. Bar Chart: Conviction Rates by Demographic Group');
  const barConfig = createConfig('bar', 'conviction_rate');
  const barSpec = viz.barChartConvictionRates(barConfig);
  console.log(`   Chart Type: ${barSpec.chart_type}`);
  console.log(`   X-Axis Label: ${barSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${barSpec.y_axis.label}`);
  console.log(`   Color Variable: ${barSpec.color_variable}`);
  console.log(`   Description: ${barSpec.description.substring(0, 80)}...\n`);

  // 2. Trend line: Disparity over time
  console.log('2. Trend Line: Disparity Over Time');
  const trendConfig = createConfig('trend', 'conviction_rate_gap', 'year');
  const trendSpec = viz.trendLineDisparity(trendConfig);
  console.log(`   Chart Type: ${trendSpec.chart_type}`);
  console.log(`   X-Axis Label: ${trendSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${trendSpec.y_axis.label}`);
  console.log(`   Color Variable: ${trendSpec.color_variable}`);
  console.log(`   Description: ${trendSpec.description.substring(0, 80)}...\n`);

  // 3. Heatmap: Disparity patterns across categories
  console.log('3. Heatmap: Disparity Patterns Across Categories');
  const heatmapConfig = createConfig('heatmap', 'conviction_rate');
  const heatmapSpec = viz.heatmapDisparity(heatmapConfig);
  console.log(`   Chart Type: ${heatmapSpec.chart_type}`);
  console.log(`   X-Axis Label: ${heatmapSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${heatmapSpec.y_axis.label}`);
  console.log(`   Color Variable: ${heatmapSpec.color_variable}`);
  console.log(`   Description: ${heatmapSpec.description.substring(0, 80)}...\n`);

  // 4. Judge comparison
  console.log('4. Judge Comparison: Conviction Rate Disparity by Judge');
  const judgeConfig = createConfig('judge', 'conviction_rate');
  const judgeSpec = viz.judgeComparison(judgeConfig);
  console.log(`   Chart Type: ${judgeSpec.chart_type}`);
  console.log(`   X-Axis Label: ${judgeSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${judgeSpec.y_axis.label}`);
  console.log(`   Color Variable: ${judgeSpec.color_variable}`);
  console.log(`   Description: ${judgeSpec.description.substring(0, 80)}...\n`);

  // 5. Sentence distribution
  console.log('5. Sentence Distribution: Sentence Length by Demographic Group');
  const sentenceConfig = createConfig('sentence', 'sentence_months');
  const sentenceSpec = viz.sentenceDistribution(sentenceConfig);
  console.log(`   Chart Type: ${sentenceSpec.chart_type}`);
  console.log(`   X-Axis Label: ${sentenceSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${sentenceSpec.y_axis.label}`);
  console.log(`   Color Variable: ${sentenceSpec.color_variable}`);
  console.log(`   Description: ${sentenceSpec.description.substring(0, 80)}...\n`);

  // 6. Disposition flow
  console.log('6. Disposition Flow: Case Outcomes by Demographic Group');
  // For disposition, we need to create disposition_type field. 
  // We'll use a simplified version: based on conviction and sentence_months
  const dispCases = rawCases.map(c => ({
    ...c,
    disposition_type: c.conviction === 1 ? 'convicted' : c.sentence_months > 0 ? 'sentenced' : 'not sentenced',
  }));
  const dispositionConfig = {
    type: 'disposition' as const,
    title: 'Disposition Flow: Case Outcomes by Demographic Group',
    data: dispCases,
    config: {
      primary_group: 'Black',
      reference_group: 'White',
      group_var: 'race_ethnicity',
      metric: 'disposition_type',
      time_var: undefined,
      min_cases: 30,
    },
  } as VizConfig;
  const dispSpec = viz.dispositionFlow(dispositionConfig);
  console.log(`   Chart Type: ${dispSpec.chart_type}`);
  console.log(`   X-Axis Label: ${dispSpec.x_axis.label}`);
  console.log(`   Y-Axis Label: ${dispSpec.y_axis.label}`);
  console.log(`   Color Variable: ${dispSpec.color_variable}`);
  console.log(`   Description: ${dispSpec.description.substring(0, 80)}...\n`);

  console.log('=== Summary ===');
  console.log(`The pipeline detected a disparity effect of ${result.analysis_results.effect_size}`);
  console.log(`with p-value ${result.analysis_results.p_value}.`);
  console.log(`All visualization specs generated successfully.`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});