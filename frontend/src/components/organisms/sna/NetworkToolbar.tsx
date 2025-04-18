import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Share2, Settings, BarChart2, Search } from 'lucide-react';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

interface NetworkToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onDownload: () => void;
  onShareGraph: () => void;
  onToggleSettings: () => void;
  onToggleMetrics: () => void;
  onSearch: (searchTerm: string) => void;
  showMetricsPanel: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const NetworkToolbar: React.FC<NetworkToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onDownload,
  onShareGraph,
  onToggleSettings,
  onToggleMetrics,
  onSearch,
  showMetricsPanel,
  searchTerm,
  setSearchTerm
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className="bg-white border-b border-gray-200 p-2 flex items-center">
      <div className="flex space-x-1 mr-4">
        <Button variant="icon" onClick={onZoomIn} title="Zoom In">
          <ZoomIn size={18} />
        </Button>
        <Button variant="icon" onClick={onZoomOut} title="Zoom Out">
          <ZoomOut size={18} />
        </Button>
        <Button variant="icon" onClick={onReset} title="Reset View">
          <RotateCcw size={18} />
        </Button>
      </div>
      
      <form onSubmit={handleSearchSubmit} className="flex-1 mx-4">
        <div className="relative">
          <input 
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <Search size={16} className="absolute left-2.5 top-2 text-gray-400" />
        </div>
      </form>
      
      <div className="flex space-x-1">
        <Button variant="icon" onClick={onDownload} title="Download Graph">
          <Download size={18} />
        </Button>
        <Button variant="icon" onClick={onShareGraph} title="Share Graph">
          <Share2 size={18} />
        </Button>
        <Button 
          variant="icon" 
          onClick={onToggleSettings}
          title="Settings"
        >
          <Settings size={18} />
        </Button>
        <Button 
          variant={showMetricsPanel ? "primary-icon" : "icon"}
          onClick={onToggleMetrics}
          title="Network Metrics"
        >
          <BarChart2 size={18} />
        </Button>
      </div>
    </div>
  );
};

export default NetworkToolbar;