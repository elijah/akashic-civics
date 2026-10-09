import { AnalysisPipeline, AnalysisPipelineConfig } from './src/analysis/analysis_integration';
import { VizConfig } from './src/visualization/disparity_visualizer';

/**
 * Generate actual chart data from visualization specs that can be used by charting libraries
 */async function generateChartData() {
  console.log('=== Generating Chart Data for Visualization Libraries ===\n');

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
      offense_severity: ['high', 'medium', 'low'][i % 3],
      charge_type: ['felony', 'misdemeanor', 'infraction'][i % 3],
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
      offense_severity: ['high', 'medium', 'low'][i % 3],
      charge_type: ['felony', 'misdemeanor', 'infraction'][i % 3],
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
      offense_severity: ['high', 'medium', 'low'][i % 3],
      charge_type: ['felony', 'misdemeanor', 'infraction'][i % 3],
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
      offense_severity: ['high', 'medium', 'low'][i % 3],
      charge_type: ['felony', 'misdemeanor', 'infraction'][i % 3],
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
  console.log(`Effect Size: ${result.analysis_results.effect_size}`);
  console.log(`P-Value: ${result.analysis_results.p_value}`);
  console.log(`Disconfirmation Passed: ${result.disconfirmation_passed}\n`);

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

  // Generate data for each chart type that can be used by visualization libraries
  console.log('=== Extracting Chart-Ready Data ===\n');

  // 1. Bar chart data: conviction rates by group
  console.log('1. Bar Chart Data:');
  createConfig('bar', 'conviction_rate');
  
  // Calculate actual data for the bar chart
  const groups = [...new Set(rawCases.map(c => c.race_ethnicity))];
  const groupLabels = groups.map(g => g.charAt(0).toUpperCase() + g.slice(1));
  const groupData = groups.map(group => {
    const groupCases = rawCases.filter(c => c.race_ethnicity === group);
    const convicted = groupCases.filter(c => c.conviction === 1).length;
    return (convicted / groupCases.length) * 100;
  });
  
  console.log(`   Labels: ${groupLabels}`);
  console.log(`   Data (%): ${groupData.map(d => d.toFixed(1))}`);
  console.log(`   Background Color: ['rgba(255,99,132,0.6)', 'rgba(54,162,235,0.6)']\n`);

  // 2. Heatmap data: conviction rates by offense type and race
  console.log('2. Heatmap Data:');
  const offenseTypes = [...new Set(rawCases.map(c => c.charge_type))];
  const heatmapData = offenseTypes.map(offense => {
    return groups.map(race => {
      const filtered = rawCases.filter(c => c.charge_type === offense && c.race_ethnicity === race);
      if (filtered.length === 0) return 0;
      const convicted = filtered.filter(c => c.conviction === 1).length;
      return convicted / filtered.length; // Return rate (0-1)
    });
  });
  
  console.log(`   Races (Y-axis): ${groups.map(g => g.charAt(0).toUpperCase() + g.slice(1))}`);
  console.log(`   Offense Types (X-axis): ${offenseTypes.map(o => o.charAt(0).toUpperCase() + o.slice(1))}`);
  console.log(`   Data Matrix (conviction rates):`);
  heatmapData.forEach((row, i) => {
    console.log(`     ${offenseTypes[i]}: ${row.map(val => val.toFixed(3)).join(' ')}`);
  });
  console.log('');

  // 3. Time series data (simulated yearly data)
  console.log('3. Time Series Data (Simulated Yearly Trends):');
  const years = [2019, 2020, 2021, 2022, 2023];
  const timeSeriesData = {
    labels: years.map(String),
    datasets: [
      {
        label: 'Black Conviction Rate',
        data: [0.55, 0.58, 0.62, 0.60, 0.60].map(v => v * 100), // Convert to %
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)'
      },
      {
        label: 'White Conviction Rate', 
        data: [0.42, 0.40, 0.38, 0.40, 0.40].map(v => v * 100),
        borderColor: 'rgba(54,162,235,1)',
        backgroundColor: 'rgba(54,162,235,0.2)'
      }
    ]
  };
  console.log(`   Labels: ${timeSeriesData.labels}`);
  console.log(`   Black Data: ${timeSeriesData.datasets[0].data.map(d => d.toFixed(1))}%`);
  console.log(`   White Data: ${timeSeriesData.datasets[1].data.map(d => d.toFixed(1))}%\n`);

  // Export data as JSON for external consumption
  const exportData = {
    timestamp: new Date().toISOString(),
    pipelineResults: {
      effectSize: result.analysis_results.effect_size,
      pValue: result.analysis_results.p_value,
      disconfirmationPassed: result.disconfirmation_passed,
      caseCount: result.case_count
    },
    chartData: {
      barChart: {
        labels: groupLabels,
        datasets: [
          {
            label: 'Conviction Rate (%)',
            data: groupData,
            backgroundColor: ['rgba(255,99,132,0.6)', 'rgba(54,162,235,0.6)'],
            borderColor: ['rgba(255,99,132,1)', 'rgba(54,162,235,1)'],
            borderWidth: 1
          }
        ]
      },
      heatmap: {
        xLabels: offenseTypes.map(o => o.charAt(0).toUpperCase() + o.slice(1)),
        yLabels: groups.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
        data: heatmapData
      },
      timeSeries: timeSeriesData
    }
  };

  // In a real implementation, we would write this to a file
  console.log('=== Export Summary ===');
  console.log('Chart data generated and ready for consumption by:');
  console.log('- Chart.js (bar chart, time series)');
  console.log('- D3.js (heatmap)');
  console.log('- Plotly (all chart types)');
  console.log('- Any other JavaScript charting library');
  console.log('\nData structure exported as JSON-ready object above.');
  
  return exportData;
}

generateChartData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});