[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / LLMRigorousInquiry

# Class: LLMRigorousInquiry

Defined in: [llm/rigorous\_inquiry.ts:29](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L29)

## Constructors

### Constructor

> **new LLMRigorousInquiry**(): `LLMRigorousInquiry`

#### Returns

`LLMRigorousInquiry`

## Methods

### generateAnalysisPrompt()

> **generateAnalysisPrompt**(`question`, `context`, `rResult`): `string`

Defined in: [llm/rigorous\_inquiry.ts:33](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L33)

Generate a rigorous inquiry prompt with methodology requirements

#### Parameters

##### question

`string`

##### context

`AnalysisContext`

##### rResult

`RAnalysisResult`

#### Returns

`string`

***

### generateAuditPrompt()

> **generateAuditPrompt**(`analysisDescription`, `code`, `dataQualityInfo`): `string`

Defined in: [llm/rigorous\_inquiry.ts:454](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L454)

Generate an audit prompt
Full methodological audit of an analysis

#### Parameters

##### analysisDescription

`string`

##### code

`string`

##### dataQualityInfo

###### caseCount

`number`

###### dataQualityScore

`number`

###### missingControlRates

\{\[`key`: `string`\]: `number`; \}

###### missingDemographicsRate

`number`

#### Returns

`string`

***

### generateComparisonPrompt()

> **generateComparisonPrompt**(`comparisonType`, `rResults`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:534](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L534)

Generate a comparison prompt
Compares results across jurisdictions, time periods, or groups

#### Parameters

##### comparisonType

`string`

##### rResults

`RAnalysisResult`[]

##### context

`AnalysisContext`

#### Returns

`string`

***

### generateConfounderPrompt()

> **generateConfounderPrompt**(`finding`, `observedEffect`, `availableConfounders`, `unmeasuredConfounders`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:288](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L288)

Generate a confounder explanation prompt
Tests specific alternative hypotheses about what could cause the observed effect

#### Parameters

##### finding

`string`

##### observedEffect

`number`

##### availableConfounders

`string`[]

##### unmeasuredConfounders

`string`[]

##### context

`AnalysisContext`

#### Returns

`string`

***

### generateFalsificationPrompt()

> **generateFalsificationPrompt**(`finding`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:181](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L181)

Generate a "what would falsify this" prompt

#### Parameters

##### finding

`string`

##### context

`AnalysisContext`

#### Returns

`string`

***

### generateInterpretationPrompt()

> **generateInterpretationPrompt**(`analysisType`, `effectSize`, `pValue`, `confidenceInterval`, `disconfirmationPassed`, `preRegisteredHypothesis`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:334](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L334)

Generate an interpretation prompt
Helps interpret statistical results in context

#### Parameters

##### analysisType

`string`

##### effectSize

`number`

##### pValue

`number`

##### confidenceInterval

\[`number`, `number`\]

##### disconfirmationPassed

`boolean`

##### preRegisteredHypothesis

`string`

##### context

`AnalysisContext`

#### Returns

`string`

***

### generateMultimodalPrompt()

> **generateMultimodalPrompt**(`questions`, `context`, `rResults`): `string`

Defined in: [llm/rigorous\_inquiry.ts:251](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L251)

Generate a multi-modal analysis prompt

#### Parameters

##### questions

`string`[]

##### context

`AnalysisContext`

##### rResults

`RAnalysisResult`[]

#### Returns

`string`

***

### generatePlainLanguagePrompt()

> **generatePlainLanguagePrompt**(`rResult`, `context`, `targetAudience`): `string`

Defined in: [llm/rigorous\_inquiry.ts:211](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L211)

Generate a plain-language summary prompt

#### Parameters

##### rResult

`RAnalysisResult`

##### context

`AnalysisContext`

##### targetAudience

`"public"` \| `"policy_maker"` \| `"legal_professional"` \| `"academic"`

#### Returns

`string`

***

### generatePreRegistrationPrompt()

> **generatePreRegistrationPrompt**(`researchTopic`, `researchQuestion`, `dataAvailable`, `outcomeType`): `string`

Defined in: [llm/rigorous\_inquiry.ts:376](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L376)

Generate a pre-registration guidance prompt
Helps users design pre-registration before data collection/examination

#### Parameters

##### researchTopic

`string`

##### researchQuestion

`string`

##### dataAvailable

`boolean`

##### outcomeType

`"binary"` \| `"count"` \| `"continuous"` \| `"time-to-event"`

#### Returns

`string`

***

### generateRegressionTablePrompt()

> **generateRegressionTablePrompt**(`independentVariable`, `outcomeVariable`, `controlVariables`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:84](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L84)

Generate a "regression table" prompt

#### Parameters

##### independentVariable

`string`

##### outcomeVariable

`string`

##### controlVariables

`string`[]

##### context

`AnalysisContext`

#### Returns

`string`

***

### generateSensitivityPrompt()

> **generateSensitivityPrompt**(`baseAnalysis`, `context`): `string`

Defined in: [llm/rigorous\_inquiry.ts:132](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/llm/rigorous_inquiry.ts#L132)

Generate a sensitivity analysis prompt

#### Parameters

##### baseAnalysis

`string`

##### context

`AnalysisContext`

#### Returns

`string`
