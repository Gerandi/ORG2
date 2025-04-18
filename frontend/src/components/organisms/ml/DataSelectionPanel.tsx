import React, { useState, useEffect } from 'react';
import { Heading, Text } from '../../../components/atoms/Typography';
import Card from '../../../components/atoms/Card';
import Button from '../../../components/atoms/Button';
import { Database, Info } from 'lucide-react';
import { Dataset } from '../../../types/data';

interface DataSelectionPanelProps {
  datasets: Dataset[];
  onDataSelected: (datasetId: number, targetColumn: string) => void;
  isLoading?: boolean;
}

const DataSelectionPanel: React.FC<DataSelectionPanelProps> = ({ 
  datasets, 
  onDataSelected, 
  isLoading = false 
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get the selected dataset object
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  // Update available columns when dataset is selected
  useEffect(() => {
    if (selectedDataset && selectedDataset.columns) {
      setAvailableColumns(selectedDataset.columns);
      setTargetColumn(''); // Reset target column when dataset changes
    } else {
      setAvailableColumns([]);
    }
  }, [selectedDataset]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const datasetId = parseInt(e.target.value);
    setSelectedDatasetId(isNaN(datasetId) ? null : datasetId);
  };

  const handleTargetColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetColumn(e.target.value);
  };

  const handleContinue = () => {
    if (!selectedDatasetId) {
      setError('Please select a dataset');
      return;
    }
    
    if (!targetColumn) {
      setError('Please select a target column');
      return;
    }
    
    setError(null);
    onDataSelected(selectedDatasetId, targetColumn);
  };

  return (
    <Card className="pb-6">
      <div className="flex items-center mb-4">
        <Database className="mr-2 text-blue-600" size={24} />
        <Heading level={3}>Data Selection</Heading>
      </div>
      
      <Text variant="p" className="mb-6 text-gray-600">
        Select a dataset and target variable for your machine learning model.
      </Text>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {datasets.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <Database className="mx-auto mb-2 text-gray-400" size={32} />
          <Heading level={4} className="mb-2">No Datasets Available</Heading>
          <Text className="text-gray-500">
            Please upload a dataset in the Data Management section first.
          </Text>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset
            </label>
            <select
              id="dataset-select"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedDatasetId || ''}
              onChange={handleDatasetChange}
              disabled={isLoading}
            >
              <option value="">Select a dataset</option>
              {datasets.map(dataset => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.rows} rows × {dataset.columns?.length || '?'} columns)
                </option>
              ))}
            </select>
          </div>
          
          {selectedDataset && (
            <div>
              <div className="flex items-center mb-1">
                <label htmlFor="target-column" className="block text-sm font-medium text-gray-700">
                  Target Variable
                </label>
                <div className="ml-1 group relative">
                  <Info size={16} className="text-gray-400 cursor-help" />
                  <div className="invisible group-hover:visible absolute left-full ml-1 p-2 bg-gray-800 text-white text-xs rounded w-64">
                    The target variable is the outcome you want to predict with your model
                  </div>
                </div>
              </div>
              
              <select
                id="target-column"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={targetColumn}
                onChange={handleTargetColumnChange}
                disabled={isLoading || availableColumns.length === 0}
              >
                <option value="">Select target variable</option>
                {availableColumns.map(column => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {selectedDataset && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <p className="font-medium text-blue-800 mb-1">Dataset Information</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span> {selectedDataset.name}
                </div>
                <div>
                  <span className="text-gray-600">Format:</span> {selectedDataset.file_format || 'Unknown'}
                </div>
                <div>
                  <span className="text-gray-600">Rows:</span> {selectedDataset.rows}
                </div>
                <div>
                  <span className="text-gray-600">Columns:</span> {selectedDataset.columns?.length || 'Unknown'}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Description:</span> {selectedDataset.description || 'No description'}
                </div>
              </div>
            </div>
          )}
          
          <div className="pt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={handleContinue}
              disabled={isLoading || !selectedDatasetId || !targetColumn}
              loading={isLoading}
            >
              Continue to Feature Engineering
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DataSelectionPanel;