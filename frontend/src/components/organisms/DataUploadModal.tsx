import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Tabs from '../molecules/Tabs';
import FileUploader from '../molecules/FileUploader';
import Input from '../atoms/Input';
import { useDataContext, useProjectContext } from '../../shared/contexts';
import Select, { SelectOption } from '../atoms/Select/Select';

interface DataUploadModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const DataUploadModal: React.FC<DataUploadModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('file-upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { uploadDataset, isLoading, error } = useDataContext();
  const { projects, fetchProjects, selectedProject, isLoading: isLoadingProjects } = useProjectContext();

  // Ensure projects are loaded when the modal opens
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Set the selected project as default when modal opens
  useEffect(() => {
    if (selectedProject) {
      setSelectedProjectId(selectedProject.id.toString());
    }
  }, [selectedProject]);

  useEffect(() => {
    // Reset state when modal is closed
    return () => {
      setSelectedFile(null);
      setDatasetName('');
      setSelectedProjectId('');
      setLocalError(null);
    };
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    // Set default dataset name from file name (without extension)
    if (!datasetName) {
      const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
      setDatasetName(fileNameWithoutExt || file.name);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setLocalError('Please select a file to upload');
      return;
    }

    if (!datasetName.trim()) {
      setLocalError('Please provide a name for the dataset');
      return;
    }

    setLocalError(null);

    try {
      // Convert selectedProjectId to number if it's not empty
      const projectId = selectedProjectId ? parseInt(selectedProjectId) : null;
      await uploadDataset(selectedFile, datasetName, projectId);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setLocalError('Failed to upload dataset. Please try again.');
    }
  };

  // Convert projects to options format required by Select
  const projectOptions: SelectOption[] = [
    { value: '', label: 'None' },
    ...(projects?.map(project => ({
      value: project.id.toString(),
      label: project.name
    })) || [])
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>Import Data</Heading>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6">
          <Tabs
            items={[
              { id: 'file-upload', label: 'File Upload' },
              { id: 'external-source', label: 'External Source' },
              { id: 'manual-entry', label: 'Manual Entry' }
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        </div>
        
        {activeTab === 'file-upload' && (
          <>
            <FileUploader
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              className="mb-6"
            />
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Dataset Name
                </label>
                <Input
                  id="dataset-name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Enter a name for this dataset"
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project (Optional)
                </label>
                {isLoadingProjects ? (
                  <Select
                    id="project"
                    options={[{ value: '', label: 'Loading projects...' }]}
                    disabled
                    fullWidth
                  />
                ) : (
                  <Select
                    id="project"
                    options={projectOptions}
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    fullWidth
                  />
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'external-source' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Text variant="caption" className="text-gray-500 mb-2">
              Connect to external data sources like:
            </Text>
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600">
              <li>Database connections (MySQL, PostgreSQL, etc.)</li>
              <li>Cloud storage (Google Drive, Dropbox, etc.)</li>
              <li>API integrations</li>
              <li>Data warehouses</li>
            </ul>
            <Text variant="caption" className="text-gray-500">
              This feature is coming soon!
            </Text>
          </div>
        )}

        {activeTab === 'manual-entry' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Text variant="caption" className="text-gray-500 mb-4">
              Manually create and edit datasets directly in the platform.
            </Text>
            <Text variant="caption" className="text-gray-500">
              This feature is coming soon!
            </Text>
          </div>
        )}
        
        {(localError || error) && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {localError || error}
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-4 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handleUpload}
            loading={isLoading}
            disabled={isLoading || !selectedFile || activeTab !== 'file-upload'}
          >
            {isLoading ? 'Uploading...' : 'Import Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataUploadModal;