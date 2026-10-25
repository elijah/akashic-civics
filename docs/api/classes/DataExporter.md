[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / DataExporter

# Class: DataExporter

Defined in: [r-interface/data\_exporter.ts:31](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L31)

## Constructors

### Constructor

> **new DataExporter**(`source?`, `version?`): `DataExporter`

Defined in: [r-interface/data\_exporter.ts:32](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L32)

#### Parameters

##### source?

`string` = `'akashic-civics'`

##### version?

`string` = `'1.0.0'`

#### Returns

`DataExporter`

## Methods

### exportAllFormats()

> **exportAllFormats**(`cases`, `basePath`, `options?`): `Record`\<`string`, `ExportMetadata`\>

Defined in: [r-interface/data\_exporter.ts:170](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L170)

Export multiple formats at once

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### basePath

`string`

##### options?

`ExportOptions` = `{}`

#### Returns

`Record`\<`string`, `ExportMetadata`\>

***

### toCSV()

> **toCSV**(`cases`, `filePath`, `options?`): `ExportMetadata`

Defined in: [r-interface/data\_exporter.ts:40](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L40)

Export cases to CSV format

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### filePath

`string`

##### options?

`ExportOptions` = `{}`

#### Returns

`ExportMetadata`

***

### toFeather()

> **toFeather**(`cases`, `filePath`, `options?`): `ExportMetadata`

Defined in: [r-interface/data\_exporter.ts:93](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L93)

Export cases to Feather format (requires Python with feather-format)
This creates a script that can be run to generate the feather file

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### filePath

`string`

##### options?

`ExportOptions` = `{}`

#### Returns

`ExportMetadata`

***

### toJSON()

> **toJSON**(`cases`, `filePath`, `options?`): `ExportMetadata`

Defined in: [r-interface/data\_exporter.ts:64](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L64)

Export cases to JSON format (compatible with R's jsonlite)

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### filePath

`string`

##### options?

`ExportOptions` = `{}`

#### Returns

`ExportMetadata`

***

### toParquet()

> **toParquet**(`cases`, `filePath`, `options?`): `ExportMetadata`

Defined in: [r-interface/data\_exporter.ts:132](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/r-interface/data_exporter.ts#L132)

Export cases to Parquet format (requires Python with pyarrow)

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### filePath

`string`

##### options?

`ExportOptions` = `{}`

#### Returns

`ExportMetadata`
