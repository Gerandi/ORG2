import React, { useState, useRef, useEffect } from 'react';
import { ABMModel, Simulation } from '../../../types/abm';
import Card from '../../atoms/Card';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Upload, 
  FileText, 
  TrendingUp, 
  ClipboardCheck,
  BarChart,
  LineChart,
  Download
} from 'lucide-react';
import * as d3 from 'd3';

interface ModelValidationPanelProps {
  model: ABMModel | null;
  simulations: Simulation[];
  onRunSimulation: (id: number, steps?: number) => Promise<void>;
  onSelectSimulation: (id: number) => void;
}

const ModelValidationPanel: React.FC<ModelValidationPanelProps> = ({
  model,
  simulations,
  onRunSimulation,
  onSelectSimulation
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeValidation, setActiveValidation] = useState<string | null>(null);
  
  // Refs for visualization containers
  const empiricalChartRef = useRef<HTMLDivElement>(null);
  const sensitivityChartRef = useRef<HTMLDivElement>(null);
  const extremeConditionsChartRef = useRef<HTMLDivElement>(null);
  const crossValidationChartRef = useRef<HTMLDivElement>(null);
  const patternMatchingChartRef = useRef<HTMLDivElement>(null);
  
  // Sample validation test results with visualization data
  const validationTests = [
    {
      id: 'empirical',
      name: 'Empirical Validation',
      status: 'passed',
      description: 'Compare model outputs with empirical data from organization',
      metrics: {
        adoption_curve_r2: 0.87,
        final_adoption_error: 0.05,
        knowledge_distribution_kl: 0.18,
        correlation_p_value: 0.003
      },
      details: 'The model accurately reproduces the empirical adoption curve (R² = 0.87) observed in the organization\'s past innovation initiative. Final adoption rates match within 5% of historical data. The knowledge distribution closely resembles observed patterns (KL divergence = 0.18).',
      visualizationData: {
        // S-curve adoption data points (time steps vs. adoption percentage)
        empirical: [
          { step: 0, adoption: 0.02 }, { step: 5, adoption: 0.05 }, { step: 10, adoption: 0.12 },
          { step: 15, adoption: 0.25 }, { step: 20, adoption: 0.48 }, { step: 25, adoption: 0.65 },
          { step: 30, adoption: 0.75 }, { step: 35, adoption: 0.82 }, { step: 40, adoption: 0.85 }
        ],
        model: [
          { step: 0, adoption: 0.02 }, { step: 5, adoption: 0.06 }, { step: 10, adoption: 0.15 },
          { step: 15, adoption: 0.3 }, { step: 20, adoption: 0.52 }, { step: 25, adoption: 0.7 },
          { step: 30, adoption: 0.78 }, { step: 35, adoption: 0.82 }, { step: 40, adoption: 0.88 }
        ]
      }
    },
    {
      id: 'sensitivity',
      name: 'Sensitivity Analysis',
      status: 'warning',
      description: 'Test model robustness to parameter variations',
      metrics: {
        adoption_threshold_sensitivity: 'high',
        communication_rate_sensitivity: 'medium',
        network_structure_sensitivity: 'high',
        initial_conditions_sensitivity: 'low'
      },
      details: 'The model shows high sensitivity to adoption threshold parameters and network structure. Small variations in these parameters lead to significant changes in outcomes. The model is less sensitive to communication rate variations and robust to changes in initial conditions. Recommend caution when interpreting results related to adoption thresholds.',
      visualizationData: {
        // Parameter sensitivity effect sizes
        parameterSensitivity: [
          { parameter: 'Adoption Threshold', sensitivity: 0.85 },
          { parameter: 'Network Structure', sensitivity: 0.78 },
          { parameter: 'Communication Rate', sensitivity: 0.45 },
          { parameter: 'Initial Conditions', sensitivity: 0.23 }
        ],
        // Run results with different adoption thresholds
        thresholdResults: [
          { threshold: 0.1, finalAdoption: 0.92 },
          { threshold: 0.2, finalAdoption: 0.85 },
          { threshold: 0.3, finalAdoption: 0.72 },
          { threshold: 0.4, finalAdoption: 0.56 },
          { threshold: 0.5, finalAdoption: 0.34 },
          { threshold: 0.6, finalAdoption: 0.21 }
        ]
      }
    },
    {
      id: 'extreme',
      name: 'Extreme Conditions Test',
      status: 'passed',
      description: 'Test model behavior under extreme parameter values',
      metrics: {
        zero_communication: 'no diffusion',
        full_connectivity: 'rapid diffusion',
        no_initial_adopters: 'no diffusion',
        all_initial_adopters: 'maintained adoption'
      },
      details: 'The model behaves as expected under extreme conditions. With zero communication rate, no diffusion occurs. With full network connectivity, diffusion is rapid as expected. When starting with no adopters, no diffusion occurs, and when all agents start as adopters, adoption is maintained. These results align with theoretical expectations.',
      visualizationData: {
        // Extreme condition test results
        conditions: [
          { 
            name: 'No Communication', 
            steps: [0, 10, 20, 30, 40], 
            values: [0.02, 0.02, 0.02, 0.02, 0.02] 
          },
          { 
            name: 'Full Connectivity', 
            steps: [0, 10, 20, 30, 40], 
            values: [0.02, 0.45, 0.85, 0.95, 0.98] 
          },
          { 
            name: 'No Initial Adopters', 
            steps: [0, 10, 20, 30, 40], 
            values: [0, 0, 0, 0, 0] 
          },
          { 
            name: 'All Initial Adopters', 
            steps: [0, 10, 20, 30, 40], 
            values: [1, 1, 0.98, 0.95, 0.95] 
          }
        ]
      }
    },
    {
      id: 'cross',
      name: 'Cross-Validation',
      status: 'failed',
      description: 'Validate model across different organizational datasets',
      metrics: {
        dataset_1_accuracy: 0.85,
        dataset_2_accuracy: 0.82,
        dataset_3_accuracy: 0.51
      },
      details: 'The model performs well on datasets 1 and 2 but fails to accurately predict patterns in dataset 3 (accuracy = 51%). This suggests that the model may not generalize well to all organizational contexts. Dataset 3 represents a significantly different organizational structure (more hierarchical, less cross-departmental communication) which may explain the poor fit.',
      visualizationData: {
        // Cross-validation performance across datasets
        datasets: [
          {
            name: 'Dataset 1 (Tech Company)',
            metrics: [
              { metric: 'Adoption Curve', accuracy: 0.85 },
              { metric: 'Final Adoption', accuracy: 0.92 },
              { metric: 'Adoption Speed', accuracy: 0.88 },
              { metric: 'Network Effects', accuracy: 0.79 }
            ]
          },
          {
            name: 'Dataset 2 (Manufacturing)',
            metrics: [
              { metric: 'Adoption Curve', accuracy: 0.82 },
              { metric: 'Final Adoption', accuracy: 0.87 },
              { metric: 'Adoption Speed', accuracy: 0.85 },
              { metric: 'Network Effects', accuracy: 0.76 }
            ]
          },
          {
            name: 'Dataset 3 (Hierarchical Org)',
            metrics: [
              { metric: 'Adoption Curve', accuracy: 0.51 },
              { metric: 'Final Adoption', accuracy: 0.62 },
              { metric: 'Adoption Speed', accuracy: 0.45 },
              { metric: 'Network Effects', accuracy: 0.48 }
            ]
          }
        ]
      }
    },
    {
      id: 'pattern',
      name: 'Pattern Matching',
      status: 'passed',
      description: 'Compare model-generated patterns with expected patterns',
      metrics: {
        s_curve_pattern: 'present',
        centrality_correlation: 0.72,
        clustering_impact: 'confirmed',
        knowledge_diffusion_pattern: 'matches'
      },
      details: 'The model successfully reproduces key patterns expected from diffusion theory: S-curve adoption pattern is clearly present, correlation between centrality and early adoption is strong (r = 0.72), impact of network clustering on diffusion speed is confirmed, and knowledge diffusion patterns match theoretical expectations.',
      visualizationData: {
        // Centrality vs adoption timing correlation
        centrality: [
          { centrality: 0.1, adoptionTime: 38 },
          { centrality: 0.15, adoptionTime: 36 },
          { centrality: 0.22, adoptionTime: 33 },
          { centrality: 0.28, adoptionTime: 31 },
          { centrality: 0.31, adoptionTime: 28 },
          { centrality: 0.36, adoptionTime: 24 },
          { centrality: 0.45, adoptionTime: 19 },
          { centrality: 0.52, adoptionTime: 15 },
          { centrality: 0.61, adoptionTime: 12 },
          { centrality: 0.72, adoptionTime: 8 },
          { centrality: 0.85, adoptionTime: 4 }
        ],
        // Knowledge diffusion patterns
        clusteringImpact: [
          { clustering: 'Low', diffusionSpeed: 0.8 },
          { clustering: 'Medium', diffusionSpeed: 0.5 },
          { clustering: 'High', diffusionSpeed: 0.3 }
        ]
      }
    }
  ];
  
  // Mock recommendations
  const recommendations = [
    "Model is suitable for forecasting innovation diffusion patterns within the organization",
    "Use caution when adjusting adoption threshold parameters due to high sensitivity",
    "Consider refining the model before applying to highly hierarchical organizational structures",
    "The model performs well for innovation diffusion but may need refinement for other organizational processes",
    "Include confidence intervals in predictions to account for model sensitivities"
  ];
  
  // Empirical validation visualization
  useEffect(() => {
    if (activeValidation === 'empirical' && empiricalChartRef.current) {
      // Clear any existing visualization
      d3.select(empiricalChartRef.current).selectAll('*').remove();
      
      const test = validationTests.find(t => t.id === 'empirical');
      if (!test || !test.visualizationData) return;
      
      const { empirical, model } = test.visualizationData;
      
      const margin = { top: 20, right: 30, bottom: 40, left: 40 };
      const width = empiricalChartRef.current.clientWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(empiricalChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const x = d3.scaleLinear()
        .domain([0, d3.max([...empirical, ...model], d => d.step) || 0])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);
      
      // Add axes
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));
      
      svg.append('g')
        .call(d3.axisLeft(y).tickFormat(d3.format('.0%')));
      
      // Add axis labels
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Time Steps');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -30)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Adoption Rate');
      
      // Create line generators
      const empiricalLine = d3.line<any>()
        .x(d => x(d.step))
        .y(d => y(d.adoption))
        .curve(d3.curveMonotoneX);
      
      const modelLine = d3.line<any>()
        .x(d => x(d.step))
        .y(d => y(d.adoption))
        .curve(d3.curveMonotoneX);
      
      // Add the lines
      svg.append('path')
        .datum(empirical)
        .attr('fill', 'none')
        .attr('stroke', '#4A5568')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('d', empiricalLine);
      
      svg.append('path')
        .datum(model)
        .attr('fill', 'none')
        .attr('stroke', '#3182CE')
        .attr('stroke-width', 2)
        .attr('d', modelLine);
      
      // Add legend
      const legend = svg.append('g')
        .attr('font-size', '10px')
        .attr('transform', `translate(${width - 150}, 10)`);
      
      legend.append('rect')
        .attr('x', -5)
        .attr('y', -5)
        .attr('width', 140)
        .attr('height', 50)
        .attr('fill', 'white')
        .attr('stroke', '#E2E8F0');
      
      // Empirical data legend item
      legend.append('line')
        .attr('x1', 0)
        .attr('y1', 10)
        .attr('x2', 20)
        .attr('y2', 10)
        .attr('stroke', '#4A5568')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
      
      legend.append('text')
        .attr('x', 25)
        .attr('y', 13)
        .text('Empirical Data');
      
      // Model data legend item
      legend.append('line')
        .attr('x1', 0)
        .attr('y1', 30)
        .attr('x2', 20)
        .attr('y2', 30)
        .attr('stroke', '#3182CE')
        .attr('stroke-width', 2);
      
      legend.append('text')
        .attr('x', 25)
        .attr('y', 33)
        .text('Model Prediction');
      
      // Add R² annotation
      svg.append('text')
        .attr('x', width - 100)
        .attr('y', height - 20)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`R² = ${test.metrics.adoption_curve_r2}`);
    }
  }, [activeValidation, empiricalChartRef]);
  
  // Sensitivity analysis visualization
  useEffect(() => {
    if (activeValidation === 'sensitivity' && sensitivityChartRef.current) {
      // Clear any existing visualization
      d3.select(sensitivityChartRef.current).selectAll('*').remove();
      
      const test = validationTests.find(t => t.id === 'sensitivity');
      if (!test || !test.visualizationData) return;
      
      const { parameterSensitivity, thresholdResults } = test.visualizationData;
      
      const margin = { top: 20, right: 20, bottom: 50, left: 80 };
      const width = sensitivityChartRef.current.clientWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(sensitivityChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Set up scales for parameter sensitivity bars
      const y = d3.scaleBand()
        .domain(parameterSensitivity.map(d => d.parameter))
        .range([0, height])
        .padding(0.1);
      
      const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);
      
      // Add axes
      svg.append('g')
        .call(d3.axisLeft(y));
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('.0%')));
      
      // Add sensitivity threshold indicators
      svg.append('line')
        .attr('x1', x(0.3))
        .attr('x2', x(0.3))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#A0AEC0')
        .attr('stroke-dasharray', '3,3');
      
      svg.append('text')
        .attr('x', x(0.3))
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text('Low');
      
      svg.append('line')
        .attr('x1', x(0.6))
        .attr('x2', x(0.6))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#A0AEC0')
        .attr('stroke-dasharray', '3,3');
      
      svg.append('text')
        .attr('x', x(0.6))
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text('High');
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Parameter Sensitivity');
      
      // Add x-axis label
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Sensitivity Index (0-1)');
      
      // Add bars
      svg.selectAll('.bar')
        .data(parameterSensitivity)
        .enter()
        .append('rect')
        .attr('y', d => y(d.parameter) || 0)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(d.sensitivity))
        .attr('fill', d => d.sensitivity > 0.6 ? '#FC8181' : d.sensitivity > 0.3 ? '#F6AD55' : '#68D391');
      
      // Add value labels
      svg.selectAll('.value-label')
        .data(parameterSensitivity)
        .enter()
        .append('text')
        .attr('x', d => x(d.sensitivity) + 5)
        .attr('y', d => (y(d.parameter) || 0) + y.bandwidth() / 2 + 4)
        .attr('font-size', '10px')
        .text(d => d3.format('.0%')(d.sensitivity));
    }
  }, [activeValidation, sensitivityChartRef]);
  
  // Cross-validation visualization
  useEffect(() => {
    if (activeValidation === 'cross' && crossValidationChartRef.current) {
      // Clear any existing visualization
      d3.select(crossValidationChartRef.current).selectAll('*').remove();
      
      const test = validationTests.find(t => t.id === 'cross');
      if (!test || !test.visualizationData) return;
      
      const { datasets } = test.visualizationData;
      
      const margin = { top: 30, right: 50, bottom: 50, left: 110 };
      const width = crossValidationChartRef.current.clientWidth - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(crossValidationChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Combine metrics from all datasets
      const allMetrics = datasets.flatMap(dataset => {
        return dataset.metrics.map(m => ({
          dataset: dataset.name,
          metric: m.metric,
          accuracy: m.accuracy
        }));
      });
      
      // Set up scales
      const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);
      
      const y = d3.scaleBand()
        .domain(allMetrics.map(d => `${d.dataset} - ${d.metric}`))
        .range([0, height])
        .padding(0.2);
      
      // Add axes
      svg.append('g')
        .call(d3.axisLeft(y).tickSize(0));
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('.0%')));
      
      // Add threshold line
      svg.append('line')
        .attr('x1', x(0.7))
        .attr('x2', x(0.7))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#A0AEC0')
        .attr('stroke-dasharray', '3,3');
      
      svg.append('text')
        .attr('x', x(0.7) + 5)
        .attr('y', 10)
        .attr('font-size', '10px')
        .text('Acceptance Threshold');
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Cross-Validation Performance');
      
      // Add x-axis label
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Accuracy');
      
      // Add bars
      svg.selectAll('.bar')
        .data(allMetrics)
        .enter()
        .append('rect')
        .attr('y', d => y(`${d.dataset} - ${d.metric}`) || 0)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(d.accuracy))
        .attr('fill', d => {
          if (d.dataset.includes('Hierarchical')) {
            return d.accuracy >= 0.7 ? '#68D391' : '#FC8181';
          }
          return d.accuracy >= 0.7 ? '#68D391' : '#FC8181';
        });
      
      // Add value labels
      svg.selectAll('.value-label')
        .data(allMetrics)
        .enter()
        .append('text')
        .attr('x', d => x(d.accuracy) + 5)
        .attr('y', d => (y(`${d.dataset} - ${d.metric}`) || 0) + y.bandwidth() / 2 + 4)
        .attr('font-size', '10px')
        .text(d => d3.format('.0%')(d.accuracy));
      
      // Add dataset grouping backgrounds
      const datasets = Array.from(new Set(allMetrics.map(d => d.dataset)));
      const metricsPerDataset = allMetrics.filter(d => d.dataset === datasets[0]).length;
      
      datasets.forEach((dataset, i) => {
        const startY = y(`${dataset} - ${allMetrics.find(d => d.dataset === dataset)?.metric}`) || 0;
        const height = y.bandwidth() * metricsPerDataset + (y.step() - y.bandwidth()) * (metricsPerDataset - 1);
        
        svg.insert('rect', ':first-child')
          .attr('x', -10)
          .attr('y', startY - 5)
          .attr('width', width + 20)
          .attr('height', height + 10)
          .attr('fill', i % 2 === 0 ? '#F7FAFC' : '#EDF2F7')
          .attr('rx', 5);
      });
    }
  }, [activeValidation, crossValidationChartRef]);
  
  // Pattern matching visualization
  useEffect(() => {
    if (activeValidation === 'pattern' && patternMatchingChartRef.current) {
      // Clear any existing visualization
      d3.select(patternMatchingChartRef.current).selectAll('*').remove();
      
      const test = validationTests.find(t => t.id === 'pattern');
      if (!test || !test.visualizationData) return;
      
      const { centrality } = test.visualizationData;
      
      const margin = { top: 20, right: 20, bottom: 50, left: 50 };
      const width = patternMatchingChartRef.current.clientWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(patternMatchingChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const x = d3.scaleLinear()
        .domain([0, d3.max(centrality, d => d.centrality) || 0])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(centrality, d => d.adoptionTime) || 0])
        .range([height, 0]);
      
      // Add axes
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('.1f')));
      
      svg.append('g')
        .call(d3.axisLeft(y));
      
      // Add axis labels
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Node Centrality');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -35)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Adoption Time (steps)');
      
      // Add scatter points
      svg.selectAll('.dot')
        .data(centrality)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.centrality))
        .attr('cy', d => y(d.adoptionTime))
        .attr('r', 4)
        .attr('fill', '#4299E1')
        .attr('fill-opacity', 0.7)
        .attr('stroke', '#2B6CB0');
      
      // Add regression line
      // Calculate slope and intercept for a simple linear regression
      const xValues = centrality.map(d => d.centrality);
      const yValues = centrality.map(d => d.adoptionTime);
      
      const xMean = d3.mean(xValues) || 0;
      const yMean = d3.mean(yValues) || 0;
      
      // Calculate slope (m) and intercept (b)
      const slope = d3.sum(xValues.map((x, i) => (x - xMean) * (yValues[i] - yMean))) /
                    d3.sum(xValues.map(x => Math.pow(x - xMean, 2)));
      const intercept = yMean - slope * xMean;
      
      // Draw the regression line
      svg.append('line')
        .attr('x1', x(d3.min(xValues) || 0))
        .attr('y1', y(slope * (d3.min(xValues) || 0) + intercept))
        .attr('x2', x(d3.max(xValues) || 1))
        .attr('y2', y(slope * (d3.max(xValues) || 1) + intercept))
        .attr('stroke', '#E53E3E')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
      
      // Add correlation annotation
      svg.append('text')
        .attr('x', width - 120)
        .attr('y', 20)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`Correlation: r = ${test.metrics.centrality_correlation}`);
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Centrality vs. Adoption Timing');
    }
  }, [activeValidation, patternMatchingChartRef]);
  
  // Extreme conditions visualization
  useEffect(() => {
    if (activeValidation === 'extreme' && extremeConditionsChartRef.current) {
      // Clear any existing visualization
      d3.select(extremeConditionsChartRef.current).selectAll('*').remove();
      
      const test = validationTests.find(t => t.id === 'extreme');
      if (!test || !test.visualizationData) return;
      
      const { conditions } = test.visualizationData;
      
      const margin = { top: 20, right: 100, bottom: 50, left: 50 };
      const width = extremeConditionsChartRef.current.clientWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(extremeConditionsChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const x = d3.scaleLinear()
        .domain([0, d3.max(conditions.flatMap(c => c.steps)) || 0])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);
      
      const color = d3.scaleOrdinal()
        .domain(conditions.map(c => c.name))
        .range(d3.schemeCategory10);
      
      // Add axes
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));
      
      svg.append('g')
        .call(d3.axisLeft(y).tickFormat(d3.format('.0%')));
      
      // Add axis labels
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Time Steps');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -35)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text('Adoption Rate');
      
      // Create line generator
      const line = d3.line<any>()
        .x((d, i) => x(conditions[0].steps[i]))
        .y(d => y(d))
        .curve(d3.curveMonotoneX);
      
      // Add lines
      conditions.forEach(condition => {
        svg.append('path')
          .datum(condition.values)
          .attr('fill', 'none')
          .attr('stroke', color(condition.name))
          .attr('stroke-width', 2)
          .attr('d', line);
        
        // Add the final point label
        svg.append('text')
          .attr('x', x(condition.steps[condition.steps.length - 1]) + 5)
          .attr('y', y(condition.values[condition.values.length - 1]))
          .attr('font-size', '10px')
          .attr('alignment-baseline', 'middle')
          .text(`${(condition.values[condition.values.length - 1] * 100).toFixed(0)}%`);
      });
      
      // Add legend
      const legend = svg.append('g')
        .attr('font-size', '10px')
        .attr('transform', `translate(${width + 10}, 0)`);
      
      conditions.forEach((condition, i) => {
        legend.append('rect')
          .attr('x', 0)
          .attr('y', i * 20)
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', color(condition.name));
        
        legend.append('text')
          .attr('x', 15)
          .attr('y', i * 20 + 9)
          .text(condition.name);
      });
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Extreme Conditions Test Results');
    }
  }, [activeValidation, extremeConditionsChartRef]);
  
  const handleRunValidation = () => {
    // In a real implementation, this would trigger validation tests
    setIsLoading(true);
    
    // Simulate test runs
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };
  
  if (!model) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="h-12 w-12 text-gray-300 mb-4" />
          <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
          <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
            Please select a model to view or run validation tests.
          </Text>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Heading level={3}>Model Validation: {model.name}</Heading>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => {}}
          >
            <Upload size={16} className="mr-1" />
            Import Data
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={handleRunValidation}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Run Validation
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {validationTests.map(test => (
          <Card 
            key={test.id} 
            className={`p-4 cursor-pointer ${activeValidation === test.id ? 'ring-2 ring-primary-300' : ''}`}
            onClick={() => setActiveValidation(test.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <Text variant="caption" className="text-gray-500">{test.name}</Text>
              {test.status === 'passed' ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : test.status === 'failed' ? (
                <XCircle size={18} className="text-red-500" />
              ) : (
                <AlertTriangle size={18} className="text-yellow-500" />
              )}
            </div>
            <div className={`px-2 py-0.5 text-xs rounded-full inline-block ${
              test.status === 'passed' ? 'bg-green-100 text-green-800' :
              test.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </div>
          </Card>
        ))}
      </div>
      
      {activeValidation && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Heading level={4}>
                {validationTests.find(t => t.id === activeValidation)?.name}
              </Heading>
              <div className={`ml-3 px-2 py-0.5 text-xs rounded-full inline-block ${
                validationTests.find(t => t.id === activeValidation)?.status === 'passed' ? 'bg-green-100 text-green-800' :
                validationTests.find(t => t.id === activeValidation)?.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {validationTests.find(t => t.id === activeValidation)?.status.charAt(0).toUpperCase() + 
                 validationTests.find(t => t.id === activeValidation)?.status.slice(1)}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="flex items-center text-xs"
              onClick={() => {}}
            >
              <Download size={14} className="mr-1" />
              Export Results
            </Button>
          </div>
          
          <Text variant="p" className="mb-4">
            {validationTests.find(t => t.id === activeValidation)?.description}
          </Text>
          
          {/* Visualization Section */}
          <div className="mb-6 border border-gray-200 rounded-md p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <Text variant="p" className="font-medium">Visualization</Text>
              <div className="flex items-center space-x-2">
                {activeValidation === 'sensitivity' && (
                  <Select
                    value="sensitivity"
                    onChange={() => {}}
                    className="text-sm p-1 border-gray-200"
                  >
                    <option value="sensitivity">Parameter Sensitivity</option>
                    <option value="threshold">Threshold Analysis</option>
                  </Select>
                )}
                
                {activeValidation === 'cross' && (
                  <Select
                    value="datasets"
                    onChange={() => {}}
                    className="text-sm p-1 border-gray-200"
                  >
                    <option value="datasets">All Datasets</option>
                    <option value="metrics">By Metric Type</option>
                  </Select>
                )}
                
                {activeValidation === 'pattern' && (
                  <Select
                    value="centrality"
                    onChange={() => {}}
                    className="text-sm p-1 border-gray-200"
                  >
                    <option value="centrality">Centrality Correlation</option>
                    <option value="clustering">Clustering Impact</option>
                  </Select>
                )}
              </div>
            </div>
            
            {/* Visualization Container */}
            <div className="h-64 w-full">
              {activeValidation === 'empirical' && <div ref={empiricalChartRef} className="h-full w-full"></div>}
              {activeValidation === 'sensitivity' && <div ref={sensitivityChartRef} className="h-full w-full"></div>}
              {activeValidation === 'extreme' && <div ref={extremeConditionsChartRef} className="h-full w-full"></div>}
              {activeValidation === 'cross' && <div ref={crossValidationChartRef} className="h-full w-full"></div>}
              {activeValidation === 'pattern' && <div ref={patternMatchingChartRef} className="h-full w-full"></div>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <Heading level={5} className="mb-3">Test Metrics</Heading>
              <div className="space-y-3">
                {Object.entries(validationTests.find(t => t.id === activeValidation)?.metrics || {}).map(([key, value], i) => (
                  <div key={i} className="flex justify-between items-center p-2 border-b border-gray-100">
                    <span className="text-sm text-gray-700">
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                    </span>
                    <span className={`font-medium ${
                      typeof value === 'number' && value > 0.8 ? 'text-green-600' :
                      typeof value === 'number' && value < 0.6 ? 'text-red-600' :
                      value === 'high' ? 'text-yellow-600' :
                      ''
                    }`}>
                      {value.toString()}
                    </span>
                  </div>
                ))}
              </div>
              
              {activeValidation === 'empirical' && (
                <div className="mt-4 flex items-center">
                  <BarChart size={16} className="text-blue-600 mr-2" />
                  <Text variant="caption" className="text-blue-700">
                    R² of 0.87 indicates strong fit to empirical data
                  </Text>
                </div>
              )}
              
              {activeValidation === 'sensitivity' && (
                <div className="mt-4 flex items-center">
                  <AlertTriangle size={16} className="text-yellow-600 mr-2" />
                  <Text variant="caption" className="text-yellow-700">
                    High sensitivity to threshold parameters requires caution
                  </Text>
                </div>
              )}
            </div>
            
            <div>
              <Heading level={5} className="mb-3">Detailed Results</Heading>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                <p>{validationTests.find(t => t.id === activeValidation)?.details}</p>
              </div>
            </div>
          </div>
          
          {activeValidation === 'empirical' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md flex">
              <TrendingUp size={20} className="text-blue-600 mr-3 shrink-0" />
              <div>
                <Text variant="p" className="font-medium text-blue-800">Empirical Validation Methodology</Text>
                <Text variant="p" className="text-sm text-blue-700 mt-1">
                  This validation compares the simulation results against real-world data collected from a previous innovation adoption initiative within the organization. 
                  We used statistical measures (R², error rates, KL divergence) to quantify the similarity between model outputs and empirical observations. The high R² value (0.87) and 
                  low error rates indicate that the model is well-calibrated to reproduce actual organizational behavior.
                </Text>
              </div>
            </div>
          )}
          
          {activeValidation === 'cross' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-md flex">
              <AlertTriangle size={20} className="text-red-600 mr-3 shrink-0" />
              <div>
                <Text variant="p" className="font-medium text-red-800">Cross-Validation Failure Analysis</Text>
                <Text variant="p" className="text-sm text-red-700 mt-1">
                  The model fails to generalize to Dataset 3 (hierarchical organization) because it was primarily designed for flatter organizational structures with more cross-departmental communication. 
                  The adoption mechanisms in hierarchical structures appear to follow significantly different patterns, with information flowing primarily top-down rather than through peer networks.
                  Consider developing a separate model variant specifically calibrated for hierarchical organizations.
                </Text>
              </div>
            </div>
          )}
          
          {activeValidation === 'pattern' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-md flex">
              <LineChart size={20} className="text-green-600 mr-3 shrink-0" />
              <div>
                <Text variant="p" className="font-medium text-green-800">Pattern Matching Summary</Text>
                <Text variant="p" className="text-sm text-green-700 mt-1">
                  The strong negative correlation (r = -0.72) between node centrality and adoption time confirms a key theoretical prediction: 
                  central actors in the network tend to adopt innovations earlier. This provides confidence that the model correctly captures 
                  fundamental diffusion dynamics based on social network theory. The S-curve adoption pattern also aligns with diffusion of innovation theory.
                </Text>
              </div>
            </div>
          )}
        </Card>
      )}
      
      <Card>
        <Heading level={4} className="mb-4">Validation Summary & Recommendations</Heading>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <Text variant="p" className="font-medium text-center text-green-800">3 Tests Passed</Text>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
            <Text variant="p" className="font-medium text-center text-yellow-800">1 Test Warning</Text>
          </div>
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <XCircle size={24} className="text-red-600" />
            </div>
            <Text variant="p" className="font-medium text-center text-red-800">1 Test Failed</Text>
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <div className="flex">
            <FileText size={20} className="text-gray-600 mr-3 shrink-0" />
            <div>
              <Text variant="p" className="font-medium mb-2">Overall Assessment & Recommendations</Text>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start">
                    <div className="mt-1 mr-2">•</div>
                    <Text variant="p" className="text-sm text-gray-700">{rec}</Text>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button 
            variant="outline" 
            className="flex items-center"
          >
            <FileText size={16} className="mr-1" />
            Export Validation Report
          </Button>
          
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={() => handleRunValidation()}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Run All Tests
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ModelValidationPanel;