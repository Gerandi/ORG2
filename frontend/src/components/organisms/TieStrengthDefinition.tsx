import React, { useState, useEffect } from 'react';
import { Dataset, TieStrengthDefinition, TieStrengthCalculationMethod } from '../../types/data';
import { useDataContext } from '../../shared/contexts';
import Card from '../atoms/Card';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Select from '../atoms/Select';
import Input from '../atoms/Input';
import Checkbox from '../atoms/Checkbox';
import { Link } from 'lucide-react';

interface TieStrengthDefinitionProps {
  dataset: Dataset;
}

const TieStrengthDefinitionForm: React.FC<TieStrengthDefinitionProps> = ({ dataset }) => {
  const { defineTieStrength, isLoading, error } = useDataContext();
  const [definition, setDefinition] = useState<TieStrengthDefinition>(
    dataset.tie_strength_definition || {
      source_column: '',
      target_column: '',
      calculation_method: 'frequency',
      directed: false,
    }
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Update local state if dataset definition changes externally
    setDefinition(dataset.tie_strength_definition || {
      source_column: '',
      target_column: '',
      calculation_method: 'frequency',
      directed: false,
    });
  }, [dataset.tie_strength_definition]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setDefinition(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!definition.source_column || !definition.target_column) {
      setLocalError('Source and Target columns are required.');
      return;
    }
    if (definition.calculation_method === 'attribute_value' && !definition.weight_column) {
      setLocalError('Weight column is required for Attribute Value method.');
      return;
    }

    await defineTieStrength(dataset.id, definition);
  };

  const columnOptions = dataset.columns?.map(col => ({ value: col, label: col })) || [];
  const calculationMethods: { value: TieStrengthCalculationMethod; label: string }[] = [
    { value: 'frequency', label: 'Frequency (Interaction Count)' },
    { value: 'attribute_value', label: 'Attribute Value (Sum/Use Value)' },
  ];

  return (
    <Card>
      <Heading level={4} className="mb-4 flex items-center">
        <Link size={18} className="mr-2 text-blue-600" />
        Define Network Tie Strength
      </Heading>
      <Text variant="caption" className="mb-4">
        Specify how the strength of connections (edge weights) should be calculated when creating a network from this dataset.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="source_column" className="block text-sm font-medium text-gray-700 mb-1">Source Column *</label>
            <Select id="source_column" name="source_column" value={definition.source_column} onChange={handleInputChange} options={[{ value: '', label: 'Select...' }, ...columnOptions]} required />
          </div>
          <div>
            <label htmlFor="target_column" className="block text-sm font-medium text-gray-700 mb-1">Target Column *</label>
            <Select id="target_column" name="target_column" value={definition.target_column} onChange={handleInputChange} options={[{ value: '', label: 'Select...' }, ...columnOptions]} required />
          </div>
        </div>

        <div>
          <label htmlFor="calculation_method" className="block text-sm font-medium text-gray-700 mb-1">Calculation Method *</label>
          <Select id="calculation_method" name="calculation_method" value={definition.calculation_method} onChange={handleInputChange} options={calculationMethods} required />
        </div>

        {definition.calculation_method === 'attribute_value' && (
          <div>
            <label htmlFor="weight_column" className="block text-sm font-medium text-gray-700 mb-1">Weight Column *</label>
            <Select id="weight_column" name="weight_column" value={definition.weight_column || ''} onChange={handleInputChange} options={[{ value: '', label: 'Select...' }, ...columnOptions]} required />
            <Text variant="caption" className="mt-1">Column containing the numeric value to use as weight (values will be summed for duplicate pairs).</Text>
          </div>
        )}

        {/* Optional fields for frequency (can be added later) */}
        {/* <div>
          <label htmlFor="timestamp_column" className="block text-sm font-medium text-gray-700 mb-1">Timestamp Column (Optional)</label>
          <Select id="timestamp_column" name="timestamp_column" value={definition.timestamp_column || ''} onChange={handleInputChange} options={[{ value: '', label: 'Select...' }, ...columnOptions]} />
        </div>
        <div>
          <label htmlFor="time_window_seconds" className="block text-sm font-medium text-gray-700 mb-1">Time Window (Seconds, Optional)</label>
          <Input id="time_window_seconds" name="time_window_seconds" type="number" value={definition.time_window_seconds || ''} onChange={handleInputChange} />
        </div> */}

        <div className="flex items-center">
          <Checkbox
            id="directed"
            name="directed"
            checked={definition.directed}
            onChange={handleInputChange}
          />
          <label htmlFor="directed" className="ml-2 block text-sm text-gray-700">
            Directed Relationship (Source -> Target matters)
          </label>
        </div>

        {(error || localError) && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error || localError}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isLoading}>
            Save Definition
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TieStrengthDefinitionForm;