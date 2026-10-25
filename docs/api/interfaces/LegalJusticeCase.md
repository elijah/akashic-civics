[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / LegalJusticeCase

# Interface: LegalJusticeCase

Defined in: [normalization/legal\_justice\_schema.ts:15](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L15)

Legal Justice Data Schema

Standardized schema that all legal/justice data flows through to enable
consistent analysis across different jurisdictions and data sources.

Fields follow the specification in PLAN_STATISTICAL_RIGOR.md Section 1.1:
- Standardized offense severity coding
- Uniform demographic fields (privacy-preserving options)
- Consistent case processing timestamps
- Standardized outcome categories
- Data quality flags

## Indexable

> \[`key`: `string`\]: `any`

Additional case-specific data

## Properties

### age\_at\_arrest?

> `optional` **age\_at\_arrest?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:26](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L26)

***

### arrest\_date?

> `optional` **arrest\_date?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:29](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L29)

Case timeline timestamps

***

### attorney\_type?

> `optional` **attorney\_type?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:60](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L60)

***

### bail\_amount?

> `optional` **bail\_amount?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:63](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L63)

Bail/bond information

***

### bail\_posted?

> `optional` **bail\_posted?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:64](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L64)

***

### charge\_type?

> `optional` **charge\_type?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:38](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L38)

***

### completeness\_score?

> `optional` **completeness\_score?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:72](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L72)

***

### conviction?

> `optional` **conviction?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:41](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L41)

Case outcomes

***

### conviction\_type?

> `optional` **conviction\_type?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:42](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L42)

***

### data\_quality\_flags?

> `optional` **data\_quality\_flags?**: `string`[]

Defined in: [normalization/legal\_justice\_schema.ts:71](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L71)

***

### days\_to\_disposition?

> `optional` **days\_to\_disposition?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:53](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L53)

Processing metrics

***

### days\_to\_sentencing?

> `optional` **days\_to\_sentencing?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:54](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L54)

***

### disposition\_date?

> `optional` **disposition\_date?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:31](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L31)

***

### disposition\_description?

> `optional` **disposition\_description?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:50](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L50)

***

### disposition\_type?

> `optional` **disposition\_type?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:49](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L49)

Case disposition

***

### filing\_date?

> `optional` **filing\_date?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:30](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L30)

***

### fines\_amount?

> `optional` **fines\_amount?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:45](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L45)

***

### gender?

> `optional` **gender?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:25](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L25)

***

### id

> **id**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:17](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L17)

Unique identifier for the case

***

### ingestion\_timestamp?

> `optional` **ingestion\_timestamp?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:69](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L69)

***

### judge\_id?

> `optional` **judge\_id?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:57](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L57)

Court and legal actors

***

### judge\_name?

> `optional` **judge\_name?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:58](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L58)

***

### jurisdiction\_id

> **jurisdiction\_id**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:20](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L20)

Jurisdiction where the case originated

***

### jurisdiction\_name?

> `optional` **jurisdiction\_name?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:21](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L21)

***

### missing\_fields?

> `optional` **missing\_fields?**: `string`[]

Defined in: [normalization/legal\_justice\_schema.ts:70](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L70)

***

### offense\_description?

> `optional` **offense\_description?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:36](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L36)

***

### offense\_severity?

> `optional` **offense\_severity?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:35](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L35)

Offense information

***

### probation\_months?

> `optional` **probation\_months?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:44](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L44)

***

### prosecutor\_office?

> `optional` **prosecutor\_office?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:59](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L59)

***

### race\_ethnicity?

> `optional` **race\_ethnicity?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:24](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L24)

Demographic information (privacy-preserving options)

***

### restitution\_amount?

> `optional` **restitution\_amount?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:46](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L46)

***

### sentence\_months?

> `optional` **sentence\_months?**: `number`

Defined in: [normalization/legal\_justice\_schema.ts:43](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L43)

***

### sentencing\_date?

> `optional` **sentencing\_date?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:32](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L32)

***

### source\_connector?

> `optional` **source\_connector?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:67](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L67)

Data quality and provenance

***

### source\_version?

> `optional` **source\_version?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:68](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L68)

***

### statute\_code?

> `optional` **statute\_code?**: `string`

Defined in: [normalization/legal\_justice\_schema.ts:37](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/normalization/legal_justice_schema.ts#L37)
