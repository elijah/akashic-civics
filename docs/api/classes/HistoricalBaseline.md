[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / HistoricalBaseline

# Class: HistoricalBaseline

Defined in: [statistical/historical\_baseline.ts:45](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L45)

## Constructors

### Constructor

> **new HistoricalBaseline**(`snapshotDir?`): `HistoricalBaseline`

Defined in: [statistical/historical\_baseline.ts:50](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L50)

#### Parameters

##### snapshotDir?

`string` = `'./snapshots'`

#### Returns

`HistoricalBaseline`

## Methods

### compareWithBaseline()

> **compareWithBaseline**(`currentSnapshot`, `baselineSnapshotId`): `BaselineComparison` \| `null`

Defined in: [statistical/historical\_baseline.ts:95](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L95)

#### Parameters

##### currentSnapshot

`DataSnapshot`

##### baselineSnapshotId

`string`

#### Returns

`BaselineComparison` \| `null`

***

### createSnapshot()

> **createSnapshot**(`jurisdictionId`, `cases`): `DataSnapshot`

Defined in: [statistical/historical\_baseline.ts:56](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L56)

#### Parameters

##### jurisdictionId

`string`

##### cases

`object`[]

#### Returns

`DataSnapshot`

***

### detectChangePoints()

> **detectChangePoints**(`jurisdictionId`): `object`[]

Defined in: [statistical/historical\_baseline.ts:149](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L149)

#### Parameters

##### jurisdictionId

`string`

#### Returns

`object`[]

***

### exportSnapshots()

> **exportSnapshots**(`jurisdictionId?`): `string`

Defined in: [statistical/historical\_baseline.ts:183](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L183)

#### Parameters

##### jurisdictionId?

`string`

#### Returns

`string`

***

### getMostRecentSnapshot()

> **getMostRecentSnapshot**(): `DataSnapshot` \| `null`

Defined in: [statistical/historical\_baseline.ts:137](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L137)

#### Returns

`DataSnapshot` \| `null`

***

### getSnapshots()

> **getSnapshots**(`jurisdictionId`): `DataSnapshot`[]

Defined in: [statistical/historical\_baseline.ts:130](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/statistical/historical_baseline.ts#L130)

#### Parameters

##### jurisdictionId

`string`

#### Returns

`DataSnapshot`[]
