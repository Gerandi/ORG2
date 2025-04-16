import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Node, Edge, VisualizationOptions } from '../../types/network';

// Define a simulation node type that extends the basic Node type with position data
interface SimulationNode extends Node, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
  color?: string;
}

// Define a simulation link type for D3 force simulation
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  weight?: number;
  attributes?: Record<string, any>;
  width?: number;
}

interface NetworkGraphProps {
  nodes: Node[];
  edges: Edge[];
  directed: boolean;
  weighted: boolean;
  visualizationOptions: VisualizationOptions;
  width?: number;
  height?: number;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  directed,
  weighted,
  visualizationOptions,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // State for zoom
  const [currentTransform, setCurrentTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    // Update dimensions if container size changes
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  // Main visualization effect
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup SVG and define zoom behavior
    const svg = d3.select(svgRef.current);
    
    // Create a container for the graph that will be transformed during zoom
    const g = svg.append('g')
      .attr('class', 'network-container');

    // Apply initial zoom transform
    g.attr('transform', currentTransform.toString());

    // Create a background rect for pan events
    g.append('rect')
      .attr('class', 'background')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'transparent');

    // Define zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
        setCurrentTransform(event.transform);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom)
      .on('dblclick.zoom', null); // Disable double-click zoom
    
    // Add initial pan/zoom animation for better UX
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity
        .translate(dimensions.width / 2, dimensions.height / 2)
        .scale(0.9)
        .translate(-dimensions.width / 2, -dimensions.height / 2));

    // Add arrow marker for directed edges
    if (directed) {
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');
    }

    // Process data for D3 force layout
    const nodeMap = new Map<string, SimulationNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node });
    });

    // Process the edges to use the actual node objects
    const links: SimulationLink[] = edges.map(edge => ({
      source: nodeMap.get(edge.source) || edge.source,
      target: nodeMap.get(edge.target) || edge.target,
      weight: edge.weight,
      attributes: edge.attributes
    }));

    // Setup node radius based on visualization options
    const nodeSizeScale = d3.scaleLinear()
      .domain([0, d3.max(nodes, d => {
        if (visualizationOptions.node_size.by === 'uniform') return 1;
        
        // For centrality-based sizing
        if (visualizationOptions.node_size.by === 'degree' && d.attributes.degree) {
          return d.attributes.degree;
        }
        
        if (visualizationOptions.node_size.by === 'betweenness' && d.attributes.betweenness) {
          return d.attributes.betweenness;
        }
        
        if (visualizationOptions.node_size.by === 'closeness' && d.attributes.closeness) {
          return d.attributes.closeness;
        }
        
        if (visualizationOptions.node_size.by === 'eigenvector' && d.attributes.eigenvector) {
          return d.attributes.eigenvector;
        }
        
        // For attribute-based sizing, look up the attribute value
        if (visualizationOptions.node_size.by === 'attribute' && visualizationOptions.node_size.attribute) {
          return d.attributes[visualizationOptions.node_size.attribute] || 0;
        }
        
        // Default to uniform size
        return 1;
      }) || 1])
      .range(visualizationOptions.node_size.scale || [5, 20]);
    
    // Setup node colors based on visualization options
    const uniqueColorCategories = new Set<string>();
    nodes.forEach(node => {
      if (visualizationOptions.node_color.by === 'community') {
        // Community would typically be added by the community detection algorithm
        uniqueColorCategories.add(node.attributes['community'] || 'unknown');
      } else if (visualizationOptions.node_color.by === 'attribute' && visualizationOptions.node_color.attribute) {
        uniqueColorCategories.add(node.attributes[visualizationOptions.node_color.attribute] || 'unknown');
      } else if (visualizationOptions.node_color.by === 'centrality') {
        // We'll use a sequential color scale for centrality, so this is just a placeholder
        uniqueColorCategories.add('centrality');
      } else {
        // Default to using department
        uniqueColorCategories.add(node.attributes['department'] || 'unknown');
      }
    });
    
    // Choose appropriate color scale based on the type of data
    let colorScale: any;
    
    if (visualizationOptions.node_color.by === 'centrality') {
      // Sequential color scale for continuous data
      colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 1]);
    } else {
      // Categorical color scale for discrete categories
      colorScale = d3.scaleOrdinal()
        .domain(Array.from(uniqueColorCategories))
        .range(visualizationOptions.node_color.scale || d3.schemeCategory10);
    }

    // Setup edge width based on visualization options
    const edgeWidthScale = d3.scaleLinear()
      .domain([0, d3.max(edges, d => d.weight || 1) || 1])
      .range(visualizationOptions.edge_width.scale || [1, 3]);

    // Calculate node radii and colors
    nodes.forEach(node => {
      const simNode = nodeMap.get(node.id);
      if (simNode) {
        // Determine node size
        let sizeValue = 1; // Default uniform size
        
        if (visualizationOptions.node_size.by === 'degree' && node.attributes.degree) {
          sizeValue = node.attributes.degree;
        } else if (visualizationOptions.node_size.by === 'betweenness' && node.attributes.betweenness) {
          sizeValue = node.attributes.betweenness;
        } else if (visualizationOptions.node_size.by === 'closeness' && node.attributes.closeness) {
          sizeValue = node.attributes.closeness;
        } else if (visualizationOptions.node_size.by === 'eigenvector' && node.attributes.eigenvector) {
          sizeValue = node.attributes.eigenvector;
        } else if (visualizationOptions.node_size.by === 'attribute' && visualizationOptions.node_size.attribute) {
          sizeValue = node.attributes[visualizationOptions.node_size.attribute] || 1;
        }
        
        simNode.radius = nodeSizeScale(sizeValue);
        
        // Determine node color
        if (visualizationOptions.node_color.by === 'centrality') {
          // Use centrality value for color (normalized to 0-1)
          const centralityValue = node.attributes.betweenness || 
                                 (node.attributes.degree ? node.attributes.degree / 100 : 0);
          simNode.color = colorScale(centralityValue);
        } else {
          let colorCategory = 'unknown';
          if (visualizationOptions.node_color.by === 'community') {
            colorCategory = node.attributes['community'] || 'unknown';
          } else if (visualizationOptions.node_color.by === 'attribute' && visualizationOptions.node_color.attribute) {
            colorCategory = node.attributes[visualizationOptions.node_color.attribute] || 'unknown';
          } else {
            colorCategory = node.attributes['department'] || 'unknown';
          }
          simNode.color = colorScale(colorCategory) as string;
        }
      }
    });

    // Create force simulation with improved physics
    const simulation = d3.forceSimulation<SimulationNode, SimulationLink>(Array.from(nodeMap.values()))
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(80) // Increased for better spacing
        .strength(link => {
          // Stronger links for higher weights
          const weight = typeof link.weight === 'number' ? link.weight : 1;
          return 0.7 * Math.min(1, weight / 10);
        }))
      .force('charge', d3.forceManyBody()
        .strength(d => -100 * (d.radius || 5) / 5) // Scale charge with node size
        .distanceMax(300)) // Limit long-range repulsion
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collide', d3.forceCollide<SimulationNode>(d => (d.radius || 5) + 3)) // Add some padding
      .force('x', d3.forceX(dimensions.width / 2).strength(0.05)) // Gentle force toward center
      .force('y', d3.forceY(dimensions.height / 2).strength(0.05));

    // Apply layout based on visualization options
    if (visualizationOptions.layout.type === 'circular') {
      // Remove default forces and arrange in a circle
      simulation.force('link').strength(0.3);
      simulation.force('charge').strength(-20);
      simulation.force('center', null);
      simulation.force('x', null);
      simulation.force('y', null);
      
      // Position nodes in a circle - more precise positioning
      const nodeCount = nodes.length;
      const radius = Math.min(dimensions.width, dimensions.height) * 0.4;
      const angleStep = (2 * Math.PI) / nodeCount;
      
      nodes.forEach((node, i) => {
        const angle = i * angleStep;
        const simNode = nodeMap.get(node.id);
        if (simNode) {
          simNode.fx = dimensions.width / 2 + radius * Math.cos(angle);
          simNode.fy = dimensions.height / 2 + radius * Math.sin(angle);
        }
      });
    } else if (visualizationOptions.layout.type === 'hierarchical') {
      // Implementation of hierarchical layout using stratify for proper tree structure
      simulation.force('link').strength(0.5);
      
      // Find a reasonable hierarchical arrangement
      // First, identify potential roots (nodes with minimal incoming edges)
      const inDegree = new Map<string, number>();
      links.forEach(link => {
        const target = typeof link.target === 'string' ? link.target : link.target.id;
        inDegree.set(target, (inDegree.get(target) || 0) + 1);
      });
      
      // Identify "root" nodes (with lowest in-degree)
      const rootCandidates = Array.from(nodeMap.values())
        .filter(node => !inDegree.has(node.id) || (inDegree.get(node.id) || 0) < 2)
        .sort((a, b) => (inDegree.get(a.id) || 0) - (inDegree.get(b.id) || 0));
      
      if (rootCandidates.length > 0) {
        // Use BFS to assign levels
        const levels = new Map<string, number>();
        const queue: {node: SimulationNode, level: number}[] = 
          rootCandidates.slice(0, 3).map(node => ({node, level: 0}));
        
        while (queue.length > 0) {
          const {node, level} = queue.shift()!;
          
          if (!levels.has(node.id)) {
            levels.set(node.id, level);
            
            // Find children
            links.forEach(link => {
              const source = typeof link.source === 'string' ? link.source : link.source.id;
              const target = typeof link.target === 'string' ? link.target : link.target.id;
              
              if (source === node.id) {
                const targetNode = nodeMap.get(target);
                if (targetNode) {
                  queue.push({node: targetNode, level: level + 1});
                }
              }
            });
          }
        }
        
        // Calculate max level for scaling
        const maxLevel = Math.max(...Array.from(levels.values()), 0);
        const levelHeight = dimensions.height / (maxLevel + 1);
        
        // Apply forces based on levels
        simulation.force('y', d3.forceY<SimulationNode>(d => {
          return (levels.get(d.id) || 0) * levelHeight + levelHeight / 2;
        }).strength(0.8));
      }
      
      // Spread nodes horizontally
      simulation.force('x', d3.forceX<SimulationNode>((d, i) => {
        return dimensions.width * (0.2 + 0.6 * Math.random());
      }).strength(0.2));
    } else if (visualizationOptions.layout.type === 'radial') {
      // Enhanced radial layout with multiple orbits
      const centralityValues = Array.from(nodeMap.values()).map(d => {
        return d.attributes.betweenness || d.attributes.degree || 0;
      });
      
      // Sort centrality to determine node orbits
      const sortedCentrality = [...centralityValues].sort((a, b) => b - a);
      const orbits = 3; // Number of concentric circles
      const threshold1 = sortedCentrality[Math.floor(nodes.length / orbits)]; 
      const threshold2 = sortedCentrality[Math.floor(2 * nodes.length / orbits)];
      
      // Remove default positioning forces
      simulation.force('center', null);
      simulation.force('x', null);
      simulation.force('y', null);
      
      // Add radial forces with different orbits based on centrality
      simulation.force('radial', d3.forceRadial<SimulationNode>(d => {
        const centrality = d.attributes.betweenness || d.attributes.degree || 0;
        
        if (centrality >= threshold1) {
          return 100; // Inner orbit for high centrality nodes
        } else if (centrality >= threshold2) {
          return 200; // Middle orbit
        } else {
          return 300; // Outer orbit for low centrality nodes
        }
      }, dimensions.width / 2, dimensions.height / 2).strength(0.8));
    }

    // Add a subtle background grid for better spatial reference
    const gridSize = 50;
    const gridGroup = g.append('g').attr('class', 'grid');
    
    // Draw horizontal grid lines
    for (let y = 0; y < dimensions.height; y += gridSize) {
      gridGroup.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', dimensions.width)
        .attr('y2', y)
        .attr('stroke', '#f0f0f0')
        .attr('stroke-width', 1);
    }
    
    // Draw vertical grid lines
    for (let x = 0; x < dimensions.width; x += gridSize) {
      gridGroup.append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', dimensions.height)
        .attr('stroke', '#f0f0f0')
        .attr('stroke-width', 1);
    }

    // Create a container for links
    const linkGroup = g.append('g').attr('class', 'links');
    
    // Draw links (edges) with improved aesthetics
    const link = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', d => {
        const edge = edges.find(e => e.source === (typeof d.source === 'string' ? d.source : d.source.id) && 
                                    e.target === (typeof d.target === 'string' ? d.target : d.target.id));
        return edge && weighted ? edgeWidthScale(edge.weight || 1) : 1;
      })
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-linecap', 'round');
    
    if (directed) {
      link.attr('marker-end', 'url(#arrowhead)');
    }

    // Create a container for nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    
    // Draw nodes with improved appearance
    const node = nodeGroup.selectAll('.node')
      .data(Array.from(nodeMap.values()))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', d => d.id);

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

    // Add node circles with better styling
    node.append('circle')
      .attr('r', d => d.radius || 5)
      .attr('fill', d => d.color || '#666')
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
          .attr('r', (d.radius || 5) * 1.2);
        
        // Also highlight connected links and nodes
        const nodeId = d.id;
        link.style('stroke', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return (sourceId === nodeId || targetId === nodeId) ? '#666' : '#ddd';
        })
        .style('stroke-opacity', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return (sourceId === nodeId || targetId === nodeId) ? 1 : 0.3;
        })
        .style('stroke-width', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          const edge = edges.find(e => e.source === sourceId && e.target === targetId);
          const width = edge && weighted ? edgeWidthScale(edge.weight || 1) : 1;
          return (sourceId === nodeId || targetId === nodeId) ? width * 1.5 : width;
        });
        
        // Highlight connected nodes
        node.select('circle').style('opacity', n => {
          const connected = links.some(l => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            return (sourceId === nodeId && targetId === n.id) || 
                  (targetId === nodeId && sourceId === n.id) ||
                  n.id === nodeId;
          });
          return connected ? 1 : 0.4;
        });
        
        setHoveredNode(d);
        if (onNodeHover) onNodeHover(d);
      })
      .on('mouseout', (event) => {
        // Reset styles on mouseout
        d3.select(event.currentTarget)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .transition()
          .duration(200)
          .attr('r', d => d.radius || 5);
        
        // Reset link styles
        link.style('stroke', '#999')
          .style('stroke-opacity', 0.6)
          .style('stroke-width', d => {
            const edge = edges.find(e => {
              const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
              const targetId = typeof d.target === 'string' ? d.target : d.target.id;
              return e.source === sourceId && e.target === targetId;
            });
            return edge && weighted ? edgeWidthScale(edge.weight || 1) : 1;
          });
        
        // Reset node opacities
        node.select('circle').style('opacity', 1);
        
        setHoveredNode(null);
        if (onNodeHover) onNodeHover(null);
      })
      .on('click', (event, d) => {
        // Handle node selection with visual feedback
        const isSelected = selectedNode?.id === d.id;
        
        if (isSelected) {
          // Deselect if already selected
          setSelectedNode(null);
          d3.select(event.currentTarget)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
        } else {
          // Select new node
          setSelectedNode(d);
          
          // Reset all nodes first
          node.select('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
            
          // Style the selected node
          d3.select(event.currentTarget)
            .attr('stroke', '#000')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '0');
        }
        
        if (onNodeClick) onNodeClick(d);
      })
      .call(d3.drag<SVGCircleElement, SimulationNode>()
        .on('start', function(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', function(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', function(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          if (!visualizationOptions.layout.type === 'circular' && 
              !visualizationOptions.layout.type === 'hierarchical') {
            d.fx = null;
            d.fy = null;
          }
        }) as any);

    // Add labels if enabled, with improved visibility and positioning
    if (visualizationOptions.show_labels) {
      // Add a text background for better readability
      node.append('rect')
        .attr('class', 'label-background')
        .attr('x', d => (d.radius || 5) + 4)
        .attr('y', -10)
        .attr('width', 0) // Will be set after text is measured
        .attr('height', 20)
        .attr('fill', 'white')
        .attr('fill-opacity', 0.7)
        .attr('rx', 3)
        .attr('ry', 3)
        .style('display', 'none'); // Hide initially
      
      // Add the text labels
      const labels = node.append('text')
        .attr('class', 'node-label')
        .attr('dx', d => (d.radius || 5) + 8)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('pointer-events', 'none')
        .text(d => {
          const labelProperty = visualizationOptions.label_property || 'label';
          return labelProperty === 'id' ? d.id : d.label;
        })
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
      
      // Show label backgrounds on hover
      node.on('mouseover.label', function() {
        d3.select(this).select('.label-background').style('display', 'block');
      })
      .on('mouseout.label', function() {
        d3.select(this).select('.label-background').style('display', 'none');
      });
    }

    // Update positions on simulation tick with improved boundary handling
    simulation.on('tick', () => {
      // Keep nodes within bounds
      nodeMap.forEach(node => {
        node.x = Math.max((node.radius || 5), Math.min(dimensions.width - (node.radius || 5), node.x || 0));
        node.y = Math.max((node.radius || 5), Math.min(dimensions.height - (node.radius || 5), node.y || 0));
      });
      
      link
        .attr('x1', d => (typeof d.source === 'object' ? d.source.x || 0 : 0))
        .attr('y1', d => (typeof d.source === 'object' ? d.source.y || 0 : 0))
        .attr('x2', d => (typeof d.target === 'object' ? d.target.x || 0 : 0))
        .attr('y2', d => (typeof d.target === 'object' ? d.target.y || 0 : 0));

      node
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Add enhanced tooltip with more information and better styling
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

    // Update tooltip on hover with richer information
    node.on('mouseover.tooltip', function(event, d) {
      tooltip.style('display', null);
      
      const metrics = [];
      if (d.attributes.degree) metrics.push(`Degree: ${d.attributes.degree}`);
      if (d.attributes.betweenness) metrics.push(`Betweenness: ${d.attributes.betweenness.toFixed(3)}`);
      if (d.attributes.closeness) metrics.push(`Closeness: ${d.attributes.closeness.toFixed(3)}`);
      
      const textContent = [
        `${d.label || d.id}`,
        `Department: ${d.attributes.department || 'N/A'}`,
        `Role: ${d.attributes.role || 'N/A'}`,
        ...(metrics.length > 0 ? metrics : [])
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
      
      // Position tooltip to avoid edge clipping
      const tooltipWidth = 170;
      const tooltipHeight = textContent.length * 16 + 10;
      let tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left + 10;
      let tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top - tooltipHeight - 10;
      
      // Ensure tooltip stays within SVG bounds
      if (tooltipX + tooltipWidth > dimensions.width) {
        tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left - tooltipWidth - 10;
      }
      
      if (tooltipY < 0) {
        tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top + 20;
      }
      
      tooltip.attr('transform', `translate(${tooltipX},${tooltipY})`);
    });
    
    node.on('mouseout.tooltip', function() {
      tooltip.style('display', 'none');
    });
    
    node.on('mousemove.tooltip', function(event) {
      // Dynamic positioning to follow mouse
      const tooltipWidth = parseInt(tooltip.select('rect').attr('width'));
      const tooltipHeight = parseInt(tooltip.select('rect').attr('height'));
      let tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left + 10;
      let tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top - tooltipHeight - 10;
      
      // Ensure tooltip stays within SVG bounds
      if (tooltipX + tooltipWidth > dimensions.width) {
        tooltipX = event.pageX - svg.node()?.getBoundingClientRect().left - tooltipWidth - 10;
      }
      
      if (tooltipY < 0) {
        tooltipY = event.pageY - svg.node()?.getBoundingClientRect().top + 20;
      }
      
      tooltip.attr('transform', `translate(${tooltipX},${tooltipY})`);
    });

    // Add a legend for node sizing
    if (visualizationOptions.node_size.by !== 'uniform') {
      const legend = svg.append('g')
        .attr('class', 'size-legend')
        .attr('transform', `translate(20, ${dimensions.height - 80})`);
      
      legend.append('rect')
        .attr('x', -10)
        .attr('y', -20)
        .attr('width', 170)
        .attr('height', 80)
        .attr('fill', 'white')
        .attr('fill-opacity', 0.7)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1);
      
      legend.append('text')
        .attr('x', 0)
        .attr('y', -5)
        .text(`Node Size: ${visualizationOptions.node_size.by}`)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold');
      
      // Add size legend circles
      const sizeLegendValues = [
        { label: 'Small', value: d3.min(nodes, d => nodeSizeScale(1)) || 5 },
        { label: 'Medium', value: (d3.min(nodes, d => nodeSizeScale(1)) || 5 + d3.max(nodes, d => nodeSizeScale(100)) || 20) / 2 },
        { label: 'Large', value: d3.max(nodes, d => nodeSizeScale(100)) || 20 }
      ];
      
      sizeLegendValues.forEach((item, i) => {
        legend.append('circle')
          .attr('cx', 15)
          .attr('cy', i * 20 + 15)
          .attr('r', item.value)
          .attr('fill', '#999');
          
        legend.append('text')
          .attr('x', 35)
          .attr('y', i * 20 + 20)
          .text(item.label)
          .attr('font-size', '10px')
          .attr('fill', '#333');
      });
    }

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [nodes, edges, directed, weighted, dimensions, visualizationOptions, onNodeClick, onNodeHover, currentTransform]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Component render
  return (
    <div ref={containerRef} className="network-graph-container" style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height}>
        {/* D3 will append elements here */}
      </svg>
    </div>
  );
};

export default NetworkGraph;