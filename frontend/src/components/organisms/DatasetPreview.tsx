import React, { useState, useEffect } from 'react';
import { Eye, BarChart, Download, Info, ExternalLink } from 'lucide-react';
import Card from '../atoms/Card';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import { useDataContext } from '../../shared/contexts';
import Tabs from '../molecules/Tabs';

interface DatasetPreviewProps {
  datasetId: number;
}

interface DataPreview {
  columns: string[];
  data: any[];
  total_rows: number;
}

interface DataStats {
  row_count: number;
  column_count: number;
  missing_values: Record<string, number>;
  data_types: Record<string, string>;
  statistics: Record<string, any>;
}

const DatasetPreview: React.FC<DatasetPreviewProps> = ({ datasetId }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [preview, setPreview] = useState<DataPreview | null>(null);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { dataService } = useDataContext();

  useEffect(() => {
    if (datasetId) {
      loadPreview();
    }
  }, [datasetId]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const previewData = await dataService.getDatasetPreview(datasetId, 100);
      setPreview(previewData);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Failed to load dataset preview');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (stats) return; // Only load once

    setIsLoading(true);
    setError(null);

    try {
      const statsData = await dataService.getDatasetStats(datasetId);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load dataset statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === 'statistics' && !stats) {
      loadStats();
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'json') => {
    try {
      const blob = await dataService.downloadDataset(datasetId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${datasetId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download dataset');
    }
  };

  if (isLoading && !preview && !stats) {
    return (
      <Card>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (error && !preview && !stats) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center h-64">
          <Info className="text-red-500 h-12 w-12 mb-4" />
          <Text className="text-red-600">{error}</Text>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError(null);
              loadPreview();
            }}
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Heading level={3} className="flex items-center">
            <Eye size={18} className="text-gray-500 mr-2" />
            Dataset Viewer
          </Heading>
          
          <div className="flex space-x-2">
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-1" />
                Download
              </Button>
              
              <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                <div className="py-1">
                  <button
                    onClick={() => handleDownload('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleDownload('xlsx')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Excel (XLSX)
                  </button>
                  <button
                    onClick={() => handleDownload('json')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs
          items={[
            { id: 'preview', label: 'Data Preview' },
            { id: 'statistics', label: 'Statistics' }
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="mt-4"
        />
      </div>
      
      {activeTab === 'preview' && preview && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {preview.columns.map(column => (
                  <th
                    key={column}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {preview.data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {preview.columns.map(column => (
                    <td key={`${rowIndex}-${column}`} className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {row[column]?.toString() || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {preview.total_rows > preview.data.length && (
            <div className="bg-gray-50 p-3 text-center text-sm text-gray-500 border-t border-gray-200">
              Showing {preview.data.length} of {preview.total_rows} rows
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'statistics' && (
        <>
          {isLoading && !stats ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : stats ? (
            <div className="divide-y divide-gray-200">
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Rows
                  </Text>
                  <Heading level={3}>{stats.row_count.toLocaleString()}</Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Columns
                  </Text>
                  <Heading level={3}>{stats.column_count.toLocaleString()}</Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Missing Values
                  </Text>
                  <Heading level={3}>
                    {Object.values(stats.missing_values).reduce((acc, val) => acc + val, 0).toLocaleString()}
                  </Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Data Types
                  </Text>
                  <div className="flex flex-wrap mt-1">
                    {Object.entries(
                      Object.values(stats.data_types).reduce<Record<string, number>>((acc, type) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className="mr-2 bg-white px-2 py-0.5 rounded-full text-xs border">
                        {type}: {count}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <Heading level={4} className="mb-3">Column Statistics</Heading>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Missing
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statistics
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.keys(stats.data_types).map(column => (
                        <tr key={column}>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {column}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                              {stats.data_types[column]}
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                            {stats.missing_values[column] || 0}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {stats.statistics[column] ? (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.statistics[column]).map(([key, value]) => (
                                  <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
                                    {key}: {typeof value === 'number' ? value.toFixed(2) : value?.toString()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <Info className="text-red-500 h-12 w-12 mb-4" />
              <Text className="text-red-600">{error || 'Failed to load statistics'}</Text>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setError(null);
                  loadStats();
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DatasetPreview;