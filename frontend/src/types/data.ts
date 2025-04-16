export type DatasetStatus = 'Raw' | 'Processed' | 'Anonymized' | 'Needs Cleaning';
export type DatasetType = 'CSV' | 'JSON' | 'XLSX' | 'Unknown';
export type TieStrengthCalculationMethod = 'frequency' | 'attribute_value';

export interface Dataset {
  id: number;
  name: string;
  type: DatasetType;
  size: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: DatasetStatus;
  row_count?: number;
  columns?: string[];
  tie_strength_definition?: TieStrengthDefinition | null;
}

export interface ProcessingOptions {
  missing_values?: {
    strategy: 'mean' | 'median' | 'mode' | 'constant' | 'remove';
    columns?: string[];
    fill_value?: any;
  };
  data_types?: {
    [column: string]: 'string' | 'number' | 'boolean' | 'date';
  };
  normalization?: {
    strategy: 'min_max' | 'standard' | 'robust' | 'none';
    columns?: string[];
  };
}

export interface AnonymizationOptions {
  method: 'pseudonymization' | 'aggregation' | 'k_anonymity';
  parameters: {
    [key: string]: any;
  };
  sensitive_fields: string[];
  quasi_identifiers?: string[];
  k_value?: number;
  keep_mapping?: boolean;
}

export interface TieStrengthDefinition {
  source_column: string;
  target_column: string;
  calculation_method: TieStrengthCalculationMethod;
  weight_column?: string;
  timestamp_column?: string;
  time_window_seconds?: number;
  directed: boolean;
}