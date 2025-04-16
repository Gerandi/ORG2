export interface Node {
  id: string;
  label: string;
  attributes: Record<string, any>;
}

export interface Edge {
  source: string;
  target: string;
  weight?: number;
  attributes?: Record<string, any>;
}

export interface NetworkData {
  network_id: number;
  name: string;
  nodes: Node[];
  edges: Edge[];
  directed: boolean;
  weighted: boolean;
}

export interface NetworkModel {
  id: number;
  name: string;
  description?: string;
  dataset_id: number;
  created_at: string;
  updated_at: string;
  node_count: number;
  edge_count: number;
  directed: boolean;
  weighted: boolean;
  attributes?: Record<string, any>;
}

export interface NetworkMetrics {
  network_id: number;
  global_metrics: {
    density: number;
    average_path_length: number;
    diameter: number;
    clustering: number;
    modularity?: number;
  };
  node_metrics: Record<string, {
    degree: number;
    betweenness?: number;
    closeness?: number;
    eigenvector?: number;
    clustering?: number;
  }>;
}

export interface Community {
  size: number;
  density: number;
  cohesion: number;
  nodes: string[];
}

export interface Communities {
  network_id: number;
  algorithm: string;
  num_communities: number;
  modularity: number;
  communities: Record<string, Community>;
}

export interface LayoutOptions {
  type: 'force' | 'circular' | 'hierarchical' | 'radial';
  parameters?: {
    [key: string]: any;
  };
}

export interface VisualizationOptions {
  layout: LayoutOptions;
  node_size: {
    by: 'uniform' | 'degree' | 'betweenness' | 'closeness' | 'eigenvector' | 'clustering' | 'attribute';
    attribute?: string;
    scale?: [number, number];
  };
  node_color: {
    by: 'community' | 'department' | 'role' | 'attribute' | 'centrality';
    attribute?: string;
    scale?: string[];
  };
  edge_width: {
    by: 'uniform' | 'weight';
    scale?: [number, number];
  };
  show_labels: boolean;
  label_property?: string;
  filters?: {
    departments?: string[];
    roles?: string[];
    min_tie_strength?: number;
  };
}