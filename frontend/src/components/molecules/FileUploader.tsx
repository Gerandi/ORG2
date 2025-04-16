import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Button from '../atoms/Button';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedFormats?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  label?: string;
  description?: string;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  onFileRemove,
  acceptedFormats = '.csv,.json,.xlsx,.xls',
  multiple = false,
  maxSize = 50, // 50MB default
  label = 'Drag files here',
  description = 'Supported formats: CSV, JSON, XLSX (max. 50MB)',
  className = '',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds the limit of ${maxSize}MB`);
      return false;
    }

    // Check file type if acceptedFormats is provided
    if (acceptedFormats) {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const formats = acceptedFormats.split(',');
      
      if (!formats.some(format => 
        format.trim() === fileExtension || 
        format.trim() === file.type
      )) {
        setError(`File type not supported. Please upload: ${acceptedFormats}`);
        return false;
      }
    }

    setError(null);
    return true;
  }, [acceptedFormats, maxSize]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        onFileSelect(droppedFile);
      }
    }
  }, [onFileSelect, validateFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        onFileSelect(selectedFile);
      }
    }
  }, [onFileSelect, validateFile]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileRemove) {
      onFileRemove();
    }
  }, [onFileRemove]);

  const handleSelectClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className={`${className}`}>
      <input
        type="file"
        accept={acceptedFormats}
        onChange={handleFileChange}
        multiple={multiple}
        className="hidden"
        ref={fileInputRef}
      />
      
      {!file ? (
        <div
          className={`border-2 ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors duration-200 ${error ? 'border-red-300' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleFileDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{label}</h3>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={handleSelectClick}>
                Browse Files
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary-500 mr-3" />
              <div>
                <p className="font-medium text-sm text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;