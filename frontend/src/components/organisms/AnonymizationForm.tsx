import React, { useState, useEffect } from 'react';
import { ShieldIcon, AlertCircle } from 'lucide-react';
import Card from '../atoms/Card';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Select from '../atoms/Select';
import Input from '../atoms/Input';
import { AnonymizationOptions } from '../../types/data';

interface AnonymizationFormProps {
  datasetId: number;
  columns: string[];
  onSubmit: (options: AnonymizationOptions) => Promise<void>;
  onCancel?: () => void;
}

const AnonymizationForm: React.FC<AnonymizationFormProps> = ({
  datasetId,
  columns,
  onSubmit,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AnonymizationOptions>({
    method: 'pseudonymization',
    sensitive_fields: [],
    quasi_identifiers: [],
    parameters: {},
    k_value: 5,
    keep_mapping: true
  });

  // Reset form when datasetId changes
  useEffect(() => {
    setOptions({
      method: 'pseudonymization',
      sensitive_fields: [],
      quasi_identifiers: [],
      parameters: {},
      k_value: 5,
      keep_mapping: true
    });
    setError(null);
  }, [datasetId]);

  const anonymizationMethods = [
    { 
      value: 'pseudonymization', 
      label: 'Pseudonymization',
      description: 'Replaces identifiable data with artificial identifiers'
    },
    { 
      value: 'aggregation', 
      label: 'Aggregation',
      description: 'Summarizes data instead of showing individual records'
    },
    { 
      value: 'k_anonymity', 
      label: 'K-Anonymity',
      description: 'Each record is indistinguishable from at least k-1 other records'
    }
  ];

  // Handle method change
  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as 'pseudonymization' | 'aggregation' | 'k_anonymity';
    setOptions(prev => ({
      ...prev,
      method
    }));
  };

  // Toggle sensitive field
  const toggleSensitiveField = (column: string) => {
    setOptions(prev => {
      const newFields = prev.sensitive_fields.includes(column)
        ? prev.sensitive_fields.filter(c => c !== column)
        : [...prev.sensitive_fields, column];
      
      return {
        ...prev,
        sensitive_fields: newFields
      };
    });
  };

  // Toggle quasi-identifier
  const toggleQuasiIdentifier = (column: string) => {
    setOptions(prev => {
      const newFields = prev.quasi_identifiers?.includes(column)
        ? prev.quasi_identifiers!.filter(c => c !== column)
        : [...(prev.quasi_identifiers || []), column];
      
      return {
        ...prev,
        quasi_identifiers: newFields
      };
    });
  };

  // Update k value
  const handleKValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setOptions(prev => ({
        ...prev,
        k_value: value
      }));
    }
  };

  // Toggle keep mapping
  const handleKeepMappingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({
      ...prev,
      keep_mapping: e.target.checked
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (options.sensitive_fields.length === 0) {
      setError('Please select at least one sensitive field to anonymize');
      return;
    }
    
    if (options.method === 'k_anonymity' && (!options.quasi_identifiers || options.quasi_identifiers.length === 0)) {
      setError('For K-Anonymity, please select at least one quasi-identifier');
      return;
    }

    if (options.method === 'k_anonymity' && (!options.k_value || options.k_value < 2)) {
      setError('For K-Anonymity, K value must be at least 2');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Format options according to the backend schema
    const formattedOptions = {
      method: options.method,
      sensitive_fields: options.sensitive_fields,
      quasi_identifiers: options.quasi_identifiers || [],
      parameters: {
        k_value: options.k_value,
        keep_mapping: options.keep_mapping
      }
    };

    try {
      await onSubmit(formattedOptions);
    } catch (err) {
      console.error('Anonymization failed:', err);
      setError('Failed to anonymize dataset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card className="overflow-visible">
          <div className="flex items-start mb-4">
            <ShieldIcon className="text-primary-500 mr-2 mt-1" size={20} />
            <div>
              <Heading level={3}>Anonymization Options</Heading>
              <Text variant="caption" className="text-gray-500">
                Select how to anonymize sensitive data in this dataset.
              </Text>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <div className="flex items-start">
              <AlertCircle className="text-yellow-600 mr-2 shrink-0 mt-0.5" size={16} />
              <Text variant="caption" className="text-yellow-700">
                Anonymization is irreversible. Consider making a copy of your dataset first.
                The anonymized data will be saved as a new version of the dataset.
              </Text>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anonymization Method
            </label>
            <Select
              value={options.method}
              onChange={handleMethodChange}
              fullWidth
            >
              {anonymizationMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
            <Text variant="caption" className="text-gray-500 mt-1">
              {anonymizationMethods.find(m => m.value === options.method)?.description}
            </Text>
          </div>
        </Card>
        
        <Card className="overflow-visible">
          <Heading level={3} className="mb-4">Select Fields to Anonymize</Heading>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensitive Fields
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                {columns.map(column => (
                  <div key={`sensitive-${column}`} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`sensitive-${column}`}
                      checked={options.sensitive_fields.includes(column)}
                      onChange={() => toggleSensitiveField(column)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`sensitive-${column}`} className="text-sm text-gray-700">
                      {column}
                    </label>
                  </div>
                ))}
              </div>
              <Text variant="caption" className="text-gray-500 mt-1">
                Fields containing personal or sensitive information to be anonymized
              </Text>
            </div>
            
            {options.method === 'k_anonymity' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quasi-Identifiers
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {columns.map(column => (
                    <div key={`quasi-${column}`} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`quasi-${column}`}
                        checked={options.quasi_identifiers?.includes(column) || false}
                        onChange={() => toggleQuasiIdentifier(column)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`quasi-${column}`} className="text-sm text-gray-700">
                        {column}
                      </label>
                    </div>
                  ))}
                </div>
                <Text variant="caption" className="text-gray-500 mt-1">
                  Fields that can be used for re-identification when combined
                </Text>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="overflow-visible">
          <Heading level={3} className="mb-4">Additional Options</Heading>
          
          {options.method === 'k_anonymity' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                K Value
              </label>
              <Input
                type="number"
                min={2}
                value={options.k_value || 5}
                onChange={handleKValueChange}
                className="w-32"
              />
              <Text variant="caption" className="text-gray-500 mt-1">
                Minimum number of records that should be indistinguishable (higher = more anonymous)
              </Text>
            </div>
          )}
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="keep-mapping"
                checked={options.keep_mapping}
                onChange={handleKeepMappingChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="keep-mapping" className="ml-2 block text-sm text-gray-700">
                Keep internal mapping for tracking
              </label>
            </div>
            <Text variant="caption" className="text-gray-500 mt-1 ml-6">
              Store the mapping between original and anonymized data (accessible only to administrators)
            </Text>
          </div>
        </Card>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
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
            <ShieldIcon size={16} className="mr-1" />
            Anonymize Dataset
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AnonymizationForm;