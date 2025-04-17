import React, { useState, useEffect } from 'react';
import { CogIcon, PlusCircle, MinusCircle, CornerDownLeft } from 'lucide-react';
import Card from '../atoms/Card';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Select from '../atoms/Select';
import Input from '../atoms/Input';
import { ProcessingOptions } from '../../types/data';

interface DataProcessingFormProps {
  datasetId: number;
  columns: string[];
  onSubmit: (options: ProcessingOptions) => Promise<void>;
  onCancel?: () => void;
}

const DataProcessingForm: React.FC<DataProcessingFormProps> = ({
  datasetId,
  columns,
  onSubmit,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    missing_values: {
      strategy: 'mean',
      columns: []
    },
    data_types: {},
    normalization: {
      strategy: 'min_max',
      columns: []
    }
  });

  // Reset processing options when datasetId changes
  useEffect(() => {
    setProcessingOptions({
      missing_values: {
        strategy: 'mean',
        columns: []
      },
      data_types: {},
      normalization: {
        strategy: 'min_max',
        columns: []
      }
    });
  }, [datasetId]);

  // Options for the different strategies
  const missingValueStrategies = [
    { value: 'mean', label: 'Replace with Mean' },
    { value: 'median', label: 'Replace with Median' },
    { value: 'mode', label: 'Replace with Mode (Most Frequent)' },
    { value: 'constant', label: 'Replace with Constant Value' },
    { value: 'remove', label: 'Remove Rows with Missing Values' }
  ];

  const normalizationStrategies = [
    { value: 'min_max', label: 'Min-Max Scaling (0-1)' },
    { value: 'standard', label: 'Standard Scaling (Z-score)' },
    { value: 'robust', label: 'Robust Scaling (Median & IQR)' },
    { value: 'none', label: 'No Normalization' }
  ];

  const dataTypeOptions = [
    { value: 'string', label: 'Text (String)' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean (True/False)' },
    { value: 'date', label: 'Date/Time' }
  ];

  // Update missing values strategy
  const handleMissingValuesStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategy = e.target.value as 'mean' | 'median' | 'mode' | 'constant' | 'remove';
    setProcessingOptions(prev => ({
      ...prev,
      missing_values: {
        ...prev.missing_values!,
        strategy
      }
    }));
  };

  // Update normalization strategy
  const handleNormalizationStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategy = e.target.value as 'min_max' | 'standard' | 'robust' | 'none';
    setProcessingOptions(prev => ({
      ...prev,
      normalization: {
        ...prev.normalization!,
        strategy
      }
    }));
  };

  // Toggle column selection for missing values
  const toggleMissingValueColumn = (column: string) => {
    setProcessingOptions(prev => {
      const currentColumns = prev.missing_values?.columns || [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter(c => c !== column)
        : [...currentColumns, column];
      
      return {
        ...prev,
        missing_values: {
          ...prev.missing_values!,
          columns: newColumns
        }
      };
    });
  };

  // Toggle column selection for normalization
  const toggleNormalizationColumn = (column: string) => {
    setProcessingOptions(prev => {
      const currentColumns = prev.normalization?.columns || [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter(c => c !== column)
        : [...currentColumns, column];
      
      return {
        ...prev,
        normalization: {
          ...prev.normalization!,
          columns: newColumns
        }
      };
    });
  };

  // Update data type for a column
  const handleDataTypeChange = (column: string, type: string) => {
    setProcessingOptions(prev => ({
      ...prev,
      data_types: {
        ...prev.data_types,
        [column]: type
      }
    }));
  };

  // Update constant value for missing values
  const handleConstantValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProcessingOptions(prev => ({
      ...prev,
      missing_values: {
        ...prev.missing_values!,
        fill_value: value
      }
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    if (processingOptions.missing_values?.strategy === 'constant' && 
        processingOptions.missing_values.fill_value === undefined) {
      setError('Please enter a fill value for constant strategy.');
      return;
    }
    
    // If using any strategy, columns must be selected
    if (processingOptions.missing_values?.columns?.length === 0) {
      setError('Please select at least one column for missing values handling.');
      return;
    }

    // If using normalization (not 'none'), columns must be selected
    if (processingOptions.normalization?.strategy !== 'none' && 
        processingOptions.normalization?.columns?.length === 0) {
      setError('Please select at least one column for normalization.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    // Format options according to the backend schema
    const formattedOptions = {
      missing_values: {
        strategy: processingOptions.missing_values?.strategy,
        columns: processingOptions.missing_values?.columns,
        fill_value: processingOptions.missing_values?.strategy === 'constant' ? 
          processingOptions.missing_values?.fill_value : undefined
      },
      data_types: Object.fromEntries(
        Object.entries(processingOptions.data_types || {})
          .filter(([_, value]) => value !== '') // Remove empty selections
      ),
      normalization: processingOptions.normalization?.strategy === 'none' ? 
        { strategy: 'none', columns: [] } : 
        {
          strategy: processingOptions.normalization?.strategy,
          columns: processingOptions.normalization?.columns
        }
    };

    try {
      await onSubmit(formattedOptions);
    } catch (err) {
      console.error('Processing failed:', err);
      setError('Failed to process dataset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card className="overflow-visible">
          <Heading level={3} className="mb-4">Missing Values Handling</Heading>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strategy
              </label>
              <Select
                value={processingOptions.missing_values?.strategy || 'mean'}
                onChange={handleMissingValuesStrategyChange}
                fullWidth
              >
                {missingValueStrategies.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </Select>
            </div>
            
            {processingOptions.missing_values?.strategy === 'constant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fill Value
                </label>
                <Input
                  type="text"
                  value={processingOptions.missing_values?.fill_value || ''}
                  onChange={handleConstantValueChange}
                  placeholder="Value to replace missing data"
                  fullWidth
                />
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apply to Columns
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
              {columns.map(column => (
                <div key={column} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id={`missing-${column}`}
                    checked={processingOptions.missing_values?.columns?.includes(column) || false}
                    onChange={() => toggleMissingValueColumn(column)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`missing-${column}`} className="text-sm text-gray-700">
                    {column}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        <Card className="overflow-visible">
          <Heading level={3} className="mb-4">Data Types Conversion</Heading>
          
          <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {columns.map(column => (
                  <tr key={column}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {column}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Select
                        value={processingOptions.data_types?.[column] || ''}
                        onChange={(e) => handleDataTypeChange(column, e.target.value)}
                        size="sm"
                      >
                        <option value="">Auto-detect</option>
                        {dataTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        
        <Card className="overflow-visible">
          <Heading level={3} className="mb-4">Normalization</Heading>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Normalization Method
              </label>
              <Select
                value={processingOptions.normalization?.strategy || 'min_max'}
                onChange={handleNormalizationStrategyChange}
                fullWidth
              >
                {normalizationStrategies.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          {processingOptions.normalization?.strategy !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apply to Columns
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {columns.map(column => (
                  <div key={column} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`norm-${column}`}
                      checked={processingOptions.normalization?.columns?.includes(column) || false}
                      onChange={() => toggleNormalizationColumn(column)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`norm-${column}`} className="text-sm text-gray-700">
                      {column}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <CogIcon size={16} className="mr-1" />
            Process Dataset
          </Button>
        </div>
      </div>
    </form>
  );
};

export default DataProcessingForm;