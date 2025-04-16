import React, { useEffect, useRef } from 'react';
import { Feature } from '../../types/ml';
import * as d3 from 'd3';
import { Text } from '../atoms/Typography';

interface FeatureImportanceChartProps {
  features: Feature[];
  height?: number;
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({
  features,
  height = 300
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Sort features by importance in descending order
  const sortedFeatures = [...features].sort((a, b) => b.importance - a.importance);
  
  // Create color scale for different feature categories
  const categoryColorMap: Record<string, string> = {
    network: '#3b82f6', // blue
    performance: '#10b981', // green
    demographic: '#f59e0b', // amber
    organizational: '#8b5cf6', // purple
    default: '#6b7280' // gray
  };
  
  useEffect(() => {
    if (!chartRef.current || sortedFeatures.length === 0) return;
    
    // Clear any existing chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    // Get container dimensions
    const containerWidth = chartRef.current.clientWidth;
    
    // Set up margins and dimensions
    const margin = { top: 10, right: 30, bottom: 40, left: 180 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(sortedFeatures, d => d.importance) || 0])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(sortedFeatures.map(d => d.name))
      .range([0, chartHeight])
      .padding(0.2);
    
    // Create and add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}`))
      .selectAll('text')
      .style('font-size', '10px');
    
    // Add x-axis label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', chartHeight + margin.bottom - 5)
      .style('font-size', '12px')
      .text('Importance Score');
    
    // Create and add y-axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '10px')
      .text(d => {
        // Format feature names for better display
        const name = d.toString();
        // Convert snake_case to Title Case and limit length
        const formatted = name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return formatted.length > 25 ? formatted.substring(0, 22) + '...' : formatted;
      });
    
    // Add bars
    svg.selectAll('.bar')
      .data(sortedFeatures)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', d => yScale(d.name) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0) // Start at 0 for animation
      .attr('fill', d => categoryColorMap[d.category] || categoryColorMap.default)
      .attr('rx', 2) // Rounded corners
      .attr('opacity', 0.8)
      .transition() // Add transition for animation
      .duration(800)
      .attr('width', d => xScale(d.importance));
    
    // Add labels for values
    svg.selectAll('.value-label')
      .data(sortedFeatures)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('y', d => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('x', d => xScale(d.importance) + 5)
      .text(d => d.importance.toFixed(3))
      .style('font-size', '10px')
      .style('fill', '#4b5563')
      .style('opacity', 0)
      .transition()
      .duration(800)
      .style('opacity', 1);
    
    // Add category indicators
    svg.selectAll('.category-indicator')
      .data(sortedFeatures)
      .enter()
      .append('circle')
      .attr('class', 'category-indicator')
      .attr('cy', d => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('cx', -10)
      .attr('r', 4)
      .attr('fill', d => categoryColorMap[d.category] || categoryColorMap.default);
    
    // Add a grid for better readability
    svg.selectAll('.grid-line')
      .data(xScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .style('stroke', '#e5e7eb')
      .style('stroke-dasharray', '3,3')
      .style('stroke-width', 1);
    
  }, [sortedFeatures, height]);

  // Create a legend for feature categories
  const uniqueCategories = Array.from(new Set(features.map(f => f.category)));
  
  return (
    <div>
      <div ref={chartRef} style={{ width: '100%', height: height }}></div>
      
      {/* Category Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {uniqueCategories.map(category => (
          <div key={category} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1" 
              style={{ backgroundColor: categoryColorMap[category] || categoryColorMap.default }}
            ></div>
            <Text variant="caption" className="text-xs text-gray-600">
              {category.charAt(0).toUpperCase() + category.slice(1)} Features
            </Text>
          </div>
        ))}
      </div>
      
      {/* Warning for empty data */}
      {features.length === 0 && (
        <div className="flex justify-center items-center h-32">
          <Text className="text-gray-500">No feature importance data available</Text>
        </div>
      )}
    </div>
  );
};

export default FeatureImportanceChart;