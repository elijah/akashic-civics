[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / DataNormalizer

# Class: DataNormalizer

Defined in: [normalization/data\_normalizer.ts:67](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/data_normalizer.ts#L67)

## Constructors

### Constructor

> **new DataNormalizer**(`sourceConnector?`, `sourceVersion?`): `DataNormalizer`

Defined in: [normalization/data\_normalizer.ts:70](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/data_normalizer.ts#L70)

#### Parameters

##### sourceConnector?

`string` = `'unknown'`

##### sourceVersion?

`string` = `'1.0.0'`

#### Returns

`DataNormalizer`

## Methods

### normalize()

> **normalize**(`rawCases`, `rawDataReference?`): `NormalizationResult`

Defined in: [normalization/data\_normalizer.ts:189](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/data_normalizer.ts#L189)

Normalize raw case data into the standardized schema

#### Parameters

##### rawCases

`any`[]

##### rawDataReference?

`string`

#### Returns

`NormalizationResult`

***

### validateRawData()

> **validateRawData**(`rawCases`): `ValidationResults`

Defined in: [normalization/data\_normalizer.ts:79](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/data_normalizer.ts#L79)

Validate raw input data before normalization
Returns detailed validation results with issues and warnings

#### Parameters

##### rawCases

`any`[]

#### Returns

`ValidationResults`
