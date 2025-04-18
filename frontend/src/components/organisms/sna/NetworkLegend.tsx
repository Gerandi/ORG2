import React from 'react';
import { VisualizationOptions } from '../../../types/network';
import Card from '../../atoms/Card';
import { Text } from '../../atoms/Typography';

interface NetworkLegendProps {
  visualizationOptions: VisualizationOptions;
  colorCategories: Map<string, string>;
  title?: string;
}

const NetworkLegend: React.FC<NetworkLegendProps> = ({
  visualizationOptions,
  colorCategories,
  title
}) => {
  // Determine the legend title based on the color-by option
  const getLegendTitle = (): string => {
    if (title) return title;
    
    switch (visualizationOptions.node_color.by) {
      case 'department':
        return 'Department';
      case 'role':
        return 'Role';
      case 'community':
        return 'Community';
      case 'centrality':
        return 'Centrality';
      case 'attribute':
        return visualizationOptions.node_color.attribute || 'Attribute';
      default:
        return 'Legend';
    }
  };

  // If no categories to display, don't render the legend
  if (colorCategories.size === 0) {
    return null;
  }

  return (
    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 text-sm">
      <div className="font-medium mb-2">{getLegendTitle()}</div>
      <div className="space-y-1">
        {Array.from(colorCategories.entries()).map(([category, color]) => (
          <div key={category} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: color }}
            ></div>
            <Text variant="caption">
              {category === 'undefined' || category === 'null' ? 'Not specified' : category}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkLegend;