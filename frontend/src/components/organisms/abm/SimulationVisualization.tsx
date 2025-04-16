import React, { useState, useEffect, useRef } from 'react';
import { ABMModel, Simulation, SimulationResults } from '../../../types/abm';
import Card from '../../atoms/Card';
import { Heading, Text } from '../../atoms/Typography';
import Select from '../../atoms/Select';
import { Sliders, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import * as d3 from 'd3';

// Define agent node and link types for simulation
interface SimulationNode extends d3.SimulationNodeDatum {
  id: number;
  group: string;
  radius: number;
  betweenness: number;
  innovation_adoption: boolean;
  knowledge: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: number | SimulationNode;
  target: number | SimulationNode;
  weight?: number;
}

interface SimulationVisualizationProps {
  model: ABMModel;
  simulation: Simulation | null;
  results: SimulationResults | null;
  isRunning: boolean;
  currentStep: number;
  onToggleControlPanel: () => void;
  showControlPanel: boolean;
}

const SimulationVisualization: React.FC<SimulationVisualizationProps> = ({
  model,
  simulation,
  results,
  isRunning,
  currentStep,
  onToggleControlPanel,
  showControlPanel
}) => {
  const [visualizationMode, setVisualizationMode] = useState('network');
  const [colorBy, setColorBy] = useState('innovation_adoption');
  const [layoutType, setLayoutType] = useState('force');
  const [showLabels, setShowLabels] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  
  const networkRef = useRef<HTMLDivElement>(null);
  const innovationChartRef = useRef<HTMLDivElement>(null);
  const knowledgeChartRef = useRef<HTMLDivElement>(null);
  const diffusionChartRef = useRef<HTMLDivElement>(null);
  
  // Sample data for visualization (would come from simulation results)
  const mockAgentData = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    betweenness: Math.random() * 0.2,
    degree: 5 + Math.floor(Math.random() * 20),
    clustering: Math.random(),
    department: ['sales', 'engineering', 'marketing', 'hr'][Math.floor(Math.random() * 4)],
    innovation_adoption: Math.random() > 0.7,
    knowledge: Math.random(),
    influence: Math.random() * 0.8 + 0.2
  }));
  
  const mockTimeSeriesData = Array.from({ length: 50 }, (_, i) => ({
    step: i,
    innovation_adoption_rate: Math.min(0.8, 0.01 + i * 0.016 + Math.random() * 0.02),
    avg_knowledge: Math.min(0.9, 0.2 + i * 0.014 + Math.random() * 0.01),
    adoption_by_department: {
      sales: Math.min(0.9, 0.05 + i * 0.018),
      engineering: Math.min(0.9, 0.02 + i * 0.02),
      marketing: Math.min(0.9, 0.01 + i * 0.015),
      hr: Math.min(0.9, 0.005 + i * 0.01)
    }
  }));
  
  // Initialize network visualization with enhanced features
  useEffect(() => {
    if (!networkRef.current) return;
    
    // Clear any existing visualization
    d3.select(networkRef.current).selectAll('*').remove();
    
    const width = networkRef.current.clientWidth;
    const height = networkRef.current.clientHeight;
    
    // Create SVG element with zoom capabilities
    const svg = d3.select(networkRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');
    
    // Add a background rect to handle zoom events
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');
    
    // Create a group for the network that will be transformed during zoom
    const g = svg.append('g');
    
    // Define zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });
    
    // Apply zoom behavior to SVG
    svg.call(zoom);
    
    // Generate network data from mockAgentData
    const nodes: SimulationNode[] = mockAgentData.map(agent => ({
      id: agent.id,
      group: agent.department,
      radius: 5 + agent.influence * 10, // Size based on influence
      betweenness: agent.betweenness,
      innovation_adoption: agent.innovation_adoption,
      knowledge: agent.knowledge
    }));
    
    // Generate links with more sophisticated network structure
    const links: SimulationLink[] = [];
    
    // Create links with higher probability within departments and lower between departments
    nodes.forEach(sourceNode => {
      nodes.forEach(targetNode => {
        if (sourceNode.id !== targetNode.id) {
          // Higher probability of connection within same department
          const sameDepartment = sourceNode.group === targetNode.group;
          const connectionProbability = sameDepartment ? 0.3 : 0.05;
          
          if (Math.random() < connectionProbability) {
            // Weight is stronger within departments
            links.push({
              source: sourceNode.id,
              target: targetNode.id,
              weight: sameDepartment ? 2 : 1
            });
          }
        }
      });
    });
    
    // Define color scales with enhanced palette
    const departmentColorScale = d3.scaleOrdinal<string>()
      .domain(['sales', 'engineering', 'marketing', 'hr'])
      .range(['#4299E1', '#48BB78', '#ED8936', '#9F7AEA']);
    
    const innovationColorScale = (d: SimulationNode) => 
      d.innovation_adoption ? '#48BB78' : '#CBD5E0';
    
    const knowledgeColorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, 1]);
    
    // Centrality color scale
    const centralityColorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 0.2]); // Max betweenness in our mock data is around 0.2
    
    // Define which color function to use based on selection
    const getNodeColor = (d: SimulationNode) => {
      switch (colorBy) {
        case 'department':
          return departmentColorScale(d.group);
        case 'innovation_adoption':
          return innovationColorScale(d);
        case 'knowledge':
          return knowledgeColorScale(d.knowledge);
        case 'centrality':
          return centralityColorScale(d.betweenness);
        default:
          return '#CBD5E0';
      }
    };
    
    // Add drop shadow for better visual depth
    const defs = svg.append('defs');
    defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 2)
      .attr('flood-color', 'rgba(0,0,0,0.3)');
    
    // Apply different layouts based on selection
    const applyLayout = () => {
      // Stop any previous simulation
      if (simulation) simulation.stop();
      
      // Reset node positions
      nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
      
      // Apply the selected layout
      switch (layoutType) {
        case 'force':
          // Standard force-directed layout with improved parameters
          simulation
            .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
              .id(d => d.id)
              .distance(80)
              .strength(link => {
                const weight = typeof link.weight === 'number' ? link.weight : 1;
                return 0.7 * Math.min(1, weight / 10);
              }))
            .force('charge', d3.forceManyBody()
              .strength(d => -100 * (d.radius / 5))
              .distanceMax(300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide(d => d.radius + 3))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
            .alpha(1)
            .restart();
          break;
          
        case 'circular':
          // Position nodes in a circle based on department
          simulation.force('link').strength(0.3);
          simulation.force('charge').strength(-20);
          simulation.force('center', null);
          simulation.force('x', null);
          simulation.force('y', null);
          
          // Group nodes by department
          const departments = Array.from(new Set(nodes.map(d => d.group)));
          const nodesByDept = departments.map(dept => 
            nodes.filter(node => node.group === dept)
          );
          
          // Position each department in its own circle section
          nodesByDept.forEach((deptNodes, deptIndex) => {
            const deptCount = departments.length;
            const deptAngle = (2 * Math.PI / deptCount);
            const deptCenterX = width/2 + Math.cos(deptIndex * deptAngle) * (width/4);
            const deptCenterY = height/2 + Math.sin(deptIndex * deptAngle) * (height/4);
            
            // Position nodes in a circle within their department
            const nodeCount = deptNodes.length;
            const radius = Math.min(width, height) * 0.15;
            const angleStep = (2 * Math.PI) / nodeCount;
            
            deptNodes.forEach((node, i) => {
              const angle = i * angleStep;
              node.fx = deptCenterX + radius * Math.cos(angle);
              node.fy = deptCenterY + radius * Math.sin(angle);
            });
          });
          
          simulation.alpha(0.3).restart();
          break;
          
        case 'grid':
          // Position nodes in a grid pattern
          const gridSize = Math.ceil(Math.sqrt(nodes.length));
          const cellWidth = width / (gridSize + 1);
          const cellHeight = height / (gridSize + 1);
          
          // Group by department for color blocking
          const deptGroups = Array.from(new Set(nodes.map(d => d.group)));
          const deptNodeMap = new Map<string, SimulationNode[]>();
          
          deptGroups.forEach(dept => {
            deptNodeMap.set(dept, nodes.filter(n => n.group === dept));
          });
          
          // Position nodes in grid by department groups
          let currentRow = 1;
          let currentCol = 1;
          
          deptGroups.forEach(dept => {
            const deptNodes = deptNodeMap.get(dept) || [];
            const deptGridSize = Math.ceil(Math.sqrt(deptNodes.length));
            
            deptNodes.forEach((node, i) => {
              const row = Math.floor(i / deptGridSize);
              const col = i % deptGridSize;
              
              node.fx = (currentCol + col) * cellWidth;
              node.fy = (currentRow + row) * cellHeight;
            });
            
            // Move to next position in grid
            if (currentCol + deptGridSize > gridSize) {
              currentRow += deptGridSize;
              currentCol = 1;
            } else {
              currentCol += deptGridSize;
            }
          });
          
          simulation.alpha(0.3).restart();
          break;
      }
    };
    
    // Create a force simulation with enhanced physics
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.5))
      .force('charge', d3.forceManyBody()
        .strength(-120)
        .distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => d.radius + 3));
    
    // Apply the initial layout
    applyLayout();
    
    // Create a container for links with improved styling
    const linkGroup = g.append('g')
      .attr('class', 'links');
    
    const link = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => {
        return (typeof d.weight === 'number' ? d.weight : 1) * 0.5;
      })
      .attr('stroke-linecap', 'round');
    
    // Create a container for nodes with improved styling
    const nodeGroup = g.append('g')
      .attr('class', 'nodes');
    
    // Draw the node circles with enhanced appearance
    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', d => d.id);
    
    // Add node circles
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', getNodeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('filter', 'url(#drop-shadow)')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        // Highlight the node on hover
        d3.select(event.currentTarget)
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
          .transition()
          .duration(200)
          .attr('r', d.radius * 1.2);
        
        // Highlight connected nodes and links
        const nodeId = d.id;
        link.style('stroke', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return (sourceId === nodeId || targetId === nodeId) ? '#666' : '#ddd';
        })
        .style('stroke-opacity', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return (sourceId === nodeId || targetId === nodeId) ? 1 : 0.3;
        })
        .style('stroke-width', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const weight = typeof l.weight === 'number' ? l.weight : 1;
          return (sourceId === nodeId || targetId === nodeId) ? weight * 1.5 : weight * 0.5;
        });
        
        // Highlight connected nodes
        node.select('circle').style('opacity', n => {
          const connected = links.some(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return (sourceId === nodeId && targetId === n.id) || 
                  (targetId === nodeId && sourceId === n.id) ||
                  n.id === nodeId;
          });
          return connected ? 1 : 0.4;
        });
        
        setHoveredNode(d);
        
        // Show tooltip
        tooltip.style('display', null);
        
        const metrics = [];
        if (d.betweenness) metrics.push(`Centrality: ${d.betweenness.toFixed(3)}`);
        metrics.push(`Knowledge: ${d.knowledge.toFixed(2)}`);
        
        const textContent = [
          `Agent ${d.id}`,
          `Department: ${d.group}`,
          `Innovation: ${d.innovation_adoption ? 'Adopted' : 'Not Adopted'}`,
          ...metrics
        ];
        
        tooltipText.selectAll('tspan').remove();
        textContent.forEach((line, i) => {
          tooltipText.append('tspan')
            .attr('x', 10)
            .attr('dy', i === 0 ? 0 : 16)
            .text(line)
            .attr('font-weight', i === 0 ? 'bold' : 'normal');
        });
        
        // Adjust tooltip size based on content
        tooltip.select('rect')
          .attr('width', 170)
          .attr('height', textContent.length * 16 + 10);
        
        // Position tooltip
        const tooltipWidth = 170;
        const tooltipHeight = textContent.length * 16 + 10;
        let tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left + 10;
        let tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top - tooltipHeight - 10;
        
        // Ensure tooltip stays within SVG bounds
        if (tooltipX + tooltipWidth > width) {
          tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left - tooltipWidth - 10;
        }
        
        if (tooltipY < 0) {
          tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top + 20;
        }
        
        tooltip.attr('transform', `translate(${tooltipX},${tooltipY})`);
      })
      .on('mouseout', (event) => {
        // Reset styles on mouseout
        d3.select(event.currentTarget)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .transition()
          .duration(200)
          .attr('r', d => d.radius);
        
        // Reset link styles
        link.style('stroke', '#999')
          .style('stroke-opacity', 0.6)
          .style('stroke-width', d => {
            return (typeof d.weight === 'number' ? d.weight : 1) * 0.5;
          });
        
        // Reset node opacities
        node.select('circle').style('opacity', 1);
        
        // Hide tooltip
        tooltip.style('display', 'none');
        
        setHoveredNode(null);
      })
      .call(d3.drag<SVGCircleElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Only release nodes if we're using force layout
          if (layoutType === 'force') {
            d.fx = null;
            d.fy = null;
          }
        }) as any);
    
    // Add labels if enabled
    if (showLabels) {
      // Add a text background for better readability
      node.append('rect')
        .attr('class', 'label-background')
        .attr('x', d => d.radius + 4)
        .attr('y', -10)
        .attr('width', 30) // Will be updated after text measurement
        .attr('height', 20)
        .attr('fill', 'white')
        .attr('fill-opacity', 0.7)
        .attr('rx', 3)
        .attr('ry', 3);
      
      // Add text labels with better styling
      const labels = node.append('text')
        .attr('class', 'node-label')
        .attr('dx', d => d.radius + 8)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('pointer-events', 'none')
        .text(d => `A${d.id}`)
        .attr('font-size', '11px')
        .attr('fill', '#333')
        .attr('font-weight', '500');
      
      // Set the background rectangle width based on text length
      node.each(function() {
        const text = d3.select(this).select('text');
        const rect = d3.select(this).select('rect');
        const textLength = (text.node() as SVGTextElement)?.getComputedTextLength() || 0;
        rect.attr('width', textLength + 8);
      });
    }
    
    // Add enhanced tooltip with rich information
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('pointer-events', 'none')
      .style('display', 'none');
    
    tooltip.append('rect')
      .attr('fill', 'white')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', 150)
      .attr('height', 80)
      .style('filter', 'url(#drop-shadow)');
    
    const tooltipText = tooltip.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('font-size', '12px')
      .attr('fill', '#333');
    
    // Add legend for node colors
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 20)`);
    
    // Background for legend
    legend.append('rect')
      .attr('x', -10)
      .attr('y', -10)
      .attr('width', 120)
      .attr('height', 100)
      .attr('fill', 'white')
      .attr('fill-opacity', 0.8)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1);
    
    // Legend title
    legend.append('text')
      .attr('x', 0)
      .attr('y', 5)
      .text(() => {
        switch (colorBy) {
          case 'department': return 'Department';
          case 'innovation_adoption': return 'Innovation';
          case 'knowledge': return 'Knowledge';
          case 'centrality': return 'Centrality';
          default: return 'Legend';
        }
      })
      .attr('font-size', '11px')
      .attr('font-weight', 'bold');
    
    // Legend items
    if (colorBy === 'department') {
      const departments = ['sales', 'engineering', 'marketing', 'hr'];
      departments.forEach((dept, i) => {
        legend.append('circle')
          .attr('cx', 8)
          .attr('cy', i * 18 + 25)
          .attr('r', 6)
          .attr('fill', departmentColorScale(dept));
          
        legend.append('text')
          .attr('x', 20)
          .attr('y', i * 18 + 28)
          .text(dept)
          .attr('font-size', '10px')
          .attr('fill', '#333');
      });
    } else if (colorBy === 'innovation_adoption') {
      ['Adopted', 'Not Adopted'].forEach((status, i) => {
        legend.append('circle')
          .attr('cx', 8)
          .attr('cy', i * 18 + 25)
          .attr('r', 6)
          .attr('fill', i === 0 ? '#48BB78' : '#CBD5E0');
          
        legend.append('text')
          .attr('x', 20)
          .attr('y', i * 18 + 28)
          .text(status)
          .attr('font-size', '10px')
          .attr('fill', '#333');
      });
    } else if (colorBy === 'knowledge' || colorBy === 'centrality') {
      // Gradient legend for continuous values
      const scale = colorBy === 'knowledge' ? knowledgeColorScale : centralityColorScale;
      const gradientId = colorBy === 'knowledge' ? 'knowledge-gradient' : 'centrality-gradient';
      
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      
      [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(stop => {
        gradient.append('stop')
          .attr('offset', `${stop * 100}%`)
          .attr('stop-color', scale(stop));
      });
      
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 25)
        .attr('width', 15)
        .attr('height', 60)
        .attr('fill', `url(#${gradientId})`);
      
      // Add labels for gradient stops
      legend.append('text')
        .attr('x', 20)
        .attr('y', 28)
        .text('High')
        .attr('font-size', '10px')
        .attr('fill', '#333');
      
      legend.append('text')
        .attr('x', 20)
        .attr('y', 85)
        .text('Low')
        .attr('font-size', '10px')
        .attr('fill', '#333');
    }
    
    // Update positions on simulation tick with improved boundary handling
    simulation.on('tick', () => {
      // Keep nodes within bounds
      nodes.forEach(node => {
        if (!node.fx && !node.fy) { // Only constrain if not fixed
          node.x = Math.max(node.radius, Math.min(width - node.radius, node.x || 0));
          node.y = Math.max(node.radius, Math.min(height - node.radius, node.y || 0));
        }
      });
      
      link
        .attr('x1', d => (typeof d.source === 'object' ? d.source.x || 0 : 0))
        .attr('y1', d => (typeof d.source === 'object' ? d.source.y || 0 : 0))
        .attr('x2', d => (typeof d.target === 'object' ? d.target.x || 0 : 0))
        .attr('y2', d => (typeof d.target === 'object' ? d.target.y || 0 : 0));
      
      node
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });
    
    // Update visualization when layout changes
    svg.property('layoutFunction', applyLayout);
    
    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [networkRef, colorBy, layoutType, showLabels, mockAgentData]);
  
  // Initialize innovation adoption chart with enhanced visualization
  useEffect(() => {
    if (!innovationChartRef.current) return;
    
    // Clear any existing chart
    d3.select(innovationChartRef.current).selectAll('*').remove();
    
    const margin = { top: 10, right: 20, bottom: 30, left: 30 };
    const width = innovationChartRef.current.clientWidth - margin.left - margin.right;
    const height = innovationChartRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create SVG with better styling
    const svg = d3.select(innovationChartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add subtle grid
    const grid = svg.append('g')
      .attr('class', 'grid')
      .style('opacity', 0.1);
    
    // Horizontal grid lines
    svg.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(d3.range(0, 1.1, 0.2))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#000')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-opacity', 0.3);
    
    // Set up scales with nice rounding
    const x = d3.scaleLinear()
      .domain([0, d3.max(mockTimeSeriesData, d => d.step) || 0])
      .nice()
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
    // Draw x-axis with better styling
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}`))
      .selectAll('text')
      .attr('font-size', '9px');
    
    // Draw y-axis with better styling
    svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .selectAll('text')
      .attr('font-size', '9px');
    
    // Add axis labels
    svg.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + 25)
      .attr('font-size', '9px')
      .text('Simulation Step');
    
    // Create gradient for area under the line
    const areaGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'innovation-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#48BB78')
      .attr('stop-opacity', 0.7);
    
    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#48BB78')
      .attr('stop-opacity', 0.1);
    
    // Define the area
    const area = d3.area<any>()
      .x(d => x(d.step))
      .y0(height)
      .y1(d => y(d.innovation_adoption_rate))
      .curve(d3.curveMonotoneX);
    
    // Draw the area fill
    svg.append('path')
      .datum(mockTimeSeriesData)
      .attr('class', 'area')
      .attr('fill', 'url(#innovation-area-gradient)')
      .attr('d', area);
    
    // Define the line with smoother curve
    const line = d3.line<any>()
      .x(d => x(d.step))
      .y(d => y(d.innovation_adoption_rate))
      .curve(d3.curveMonotoneX);
    
    // Draw the line path with better styling
    svg.append('path')
      .datum(mockTimeSeriesData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', '#48BB78')
      .attr('stroke-width', 2.5)
      .attr('d', line);
    
    // Add a point and vertical line for the current step
    const currentStepData = mockTimeSeriesData.find(d => d.step === currentStep);
    if (currentStepData) {
      // Add vertical line at current step
      svg.append('line')
        .attr('class', 'current-step-line')
        .attr('x1', x(currentStep))
        .attr('x2', x(currentStep))
        .attr('y1', height)
        .attr('y2', y(currentStepData.innovation_adoption_rate))
        .attr('stroke', '#718096')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1);
      
      // Add point at current value
      svg.append('circle')
        .attr('class', 'current-step-point')
        .attr('cx', x(currentStep))
        .attr('cy', y(currentStepData.innovation_adoption_rate))
        .attr('r', 4)
        .attr('fill', '#48BB78')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      
      // Add label for current value
      svg.append('text')
        .attr('class', 'current-step-label')
        .attr('x', x(currentStep) + 5)
        .attr('y', y(currentStepData.innovation_adoption_rate) - 8)
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .text(`${(currentStepData.innovation_adoption_rate * 100).toFixed(1)}%`);
    }
  }, [innovationChartRef, mockTimeSeriesData, currentStep]);
  
  // Initialize knowledge distribution chart with enhanced visualization
  useEffect(() => {
    if (!knowledgeChartRef.current) return;
    
    // Clear any existing chart
    d3.select(knowledgeChartRef.current).selectAll('*').remove();
    
    const margin = { top: 10, right: 20, bottom: 30, left: 30 };
    const width = knowledgeChartRef.current.clientWidth - margin.left - margin.right;
    const height = knowledgeChartRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create SVG with better styling
    const svg = d3.select(knowledgeChartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add subtle grid
    svg.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(d3.range(0, 1.1, 0.2))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#000')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-opacity', 0.3);
    
    // Set up scales with nice rounding
    const x = d3.scaleLinear()
      .domain([0, d3.max(mockTimeSeriesData, d => d.step) || 0])
      .nice()
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
    // Draw axes with better styling
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}`))
      .selectAll('text')
      .attr('font-size', '9px');
    
    svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('font-size', '9px');
    
    // Add axis labels
    svg.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + 25)
      .attr('font-size', '9px')
      .text('Simulation Step');
    
    // Create gradient for area under the line
    const areaGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'knowledge-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4299E1')
      .attr('stop-opacity', 0.7);
    
    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4299E1')
      .attr('stop-opacity', 0.1);
    
    // Define the area
    const area = d3.area<any>()
      .x(d => x(d.step))
      .y0(height)
      .y1(d => y(d.avg_knowledge))
      .curve(d3.curveMonotoneX);
    
    // Draw the area fill
    svg.append('path')
      .datum(mockTimeSeriesData)
      .attr('class', 'area')
      .attr('fill', 'url(#knowledge-area-gradient)')
      .attr('d', area);
    
    // Define the line with smoother curve
    const line = d3.line<any>()
      .x(d => x(d.step))
      .y(d => y(d.avg_knowledge))
      .curve(d3.curveMonotoneX);
    
    // Draw the line path with better styling
    svg.append('path')
      .datum(mockTimeSeriesData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', '#4299E1')
      .attr('stroke-width', 2.5)
      .attr('d', line);
    
    // Add a point and vertical line for the current step
    const currentStepData = mockTimeSeriesData.find(d => d.step === currentStep);
    if (currentStepData) {
      // Add vertical line at current step
      svg.append('line')
        .attr('class', 'current-step-line')
        .attr('x1', x(currentStep))
        .attr('x2', x(currentStep))
        .attr('y1', height)
        .attr('y2', y(currentStepData.avg_knowledge))
        .attr('stroke', '#718096')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1);
      
      // Add point at current value
      svg.append('circle')
        .attr('class', 'current-step-point')
        .attr('cx', x(currentStep))
        .attr('cy', y(currentStepData.avg_knowledge))
        .attr('r', 4)
        .attr('fill', '#4299E1')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      
      // Add label for current value
      svg.append('text')
        .attr('class', 'current-step-label')
        .attr('x', x(currentStep) + 5)
        .attr('y', y(currentStepData.avg_knowledge) - 8)
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .text(`${currentStepData.avg_knowledge.toFixed(2)}`);
    }
  }, [knowledgeChartRef, mockTimeSeriesData, currentStep]);
  
  // Add a new department adoption rate chart for diffusionChartRef
  useEffect(() => {
    if (!diffusionChartRef.current) return;
    
    // Clear any existing chart
    d3.select(diffusionChartRef.current).selectAll('*').remove();
    
    const margin = { top: 10, right: 20, bottom: 40, left: 30 };
    const width = diffusionChartRef.current.clientWidth - margin.left - margin.right;
    const height = diffusionChartRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create SVG with better styling
    const svg = d3.select(diffusionChartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(mockTimeSeriesData, d => d.step) || 0])
      .nice()
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
    const color = d3.scaleOrdinal<string>()
      .domain(['sales', 'engineering', 'marketing', 'hr'])
      .range(['#4299E1', '#48BB78', '#ED8936', '#9F7AEA']);
    
    // Create grid lines
    svg.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(d3.range(0, 1.1, 0.2))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#000')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-opacity', 0.2);
    
    // Draw axes
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .selectAll('text')
      .attr('font-size', '9px');
    
    svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .selectAll('text')
      .attr('font-size', '9px');
    
    // Add axis labels
    svg.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + 25)
      .attr('font-size', '9px')
      .text('Simulation Step');
    
    svg.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -20)
      .attr('font-size', '9px')
      .text('Adoption Rate');
    
    // Create data for department lines
    const departments = ['sales', 'engineering', 'marketing', 'hr'];
    const departmentData = departments.map(dept => {
      return {
        department: dept,
        values: mockTimeSeriesData.map(d => ({
          step: d.step,
          value: d.adoption_by_department[dept]
        }))
      };
    });
    
    // Define the line function
    const line = d3.line<any>()
      .x(d => x(d.step))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);
    
    // Draw lines for each department
    departmentData.forEach(department => {
      svg.append('path')
        .datum(department.values)
        .attr('class', `line-${department.department}`)
        .attr('fill', 'none')
        .attr('stroke', color(department.department))
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add point for current value
      const currentPoint = department.values.find(d => d.step === currentStep);
      if (currentPoint) {
        svg.append('circle')
          .attr('class', `point-${department.department}`)
          .attr('cx', x(currentPoint.step))
          .attr('cy', y(currentPoint.value))
          .attr('r', 3)
          .attr('fill', color(department.department))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
    });
    
    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 100}, 10)`);
    
    departments.forEach((dept, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(0, ${i * 15})`);
      
      g.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', color(dept))
        .attr('stroke-width', 2);
      
      g.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .text(dept);
    });
    
    // Add vertical line for current step
    svg.append('line')
      .attr('class', 'current-step-line')
      .attr('x1', x(currentStep))
      .attr('x2', x(currentStep))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#718096')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1);
    
  }, [diffusionChartRef, mockTimeSeriesData, currentStep]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white p-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            className="p-1 rounded hover:bg-gray-100"
            onClick={onToggleControlPanel}
            title="Toggle Control Panel"
          >
            <Sliders size={18} />
          </button>
          <button className="p-1 rounded hover:bg-gray-100" title="Reset Layout">
            <RotateCcw size={18} />
          </button>
          <div className="flex items-center space-x-1 ml-2">
            <button 
              className="p-1 rounded hover:bg-gray-100"
              onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.2))}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-gray-500">{Math.round(zoomLevel * 100)}%</span>
            <button 
              className="p-1 rounded hover:bg-gray-100"
              onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.2))}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex space-x-4 flex-wrap">
          <div className="flex items-center">
            <Text variant="caption" className="text-gray-500 mr-2">View:</Text>
            <Select
              value={visualizationMode}
              onChange={(e) => setVisualizationMode(e.target.value)}
              className="p-1 text-sm"
            >
              <option value="network">Network</option>
              <option value="3d">3D Space</option>
              <option value="grid">Grid</option>
              <option value="charts">Charts</option>
            </Select>
          </div>
          
          <div className="flex items-center">
            <Text variant="caption" className="text-gray-500 mr-2">Layout:</Text>
            <Select
              value={layoutType}
              onChange={(e) => setLayoutType(e.target.value)}
              className="p-1 text-sm"
            >
              <option value="force">Force-directed</option>
              <option value="circular">Circular</option>
              <option value="grid">Grid</option>
            </Select>
          </div>
          
          <div className="flex items-center">
            <Text variant="caption" className="text-gray-500 mr-2">Color By:</Text>
            <Select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value)}
              className="p-1 text-sm"
            >
              <option value="innovation_adoption">Innovation</option>
              <option value="department">Department</option>
              <option value="knowledge">Knowledge</option>
              <option value="centrality">Centrality</option>
            </Select>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={() => setShowLabels(!showLabels)}
                className="form-checkbox h-3 w-3 text-blue-500"
              />
              <Text variant="caption" className="text-gray-500 ml-1">Show Labels</Text>
            </label>
          </div>
        </div>
      </div>
      
      {/* Simulation Visualization */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ backgroundColor: '#F9FAFB' }}>
        {/* Main Visualization */}
        <Card className="col-span-3 md:col-span-2 row-span-2 flex items-center justify-center relative min-h-[400px]">
          <div ref={networkRef} className="w-full h-full"></div>
          <div className="absolute top-2 left-2 bg-white p-1 rounded-md border border-gray-200 text-xs font-medium">
            {visualizationMode === 'network' ? 'Agent Network' : 
             visualizationMode === '3d' ? '3D Environment' : 
             visualizationMode === 'grid' ? 'Grid Environment' : 'Visualization'}
          </div>
          
          {hoveredNode && (
            <div className="absolute bottom-2 left-2 bg-white p-2 rounded-md border border-gray-200 text-xs max-w-xs">
              <div className="font-medium">Agent {hoveredNode.id}</div>
              <div className="mt-1 text-gray-500">
                Department: {hoveredNode.group}<br />
                Status: {hoveredNode.innovation_adoption ? 'Adopted' : 'Not Adopted'}<br />
                Knowledge: {hoveredNode.knowledge.toFixed(2)}
              </div>
            </div>
          )}
        </Card>
        
        {/* Time Series Charts */}
        <div className="col-span-3 md:col-span-1 grid grid-cols-1 gap-4">
          {/* Innovation Adoption */}
          <Card className="p-3">
            <Text variant="p" className="font-medium mb-1 text-sm">Innovation Adoption</Text>
            <div ref={innovationChartRef} className="h-32"></div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <div>Adopters: {(mockTimeSeriesData[currentStep]?.innovation_adoption_rate * 100 || 0).toFixed(1)}%</div>
              <div>Growth Rate: +1.2%/step</div>
            </div>
          </Card>
          
          {/* Knowledge Distribution */}
          <Card className="p-3">
            <Text variant="p" className="font-medium mb-1 text-sm">Knowledge Distribution</Text>
            <div ref={knowledgeChartRef} className="h-32"></div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <div>Avg. Knowledge: {(mockTimeSeriesData[currentStep]?.avg_knowledge || 0).toFixed(2)}</div>
              <div>Gini Coefficient: 0.45</div>
            </div>
          </Card>
          
          {/* Diffusion by Department */}
          <Card className="p-3">
            <Text variant="p" className="font-medium mb-1 text-sm">Diffusion by Department</Text>
            <div ref={diffusionChartRef} className="h-48"></div>
          </Card>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="border-t border-gray-200 bg-white p-2 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          Running {model.name} | Seed: 42 | Step: {currentStep}/{mockTimeSeriesData.length - 1}
        </div>
        <div className="flex space-x-4">
          <div>Elapsed Time: 00:{currentStep < 10 ? '0' : ''}{Math.floor(currentStep / 10)}:{(currentStep % 10) * 6}</div>
          <div>Speed: 5x</div>
        </div>
      </div>
    </div>
  );
};

export default SimulationVisualization;