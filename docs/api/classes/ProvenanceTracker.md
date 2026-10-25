[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / ProvenanceTracker

# Class: ProvenanceTracker

Defined in: [provenance/provenance\_tracker.ts:30](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L30)

## Implements

- `ProvenanceTracker`

## Constructors

### Constructor

> **new ProvenanceTracker**(): `ProvenanceTracker`

#### Returns

`ProvenanceTracker`

## Methods

### addEntry()

#### Call Signature

> **addEntry**(`caseId`, `entry`): `void`

Defined in: [provenance/provenance\_tracker.ts:31](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L31)

##### Parameters

###### caseId

`string`

###### entry

`ProvenanceEntry`

##### Returns

`void`

#### Call Signature

> **addEntry**(`caseId`, `entry`): `void`

Defined in: [provenance/provenance\_tracker.ts:53](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L53)

Add a provenance entry with validation

##### Parameters

###### caseId

`string`

###### entry

`ProvenanceEntry`

##### Returns

`void`

##### Throws

if validation fails

***

### clear()

> **clear**(): `void`

Defined in: [provenance/provenance\_tracker.ts:205](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L205)

Clear all entries

#### Returns

`void`

***

### exportProvenance()

#### Call Signature

> **exportProvenance**(): `Buffer`

Defined in: [provenance/provenance\_tracker.ts:34](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L34)

##### Returns

`Buffer`

#### Call Signature

> **exportProvenance**(): `Buffer`

Defined in: [provenance/provenance\_tracker.ts:135](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L135)

##### Returns

`Buffer`

***

### exportProvenanceJSON()

> **exportProvenanceJSON**(): `string`

Defined in: [provenance/provenance\_tracker.ts:304](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L304)

Export provenance as JSON string (pretty-printed)

#### Returns

`string`

***

### getAllEntries()

#### Call Signature

> **getAllEntries**(): `Record`\<`string`, `ProvenanceEntry`\>

Defined in: [provenance/provenance\_tracker.ts:33](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L33)

##### Returns

`Record`\<`string`, `ProvenanceEntry`\>

#### Call Signature

> **getAllEntries**(): `Record`\<`string`, `ProvenanceEntry`\>

Defined in: [provenance/provenance\_tracker.ts:131](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L131)

##### Returns

`Record`\<`string`, `ProvenanceEntry`\>

***

### getAllQualityFlags()

> **getAllQualityFlags**(): `string`[]

Defined in: [provenance/provenance\_tracker.ts:259](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L259)

Get all unique quality flags

#### Returns

`string`[]

***

### getEntriesByQualityRange()

> **getEntriesByQualityRange**(`minScore`, `maxScore`): `Record`\<`string`, `ProvenanceEntry`\>

Defined in: [provenance/provenance\_tracker.ts:239](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L239)

Get entries within a quality score range

#### Parameters

##### minScore

`number`

##### maxScore

`number`

#### Returns

`Record`\<`string`, `ProvenanceEntry`\>

***

### getEntriesBySource()

> **getEntriesBySource**(`sourceConnector`): `Record`\<`string`, `ProvenanceEntry`\>

Defined in: [provenance/provenance\_tracker.ts:226](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L226)

Get entries by source connector

#### Parameters

##### sourceConnector

`string`

#### Returns

`Record`\<`string`, `ProvenanceEntry`\>

***

### getEntriesWithFlag()

> **getEntriesWithFlag**(`flag`): `Record`\<`string`, `ProvenanceEntry`\>

Defined in: [provenance/provenance\_tracker.ts:270](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L270)

Get entries with a specific quality flag

#### Parameters

##### flag

`string`

#### Returns

`Record`\<`string`, `ProvenanceEntry`\>

***

### getEntry()

#### Call Signature

> **getEntry**(`caseId`): `ProvenanceEntry` \| `undefined`

Defined in: [provenance/provenance\_tracker.ts:32](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L32)

##### Parameters

###### caseId

`string`

##### Returns

`ProvenanceEntry` \| `undefined`

#### Call Signature

> **getEntry**(`caseId`): `ProvenanceEntry` \| `undefined`

Defined in: [provenance/provenance\_tracker.ts:127](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L127)

##### Parameters

###### caseId

`string`

##### Returns

`ProvenanceEntry` \| `undefined`

***

### getEntryCount()

> **getEntryCount**(): `number`

Defined in: [provenance/provenance\_tracker.ts:212](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L212)

Get count of entries

#### Returns

`number`

***

### getQualityReport()

#### Call Signature

> **getQualityReport**(): `QualityReport`

Defined in: [provenance/provenance\_tracker.ts:35](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L35)

##### Returns

`QualityReport`

#### Call Signature

> **getQualityReport**(): `QualityReport`

Defined in: [provenance/provenance\_tracker.ts:139](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L139)

##### Returns

`QualityReport`

***

### hasEntry()

> **hasEntry**(`caseId`): `boolean`

Defined in: [provenance/provenance\_tracker.ts:219](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L219)

Check if entry exists

#### Parameters

##### caseId

`string`

#### Returns

`boolean`

***

### importProvenance()

> **importProvenance**(`json`): `void`

Defined in: [provenance/provenance\_tracker.ts:312](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L312)

Import provenance from JSON string

#### Parameters

##### json

`string`

#### Returns

`void`

#### Throws

if JSON is invalid or entries fail validation

***

### removeEntry()

> **removeEntry**(`caseId`): `boolean`

Defined in: [provenance/provenance\_tracker.ts:194](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L194)

Remove an entry by case ID

#### Parameters

##### caseId

`string`

#### Returns

`boolean`

***

### verifyIntegrity()

> **verifyIntegrity**(): `object`

Defined in: [provenance/provenance\_tracker.ts:283](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/provenance/provenance_tracker.ts#L283)

Verify integrity of all entries by recomputing hashes

#### Returns

`object`

##### invalid

> **invalid**: `string`[]

##### valid

> **valid**: `string`[]
