[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / AnalysisPipeline

# Class: AnalysisPipeline

Defined in: [analysis/analysis\_integration.ts:49](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L49)

## Constructors

### Constructor

> **new AnalysisPipeline**(`config?`): `AnalysisPipeline`

Defined in: [analysis/analysis\_integration.ts:58](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L58)

#### Parameters

##### config?

`Partial`\<[`AnalysisPipelineConfig`](../interfaces/AnalysisPipelineConfig.md)\> = `{}`

#### Returns

`AnalysisPipeline`

## Methods

### exportResults()

> **exportResults**(`cases`, `dir`): `ExportMetadata`[]

Defined in: [analysis/analysis\_integration.ts:360](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L360)

Export pipeline results to standardized formats

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### dir

`string`

#### Returns

`ExportMetadata`[]

***

### generateRigorousInquiry()

> **generateRigorousInquiry**(`question`, `result`): `LLMResponse`

Defined in: [analysis/analysis\_integration.ts:317](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L317)

Get LLM-usable analysis for rigorous inquiry

#### Parameters

##### question

`string`

##### result

[`AnalysisPipelineResult`](../interfaces/AnalysisPipelineResult.md)

#### Returns

`LLMResponse`

***

### getBaselineTrends()

> **getBaselineTrends**(`jurisdictionId`): `DataSnapshot`[]

Defined in: [analysis/analysis\_integration.ts:353](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L353)

Get historical baseline trends

#### Parameters

##### jurisdictionId

`string`

#### Returns

`DataSnapshot`[]

***

### getProvenanceReport()

> **getProvenanceReport**(): `QualityReport`

Defined in: [analysis/analysis\_integration.ts:346](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L346)

Get provenance report

#### Returns

`QualityReport`

***

### runPipeline()

> **runPipeline**(`rawCases`, `options`): `Promise`\<[`AnalysisPipelineResult`](../interfaces/AnalysisPipelineResult.md)\>

Defined in: [analysis/analysis\_integration.ts:71](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/analysis/analysis_integration.ts#L71)

Run the complete analysis pipeline on raw case data

#### Parameters

##### rawCases

`any`[]

##### options

###### analysisType

`"disparate_impact_conviction"` \| `"sentencing_disparity"` \| `"time_to_disposition"`

###### controlVariables

`string`[]

###### groupVariable

`string`

###### outcomeVariable

`string`

#### Returns

`Promise`\<[`AnalysisPipelineResult`](../interfaces/AnalysisPipelineResult.md)\>
