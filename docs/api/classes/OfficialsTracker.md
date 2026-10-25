[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / OfficialsTracker

# Class: OfficialsTracker

Defined in: [accountability/officials\_tracker.ts:42](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/accountability/officials_tracker.ts#L42)

Track individual officials and compute their disparity metrics

## Constructors

### Constructor

> **new OfficialsTracker**(): `OfficialsTracker`

Defined in: [accountability/officials\_tracker.ts:43](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/accountability/officials_tracker.ts#L43)

#### Returns

`OfficialsTracker`

## Methods

### generatePublicReport()

> **generatePublicReport**(`comparison`, `maxOfficials?`): `string`

Defined in: [accountability/officials\_tracker.ts:358](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/accountability/officials_tracker.ts#L358)

Generate a public-facing report for officials (with privacy protections)

#### Parameters

##### comparison

`OfficialComparison`

##### maxOfficials?

`number` = `10`

#### Returns

`string`

***

### processCasesForOfficials()

> **processCasesForOfficials**(`cases`): `Promise`\<`OfficialComparison`\>

Defined in: [accountability/officials\_tracker.ts:48](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/accountability/officials_tracker.ts#L48)

Process cases and compute official-level statistics

#### Parameters

##### cases

`object`[]

#### Returns

`Promise`\<`OfficialComparison`\>
