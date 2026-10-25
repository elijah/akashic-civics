[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / RedFlagReporter

# Class: RedFlagReporter

Defined in: [reporting/red\_flag\_reporter.ts:82](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/red_flag_reporter.ts#L82)

Generate a red flag disparity report

## Constructors

### Constructor

> **new RedFlagReporter**(): `RedFlagReporter`

Defined in: [reporting/red\_flag\_reporter.ts:85](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/red_flag_reporter.ts#L85)

#### Returns

`RedFlagReporter`

## Methods

### generateReport()

> **generateReport**(`config`): `Promise`\<`RedFlagReport`\>

Defined in: [reporting/red\_flag\_reporter.ts:92](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/red_flag_reporter.ts#L92)

Generate complete red flag report

#### Parameters

##### config

###### cases

`object`[]

###### config?

`ReportConfig`

###### endDate

`string`

###### jurisdictionId

`string`

###### jurisdictionName

`string`

###### startDate

`string`

#### Returns

`Promise`\<`RedFlagReport`\>

***

### toMarkdown()

> **toMarkdown**(`report`): `string`

Defined in: [reporting/red\_flag\_reporter.ts:447](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/red_flag_reporter.ts#L447)

Export report as markdown

#### Parameters

##### report

`RedFlagReport`

#### Returns

`string`
