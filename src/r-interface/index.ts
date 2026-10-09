export * from './r_bridge';
export * from './data_exporter';

import { RInterface } from './r_bridge';
import { DataExporter } from './data_exporter';

export { RInterface, DataExporter };

export default {
  RInterface,
  DataExporter
};