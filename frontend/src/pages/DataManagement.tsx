import React, { useState, useEffect } from 'react';
import { Database, Upload, RefreshCw, Search, Filter, Eye, Download, Trash2, BarChart2, Shield } from 'lucide-react';
import { Heading, Text } from '../components/atoms/Typography';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import Tabs from '../components/molecules/Tabs';
import DataUploadModal from '../components/organisms/data/DataUploadModal';
import DatasetPreview from '../components/organisms/data/DatasetPreview';
import DataProcessingForm from '../components/organisms/data/DataProcessingForm';
import AnonymizationForm from '../components/organisms/data/AnonymizationForm';
import TieStrengthDefinitionForm from '../components/organisms/data/TieStrengthDefinition';
import { useDataContext } from '../shared/contexts/DataContext';
import { useProjectContext } from '../shared/contexts/ProjectContext';

const DataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('datasets');
  const [dataUploadModal, setDataUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { 
    datasets, 
    selectedDataset,
    isLoading, 
    error, 
    fetchDatasets, 
    selectDataset,
    deleteDataset,
    processDataset,
    anonymizeDataset,
    dataService
  } = useDataContext();

  // Get the currently selected project from the project context
  const { selectedProject } = useProjectContext();

  // Load datasets on component mount and when the selected project changes
  useEffect(() => {
    fetchDatasets(selectedProject?.id);
  }, [fetchDatasets, selectedProject]);

  // Filter datasets based on search term
  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dataset.description && dataset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    dataset.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Reset view mode when changing tabs
    if (tabId === 'datasets') {
      setViewMode('list');
    }
  };

  const handleDatasetSelect = async (id: number) => {
    await selectDataset(id);
    setSelectedDatasetId(id);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDatasetId(null);
  };

  const handleDeleteClick = (id: number) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete) {
      try {
        await deleteDataset(confirmDelete);
        
        if (selectedDatasetId === confirmDelete) {
          setViewMode('list');
          setSelectedDatasetId(null);
        }
      } catch (err) {
        // Error is already handled in the deleteDataset function in DataContext
        // which sets the appropriate error message for 403 errors
        console.error('Error deleting dataset:', err);
      } finally {
        setConfirmDelete(null);
      }
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const handleProcessSubmit = async (options: any) => {
    if (selectedDatasetId) {
      await processDataset(selectedDatasetId, options);
      // Refresh the dataset details
      await selectDataset(selectedDatasetId);
    }
  };

  const handleAnonymizeSubmit = async (options: any) => {
    if (selectedDatasetId) {
      await anonymizeDataset(selectedDatasetId, options);
      // Refresh the dataset details
      await selectDataset(selectedDatasetId);
    }
  };

  const handleRefresh = () => {
    fetchDatasets();
    if (selectedDatasetId) {
      selectDataset(selectedDatasetId);
    }
  };
  
  const handleDownload = async (id: number, format: 'csv' | 'xlsx' | 'json') => {
    try {
      const blob = await dataService.downloadDataset(id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const renderDatasetsList = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <Heading level={3}>Available Datasets</Heading>
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search size={16} className="absolute left-2.5 top-2 text-gray-400" />
          </div>
          <Button 
            variant="icon" 
            title="Filter Datasets"
            onClick={() => {}}
          >
            <Filter size={16} />
          </Button>
        </div>
      </div>
      
      <Card padding="none">
        {isLoading && datasets.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <Heading level={4} className="mb-2">No datasets found</Heading>
            {searchTerm ? (
              <Text variant="caption" className="text-gray-500">
                No datasets match your search. Try adjusting your search criteria.
              </Text>
            ) : (
              <Text variant="caption" className="text-gray-500">
                You haven't uploaded any datasets yet. Click "Import Data" to get started.
              </Text>
            )}
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => setDataUploadModal(true)}
            >
              <Upload size={16} className="mr-1" />
              Import Data
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDatasets.map(dataset => (
                  <tr key={dataset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Database size={16} className="text-gray-400 mr-2" />
                        <button 
                          className="text-sm font-medium text-primary-600 hover:text-primary-900"
                          onClick={() => handleDatasetSelect(dataset.id)}
                        >
                          {dataset.name}
                        </button>
                      </div>
                      {dataset.description && (
                        <Text variant="caption" className="text-gray-500 mt-1">
                          {dataset.description.length > 50 
                            ? `${dataset.description.substring(0, 50)}...` 
                            : dataset.description}
                        </Text>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{dataset.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{dataset.size}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(dataset.updated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        dataset.status === 'Processed' ? 'bg-green-100 text-green-800' :
                        dataset.status === 'Anonymized' ? 'bg-blue-100 text-blue-800' :
                        dataset.status === 'Needs Cleaning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {dataset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="icon" 
                          title="View Dataset"
                          onClick={() => handleDatasetSelect(dataset.id)}
                        >
                          <Eye size={16} />
                        </Button>
                        <div className="relative group">
                          <Button 
                            variant="icon" 
                            title="Download Dataset"
                          >
                            <Download size={16} />
                          </Button>
                          <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                            <div className="py-1">
                              <button
                                onClick={() => handleDownload(dataset.id, 'csv')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                CSV
                              </button>
                              <button
                                onClick={() => handleDownload(dataset.id, 'xlsx')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Excel (XLSX)
                              </button>
                              <button
                                onClick={() => handleDownload(dataset.id, 'json')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                JSON
                              </button>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="icon" 
                          title="Delete Dataset"
                          onClick={() => handleDeleteClick(dataset.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );

  const renderDatasetDetail = () => {
    if (!selectedDataset) return null;
    
    return (
      <>
        <div className="flex items-center mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="mr-2"
            onClick={handleBackToList}
          >
            Back to List
          </Button>
          <Heading level={3}>{selectedDataset.name}</Heading>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-50">
            <div className="flex items-center">
              <Database size={20} className="text-gray-500 mr-2" />
              <div>
                <Text variant="caption" className="text-gray-500">Type</Text>
                <Text variant="p" className="font-medium">{selectedDataset.type}</Text>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gray-50">
            <div className="flex items-center">
              <BarChart2 size={20} className="text-gray-500 mr-2" />
              <div>
                <Text variant="caption" className="text-gray-500">Rows</Text>
                <Text variant="p" className="font-medium">
                  {selectedDataset.row_count?.toLocaleString() || 'Unknown'}
                </Text>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gray-50">
            <div className="flex items-center">
              <Shield size={20} className="text-gray-500 mr-2" />
              <div>
                <Text variant="caption" className="text-gray-500">Status</Text>
                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  selectedDataset.status === 'Processed' ? 'bg-green-100 text-green-800' :
                  selectedDataset.status === 'Anonymized' ? 'bg-blue-100 text-blue-800' :
                  selectedDataset.status === 'Needs Cleaning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedDataset.status}
                </span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gray-50">
            <div>
              <Text variant="caption" className="text-gray-500">Last Updated</Text>
              <Text variant="p" className="font-medium">
                {new Date(selectedDataset.updated_at).toLocaleDateString()}
              </Text>
            </div>
          </Card>
        </div>
        
        <DatasetPreview datasetId={selectedDataset.id} />

        <div className="mt-6">
          <TieStrengthDefinitionForm dataset={selectedDataset} />
        </div>
      </>
    );
  };

  const renderProcessingTab = () => {
    if (!selectedDataset) {
      return (
        <Card>
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <Heading level={4} className="mb-2">No dataset selected</Heading>
            <Text variant="caption" className="text-gray-500">
              Please select a dataset from the Datasets tab to process it.
            </Text>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => {
                setActiveTab('datasets');
                setViewMode('list');
              }}
            >
              View Datasets
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <DataProcessingForm
        datasetId={selectedDataset.id}
        columns={selectedDataset.columns || []}
        onSubmit={handleProcessSubmit}
      />
    );
  };

  const renderAnonymizationTab = () => {
    if (!selectedDataset) {
      return (
        <Card>
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <Heading level={4} className="mb-2">No dataset selected</Heading>
            <Text variant="caption" className="text-gray-500">
              Please select a dataset from the Datasets tab to anonymize it.
            </Text>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => {
                setActiveTab('datasets');
                setViewMode('list');
              }}
            >
              View Datasets
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <AnonymizationForm
        datasetId={selectedDataset.id}
        columns={selectedDataset.columns || []}
        onSubmit={handleAnonymizeSubmit}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database className="text-primary-600 mr-2" size={24} />
          <Heading level={2}>Data Management</Heading>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleRefresh}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={() => setDataUploadModal(true)}
          >
            <Upload size={16} className="mr-1" />
            Import Data
          </Button>
        </div>
      </div>
      
      {/* Check if a project is selected */}
      {!selectedProject && (
        <Card className="text-center p-8">
          <Heading level={4}>No Project Selected</Heading>
          <Text className="mt-2 text-gray-600">
            Please select an active project from the dropdown in the header to view its content.
          </Text>
        </Card>
      )}
      
      {/* Only show content if a project is selected */}
      {selectedProject && (
        <>
          {/* Module Tabs */}
          <Tabs
            items={[
              { id: 'datasets', label: 'Datasets' },
              { id: 'preprocessing', label: 'Data Processing' },
              { id: 'anonymization', label: 'Anonymization' }
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <Text variant="p" className="text-sm text-red-700">
                    {error}
                  </Text>
                </div>
              </div>
            </div>
          )}
          
          {/* Datasets Tab Content */}
          {activeTab === 'datasets' && (
            <div className="space-y-6">
              {viewMode === 'list' ? renderDatasetsList() : renderDatasetDetail()}
            </div>
          )}
          
          {/* Preprocessing Tab Content */}
          {activeTab === 'preprocessing' && renderProcessingTab()}
          
          {/* Anonymization Tab Content */}
          {activeTab === 'anonymization' && renderAnonymizationTab()}
          
          {/* Data Upload Modal */}
          {dataUploadModal && (
            <DataUploadModal 
              onClose={() => setDataUploadModal(false)} 
              onSuccess={fetchDatasets}
            />
          )}
          
          {/* Delete Confirmation Modal */}
          {confirmDelete !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-md p-6">
                <Heading level={3} className="mb-4">Confirm Deletion</Heading>
                <Text variant="p" className="mb-6">
                  Are you sure you want to delete this dataset? This action cannot be undone.
                </Text>
                <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={handleConfirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataManagement;