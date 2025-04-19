import React, { useState } from 'react';
import { Sliders, Filter, LayoutGrid } from 'lucide-react';
import { VisualizationOptions, LayoutOptions } from '../../../types/network';
import { Heading, Text } from '../../atoms/Typography';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select';
import Card from '../../atoms/Card';

interface NetworkControlsProps {
  visualizationOptions: VisualizationOptions;
  onOptionsChange: (newOptions: Partial<VisualizationOptions>) => void;
  networkAttributes?: {
    departments?: string[];
    roles?: string[];
    otherAttributes?: string[];
  };
}

const NetworkControls: React.FC<NetworkControlsProps> = ({
  visualizationOptions,
  onOptionsChange,
  networkAttributes = {}
}) => {
  const [activeSection, setActiveSection] = useState<'layout' | 'nodes' | 'edges' | 'filters'>('layout');

  const { departments = [], roles = [], otherAttributes = [] } = networkAttributes;

  // Available layout types
  const layoutTypes = [
    { value: 'force', label: 'Force-directed (Force Atlas)' },
    { value: 'circular', label: 'Circular' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'radial', label: 'Radial' }
  ];

  // Node size options
  const nodeSizeOptions = [
    { value: 'uniform', label: 'Uniform Size' },
    { value: 'degree', label: 'Degree Centrality' },
    { value: 'betweenness', label: 'Betweenness Centrality' },
    { value: 'closeness', label: 'Closeness Centrality' },
    { value: 'eigenvector', label: 'Eigenvector Centrality' },
    { value: 'clustering', label: 'Clustering Coefficient' },
    { value: 'attribute', label: 'Node Attribute' }
  ];

  // Node color options
  const nodeColorOptions = [
    { value: 'department', label: 'Department' },
    { value: 'role', label: 'Role' },
    { value: 'community', label: 'Community' },
    { value: 'centrality', label: 'Centrality' },
    { value: 'attribute', label: 'Node Attribute' }
  ];

  // Edge width options
  const edgeWidthOptions = [
    { value: 'uniform', label: 'Uniform Width' },
    { value: 'weight', label: 'Edge Weight' }
  ];

  // Handle layout change
  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const layoutType = e.target.value as 'force' | 'circular' | 'hierarchical' | 'radial';
    const newLayout: LayoutOptions = {
      ...visualizationOptions.layout,
      type: layoutType
    };
    onOptionsChange({ layout: newLayout });
  };

  // Handle node size option change
  const handleNodeSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sizeBy = e.target.value as VisualizationOptions['node_size']['by'];
    onOptionsChange({
      node_size: {
        ...visualizationOptions.node_size,
        by: sizeBy
      }
    });
  };

  // Handle node size attribute selection
  const handleNodeSizeAttributeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({
      node_size: {
        ...visualizationOptions.node_size,
        attribute: e.target.value
      }
    });
  };

  // Handle node size scale change
  const handleNodeSizeScaleChange = (min: number, max: number) => {
    onOptionsChange({
      node_size: {
        ...visualizationOptions.node_size,
        scale: [min, max]
      }
    });
  };

  // Handle node color option change
  const handleNodeColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colorBy = e.target.value as VisualizationOptions['node_color']['by'];
    onOptionsChange({
      node_color: {
        ...visualizationOptions.node_color,
        by: colorBy
      }
    });
  };

  // Handle node color attribute selection
  const handleNodeColorAttributeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({
      node_color: {
        ...visualizationOptions.node_color,
        attribute: e.target.value
      }
    });
  };

  // Handle edge width option change
  const handleEdgeWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const widthBy = e.target.value as VisualizationOptions['edge_width']['by'];
    onOptionsChange({
      edge_width: {
        ...visualizationOptions.edge_width,
        by: widthBy
      }
    });
  };

  // Handle edge width scale change
  const handleEdgeWidthScaleChange = (min: number, max: number) => {
    onOptionsChange({
      edge_width: {
        ...visualizationOptions.edge_width,
        scale: [min, max]
      }
    });
  };

  // Handle show labels toggle
  const handleShowLabelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      show_labels: e.target.checked
    });
  };

  // Handle label property change
  const handleLabelPropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({
      label_property: e.target.value
    });
  };

  // Handle tie strength threshold change
  const handleTieStrengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onOptionsChange({
      filters: {
        ...visualizationOptions.filters,
        min_tie_strength: value
      }
    });
  };

  // Handle department filter change
  const handleDepartmentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const department = e.target.value;
    if (!department) {
      // Clear department filter
      const newFilters = { ...visualizationOptions.filters };
      delete newFilters.departments;
      onOptionsChange({ filters: newFilters });
    } else {
      onOptionsChange({
        filters: {
          ...visualizationOptions.filters,
          departments: [department]
        }
      });
    }
  };

  // Handle role filter change
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    if (!role) {
      // Clear role filter
      const newFilters = { ...visualizationOptions.filters };
      delete newFilters.roles;
      onOptionsChange({ filters: newFilters });
    } else {
      onOptionsChange({
        filters: {
          ...visualizationOptions.filters,
          roles: [role]
        }
      });
    }
  };

  return (
    <div className="network-controls">
      <div className="mb-4 flex space-x-1 border-b border-gray-200">
        <button
          className={`py-2 px-3 text-sm font-medium ${activeSection === 'layout' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveSection('layout')}
        >
          <LayoutGrid size={16} className="inline mr-1" /> Layout
        </button>
        <button
          className={`py-2 px-3 text-sm font-medium ${activeSection === 'nodes' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveSection('nodes')}
        >
          <span className="inline-block w-3 h-3 rounded-full bg-primary-500 mr-1"></span> Nodes
        </button>
        <button
          className={`py-2 px-3 text-sm font-medium ${activeSection === 'edges' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveSection('edges')}
        >
          <span className="inline-block w-4 h-px bg-gray-400 mr-1"></span> Edges
        </button>
        <button
          className={`py-2 px-3 text-sm font-medium ${activeSection === 'filters' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
          onClick={() => setActiveSection('filters')}
        >
          <Filter size={16} className="inline mr-1" /> Filters
        </button>
      </div>

      {/* Layout Section */}
      {activeSection === 'layout' && (
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout Type
            </label>
            <Select
              options={layoutTypes}
              value={visualizationOptions.layout.type}
              onChange={handleLayoutChange}
              fullWidth
            />
            <Text variant="caption" className="text-gray-500 mt-1">
              {visualizationOptions.layout.type === 'force' && 'Force-directed layout simulates physical forces to position nodes'}
              {visualizationOptions.layout.type === 'circular' && 'Arranges nodes in a circle, useful for cyclic structures'}
              {visualizationOptions.layout.type === 'hierarchical' && 'Arranges nodes in a hierarchical tree structure'}
              {visualizationOptions.layout.type === 'radial' && 'Positions nodes in concentric circles around a center point'}
            </Text>
          </div>

          {visualizationOptions.layout.type === 'force' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Force Strength</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="range" 
                    className="flex-1" 
                    min="1" 
                    max="10" 
                    value={visualizationOptions.layout.parameters?.strength || 5} 
                    onChange={(e) => {
                      const newLayout: LayoutOptions = {
                        ...visualizationOptions.layout,
                        parameters: {
                          ...visualizationOptions.layout.parameters,
                          strength: parseInt(e.target.value)
                        }
                      };
                      onOptionsChange({ layout: newLayout });
                    }}
                  />
                  <span className="text-xs">{visualizationOptions.layout.parameters?.strength || 5}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nodes Section */}
      {activeSection === 'nodes' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node Size
            </label>
            <Select
              options={nodeSizeOptions}
              value={visualizationOptions.node_size.by}
              onChange={handleNodeSizeChange}
              fullWidth
            />
          </div>

          {visualizationOptions.node_size.by === 'attribute' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size Attribute
              </label>
              <Select
                options={[{value: '', label: 'Select Attribute'}, ...otherAttributes.map(attr => ({value: attr, label: attr}))]} 
                value={visualizationOptions.node_size.attribute || ''}
                onChange={handleNodeSizeAttributeChange}
                fullWidth
              />
            </div>
          )}

          {visualizationOptions.node_size.by !== 'uniform' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size Range
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={visualizationOptions.node_size.scale?.[0] || 5}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(e) => {
                    const min = parseFloat(e.target.value);
                    const max = visualizationOptions.node_size.scale?.[1] || 20;
                    handleNodeSizeScaleChange(min, max);
                  }}
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  value={visualizationOptions.node_size.scale?.[1] || 20}
                  min={1}
                  max={50}
                  step={1}
                  onChange={(e) => {
                    const max = parseFloat(e.target.value);
                    const min = visualizationOptions.node_size.scale?.[0] || 5;
                    handleNodeSizeScaleChange(min, max);
                  }}
                  className="w-20"
                />
                <span>px</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node Color
            </label>
            <Select
              options={nodeColorOptions}
              value={visualizationOptions.node_color.by}
              onChange={handleNodeColorChange}
              fullWidth
            />
          </div>

          {visualizationOptions.node_color.by === 'attribute' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Attribute
              </label>
              <Select
                options={[{value: '', label: 'Select Attribute'}, ...otherAttributes.map(attr => ({value: attr, label: attr}))]} 
                value={visualizationOptions.node_color.attribute || ''}
                onChange={handleNodeColorAttributeChange}
                fullWidth
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-labels"
              checked={visualizationOptions.show_labels}
              onChange={handleShowLabelsChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="show-labels" className="ml-2 block text-sm text-gray-700">
              Show Node Labels
            </label>
          </div>

          {visualizationOptions.show_labels && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label Property
              </label>
              <Select
                options={[
                  {value: 'label', label: 'Node Label'},
                  {value: 'id', label: 'Node ID'},
                  ...otherAttributes.map(attr => ({value: attr, label: attr}))
                ]}
                value={visualizationOptions.label_property || 'label'}
                onChange={handleLabelPropertyChange}
                fullWidth
              />
            </div>
          )}
        </div>
      )}

      {/* Edges Section */}
      {activeSection === 'edges' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Edge Width
            </label>
            <Select
              options={edgeWidthOptions}
              value={visualizationOptions.edge_width.by}
              onChange={handleEdgeWidthChange}
              fullWidth
            />
          </div>

          {visualizationOptions.edge_width.by === 'weight' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Edge Width Range
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={visualizationOptions.edge_width.scale?.[0] || 1}
                  min={0.5}
                  max={5}
                  step={0.5}
                  onChange={(e) => {
                    const min = parseFloat(e.target.value);
                    const max = visualizationOptions.edge_width.scale?.[1] || 5;
                    handleEdgeWidthScaleChange(min, max);
                  }}
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  value={visualizationOptions.edge_width.scale?.[1] || 5}
                  min={1}
                  max={10}
                  step={0.5}
                  onChange={(e) => {
                    const max = parseFloat(e.target.value);
                    const min = visualizationOptions.edge_width.scale?.[0] || 1;
                    handleEdgeWidthScaleChange(min, max);
                  }}
                  className="w-20"
                />
                <span>px</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Section */}
      {activeSection === 'filters' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tie Strength Threshold
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                className="flex-1"
                min="0"
                max="10"
                value={visualizationOptions.filters?.min_tie_strength || 0}
                onChange={handleTieStrengthChange}
              />
              <span className="text-sm">{visualizationOptions.filters?.min_tie_strength || 0}</span>
            </div>
            <Text variant="caption" className="text-gray-500 mt-1">
              Only show connections with tie strength greater than or equal to this value
            </Text>
          </div>

          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Filter
              </label>
              <Select
                value={visualizationOptions.filters?.departments?.[0] || ''}
                onChange={handleDepartmentFilterChange}
                fullWidth
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {roles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Filter
              </label>
              <Select
                value={visualizationOptions.filters?.roles?.[0] || ''}
                onChange={handleRoleFilterChange}
                fullWidth
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkControls;