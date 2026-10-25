[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / RInterface

# Class: RInterface

Defined in: [r-interface/r\_bridge.ts:51](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L51)

## Constructors

### Constructor

> **new RInterface**(`rScriptPath?`, `analysisTemplatesDir?`): `RInterface`

Defined in: [r-interface/r\_bridge.ts:56](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L56)

#### Parameters

##### rScriptPath?

`string` = `'/usr/bin/Rscript'`

##### analysisTemplatesDir?

`string` = `...`

#### Returns

`RInterface`

## Methods

### exportToCSV()

> **exportToCSV**(`cases`, `outputPath`): `void`

Defined in: [r-interface/r\_bridge.ts:167](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L167)

Export cases to CSV for R analysis

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### outputPath

`string`

#### Returns

`void`

***

### exportToJSON()

> **exportToJSON**(`cases`, `outputPath`): `void`

Defined in: [r-interface/r\_bridge.ts:194](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L194)

Export cases to JSON for R analysis (via jsonlite)

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### outputPath

`string`

#### Returns

`void`

***

### generateRScript()

> **generateRScript**(`inputPath`, `outputPath`, `options`, `preRegistrationPath?`): `string`

Defined in: [r-interface/r\_bridge.ts:211](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L211)

Generate R script that calls the analysis templates

#### Parameters

##### inputPath

`string`

##### outputPath

`string`

##### options

`RAnalysisOptions`

##### preRegistrationPath?

`string`

#### Returns

`string`

***

### importRResults()

> **importRResults**(`filePath`): `RAnalysisResult`

Defined in: [r-interface/r\_bridge.ts:202](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L202)

Import R results back into JS

#### Parameters

##### filePath

`string`

#### Returns

`RAnalysisResult`

***

### runAnalysis()

> **runAnalysis**(`cases`, `options`, `preRegistrationPath?`): `Promise`\<`RAnalysisResult`\>

Defined in: [r-interface/r\_bridge.ts:97](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L97)

Run a pre-registered analysis via R

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### options

`RAnalysisOptions`

##### preRegistrationPath?

`string`

#### Returns

`Promise`\<`RAnalysisResult`\>

***

### validateInputCases()

> **validateInputCases**(`cases`): `object`

Defined in: [r-interface/r\_bridge.ts:67](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/r_bridge.ts#L67)

Validate input cases for the analysis pipeline

#### Parameters

##### cases

`any`[]

#### Returns

`object`

##### issues

> **issues**: `string`[]

##### valid

> **valid**: `boolean`
