[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / MethodologyDocGenerator

# Class: MethodologyDocGenerator

Defined in: [reporting/methodology\_docs.ts:67](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/methodology_docs.ts#L67)

## Constructors

### Constructor

> **new MethodologyDocGenerator**(): `MethodologyDocGenerator`

#### Returns

`MethodologyDocGenerator`

## Methods

### generateReport()

> **generateReport**(`cases`, `result`, `options?`): `MethodologyReport`

Defined in: [reporting/methodology\_docs.ts:71](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/methodology_docs.ts#L71)

Generate complete methodology documentation

#### Parameters

##### cases

[`LegalJusticeCase`](../interfaces/LegalJusticeCase.md)[]

##### result

`RAnalysisResult`

##### options?

###### baselineSnapshot?

`DataSnapshot`

###### jurisdiction?

`string`

###### preRegistrationId?

`string`

###### sensitivityAnalysis?

`string`

###### timePeriod?

\{ `end`: `string`; `start`: `string`; \}

###### timePeriod.end

`string`

###### timePeriod.start

`string`

###### title?

`string`

#### Returns

`MethodologyReport`

***

### toMarkdown()

> **toMarkdown**(`report`): `string`

Defined in: [reporting/methodology\_docs.ts:151](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/methodology_docs.ts#L151)

Generate methodology documentation in Markdown format

#### Parameters

##### report

`MethodologyReport`

#### Returns

`string`

***

### toPlainSummary()

> **toPlainSummary**(`report`): `string`

Defined in: [reporting/methodology\_docs.ts:236](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/reporting/methodology_docs.ts#L236)

Generate a plain-language summary

#### Parameters

##### report

`MethodologyReport`

#### Returns

`string`
