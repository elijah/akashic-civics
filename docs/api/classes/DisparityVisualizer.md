[**akashic-civics**](../README.md)

***

[akashic-civics](../globals.md) / DisparityVisualizer

# Class: DisparityVisualizer

Defined in: [visualization/disparity\_visualizer.ts:34](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L34)

Generate chart specifications for different visualization types

## Constructors

### Constructor

> **new DisparityVisualizer**(): `DisparityVisualizer`

#### Returns

`DisparityVisualizer`

## Methods

### autoSelectViz()

> **autoSelectViz**(`data`, `config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:193](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L193)

Generate appropriate visualization based on data type

#### Parameters

##### data

`any`[]

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### barChartConvictionRates()

> **barChartConvictionRates**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:39](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L39)

Bar Chart: Conviction rates by demographic group

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### dispositionFlow()

> **dispositionFlow**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:168](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L168)

Disposition Flow: How cases progress through the system

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### heatmapDisparity()

> **heatmapDisparity**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:92](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L92)

Heatmap: Disparity patterns across categories

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### judgeComparison()

> **judgeComparison**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:117](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L117)

Judge Comparison: Individual decision-maker disparities

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### sentenceDistribution()

> **sentenceDistribution**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:143](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L143)

Sentence Length Distribution: Histogram with overlay

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`

***

### trendLineDisparity()

> **trendLineDisparity**(`config`): `VizSpec`

Defined in: [visualization/disparity\_visualizer.ts:67](https://github.com/elijah/akashic-civics/blob/9d2445a6d22acf953b9b0c49f7ef81f5c674d3a1/src/visualization/disparity_visualizer.ts#L67)

Trend Line: Disparity over time

#### Parameters

##### config

`VizConfig`

#### Returns

`VizSpec`
