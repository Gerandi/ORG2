import React, { useState, useEffect } from 'react';
import { Eye, BarChart, Download, Info, ExternalLink } from 'lucide-react';
import Card from '../../atoms/Card';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import { useDataContext } from '../../../shared/contexts';
import Tabs from '../../molecules/Tabs';

interface DatasetPreviewProps {
  datasetId: number;
}

const DatasetPreview: React.FC<DatasetPreviewProps> = ({ datasetId }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const { 
    dataPreview,
    dataStats, 
    getDatasetPreview, 
    getDatasetStats, 
    downloadDataset,
    isLoading, 
    error 
  } = useDataContext();

  // Load preview data when component mounts or datasetId changes
  useEffect(() => {
    if (datasetId) {
      loadPreview();
    }
  }, [datasetId]);

  // Load preview data
  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      await getDatasetPreview(datasetId, 100);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setPreviewError('Failed to load dataset preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Load stats data
  const loadStats = async () => {
    if (dataStats) return; // Only load once if already loaded
    setStatsLoading(true);
    setStatsError(null);

    try {
      await getDatasetStats(datasetId);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setStatsError('Failed to load dataset statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === 'statistics' && !dataStats) {
      loadStats();
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'json') => {
    setDownloadLoading(true);
    try {
      await downloadDataset(datasetId, format);
    } catch (err) {
      console.error('Download failed:', err);
      setPreviewError('Failed to download dataset');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Show loading state when first loading preview
  if ((previewLoading || isLoading) && !dataPreview && !dataStats) {
    return (
      <Card>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  // Show error state when failed to load preview
  if ((previewError || error) && !dataPreview && !dataStats) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center h-64">
          <Info className="text-red-500 h-12 w-12 mb-4" />
          <Text className="text-red-600">{previewError || error}</Text>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setPreviewError(null);
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
              <Button variant="outline" size="sm" disabled={downloadLoading || isLoading}>
                <Download size={16} className="mr-1" />
                Download
                {downloadLoading && <span className="ml-2 inline-block animate-spin">⋯</span>}
              </Button>
              
              <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                <div className="py-1">
                  <button
                    onClick={() => handleDownload('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    disabled={downloadLoading || isLoading}
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleDownload('xlsx')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    disabled={downloadLoading || isLoading}
                  >
                    Excel (XLSX)
                  </button>
                  <button
                    onClick={() => handleDownload('json')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    disabled={downloadLoading || isLoading}
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
      
      {activeTab === 'preview' && dataPreview && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {dataPreview.columns.map(column => (
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
              {dataPreview.data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {dataPreview.columns.map(column => (
                    <td key={`${rowIndex}-${column}`} className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {row[column]?.toString() || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {dataPreview.total_rows > dataPreview.data.length && (
            <div className="bg-gray-50 p-3 text-center text-sm text-gray-500 border-t border-gray-200">
              Showing {dataPreview.data.length} of {dataPreview.total_rows} rows
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'statistics' && (
        <>
          {(statsLoading || isLoading) && !dataStats ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : dataStats ? (
            <div className="divide-y divide-gray-200">
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Rows
                  </Text>
                  <Heading level={3}>{dataStats.row_count.toLocaleString()}</Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Columns
                  </Text>
                  <Heading level={3}>{dataStats.column_count.toLocaleString()}</Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Missing Values
                  </Text>
                  <Heading level={3}>
                    {Object.values(dataStats.missing_values).reduce((acc, val) => acc + val, 0).toLocaleString()}
                  </Heading>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <Text variant="caption" className="text-gray-500">
                    Data Types
                  </Text>
                  <div className="flex flex-wrap mt-1">
                    {Object.entries(
                      Object.values(dataStats.data_types).reduce<Record<string, number>>((acc, type) => {
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
                      {Object.keys(dataStats.data_types).map(column => (
                        <tr key={column}>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {column}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                              {dataStats.data_types[column]}
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                            {dataStats.missing_values[column] || 0}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {dataStats.statistics[column] ? (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(dataStats.statistics[column]).map(([key, value]) => (
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
              <Text className="text-red-600">{statsError || error || 'Failed to load statistics'}</Text>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setStatsError(null);
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